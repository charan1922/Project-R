import { dhanMarketFeed, isMarketHours } from '@/lib/dhan/market-feed';
import { hasDhanCredentials } from '@/lib/env';
import { ensureSynced, resolveSymbol } from '@/lib/historify/master-contracts';
import { getSectorMap, type SectorInfo } from './sector-map';

export interface HeatmapStock {
  symbol: string;
  name: string;
  sector: string;
  weight: number;
  lastPrice: number;
  prevClose: number;
  open: number;
  high: number;
  low: number;
  pctChange: number;
}

export interface HeatmapSector {
  id: string;
  name: string;
  color: string;
  stocks: HeatmapStock[];
  avgChange: number;
  gainers: number;
  losers: number;
  unchanged: number;
  totalWeight: number;
}

export interface HeatmapData {
  sectors: HeatmapSector[];
  marketSummary: {
    totalStocks: number;
    totalGainers: number;
    totalLosers: number;
    avgChange: number;
    isMarketOpen: boolean;
    timestamp: string;
  };
}

export async function getHeatmapData(): Promise<HeatmapData> {
  await ensureSynced();

  const sectorMap = getSectorMap();
  const allSymbols = sectorMap.flatMap((s) => s.stocks.map((st) => st.symbol));

  // Resolve all symbols to Dhan security IDs
  const symbolToSecId = new Map<string, number>();
  const secIdToSymbol = new Map<number, string>();

  await Promise.allSettled(
    allSymbols.map(async (symbol) => {
      const entry = await resolveSymbol(symbol, 'NSE');
      if (entry) {
        const numId = parseInt(entry.securityId, 10);
        symbolToSecId.set(symbol, numId);
        secIdToSymbol.set(numId, symbol);
      }
    }),
  );

  const resolvedCount = symbolToSecId.size;
  console.log(`[SectorScope] Resolved ${resolvedCount}/${allSymbols.length} symbols`);

  // Fetch live OHLC from Dhan
  const liveData = new Map<string, { lastPrice: number; prevClose: number; open: number; high: number; low: number }>();

  if (hasDhanCredentials() && symbolToSecId.size > 0) {
    try {
      const data = await dhanMarketFeed('ohlc', {
        NSE_EQ: Array.from(symbolToSecId.values()),
      });
      const segment = data.NSE_EQ;
      if (segment) {
        for (const [secIdStr, quote] of Object.entries(segment)) {
          const sym = secIdToSymbol.get(parseInt(secIdStr, 10));
          if (sym && quote.ohlc) {
            liveData.set(sym, {
              lastPrice: quote.last_price,
              prevClose: quote.ohlc.close,
              open: quote.ohlc.open,
              high: quote.ohlc.high,
              low: quote.ohlc.low,
            });
          }
        }
      }
      console.log(`[SectorScope] Got OHLC for ${liveData.size} stocks`);
    } catch (e) {
      console.error('[SectorScope] Market feed failed:', e);
    }
  }

  // Build sector heatmap data
  const marketOpen = isMarketHours();
  let totalGainers = 0;
  let totalLosers = 0;
  let totalChangeSum = 0;
  let totalStocksWithData = 0;

  const sectors: HeatmapSector[] = sectorMap.map((sector: SectorInfo) => {
    let sectorChangeSum = 0;
    let sectorWeightSum = 0;
    let gainers = 0;
    let losers = 0;
    let unchanged = 0;

    const stocks: HeatmapStock[] = sector.stocks.map((stock) => {
      const live = liveData.get(stock.symbol);
      const lastPrice = live?.lastPrice ?? 0;
      const prevClose = live?.prevClose ?? 0;
      const pctChange = prevClose > 0 ? ((lastPrice - prevClose) / prevClose) * 100 : 0;

      if (live) {
        sectorChangeSum += pctChange * stock.weight;
        sectorWeightSum += stock.weight;
        totalChangeSum += pctChange;
        totalStocksWithData++;
      }

      if (pctChange > 0.01) {
        gainers++;
        totalGainers++;
      } else if (pctChange < -0.01) {
        losers++;
        totalLosers++;
      } else {
        unchanged++;
      }

      return {
        symbol: stock.symbol,
        name: stock.name,
        sector: sector.name,
        weight: stock.weight,
        lastPrice,
        prevClose,
        open: live?.open ?? 0,
        high: live?.high ?? 0,
        low: live?.low ?? 0,
        pctChange,
      };
    });

    stocks.sort((a, b) => b.weight - a.weight);

    return {
      id: sector.id,
      name: sector.name,
      color: sector.color,
      stocks,
      avgChange: sectorWeightSum > 0 ? sectorChangeSum / sectorWeightSum : 0,
      gainers,
      losers,
      unchanged,
      totalWeight: sector.totalWeight,
    };
  });

  sectors.sort((a, b) => b.totalWeight - a.totalWeight);

  return {
    sectors,
    marketSummary: {
      totalStocks: allSymbols.length,
      totalGainers,
      totalLosers,
      avgChange: totalStocksWithData > 0 ? totalChangeSum / totalStocksWithData : 0,
      isMarketOpen: marketOpen,
      timestamp: new Date().toISOString(),
    },
  };
}

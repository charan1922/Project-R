import { hasDhanAuth } from '@/lib/dhan/auth';
import { dhanMarketFeed, isMarketHours } from '@/lib/dhan/market-feed';
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
    niftyChange: number;
    niftyPrice: number;
    isMarketOpen: boolean;
    timestamp: string;
  };
}

/** Dhan security ID for NIFTY 50 index on IDX_I segment */
const NIFTY_SEC_ID = 13;

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

  // Fetch live OHLC from Dhan (equity stocks + Nifty 50 index in parallel)
  const liveData = new Map<string, { lastPrice: number; prevClose: number; open: number; high: number; low: number }>();
  let niftyChange = 0;
  let niftyPrice = 0;

  if (hasDhanAuth() && symbolToSecId.size > 0) {
    const fetchEquity = async () => {
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
        console.error('[SectorScope] Equity feed failed:', e);
      }
    };

    const fetchNifty = async () => {
      try {
        const data = await dhanMarketFeed('ohlc', {
          IDX_I: [NIFTY_SEC_ID],
        });
        const segment = data.IDX_I;
        if (segment) {
          const niftyQuote = segment[String(NIFTY_SEC_ID)];
          if (niftyQuote?.ohlc) {
            niftyPrice = niftyQuote.last_price;
            const prevClose = niftyQuote.ohlc.close;
            const niftyOpen = niftyQuote.ohlc.open;
            if (isMarketHours() && prevClose > 0) {
              niftyChange = ((niftyPrice - prevClose) / prevClose) * 100;
            } else if (niftyOpen > 0 && niftyPrice > 0) {
              // After hours: open→close change
              niftyChange = ((niftyPrice - niftyOpen) / niftyOpen) * 100;
            }
            console.log(`[SectorScope] Nifty: ${niftyPrice} (${niftyChange > 0 ? '+' : ''}${niftyChange.toFixed(2)}%)`);
          }
        }
      } catch (e) {
        console.error('[SectorScope] Nifty feed failed:', e);
      }
    };

    await Promise.all([fetchEquity(), fetchNifty()]);
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
      const openPrice = live?.open ?? 0;

      // During market hours: last_price vs previous close (standard % change)
      // After market close: Dhan returns last_price == ohlc.close (both are today's close)
      // so use open→close change instead to show meaningful intraday data
      let pctChange = 0;
      if (marketOpen && prevClose > 0) {
        pctChange = ((lastPrice - prevClose) / prevClose) * 100;
      } else if (!marketOpen && openPrice > 0 && lastPrice > 0) {
        pctChange = ((lastPrice - openPrice) / openPrice) * 100;
      }

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
      niftyChange,
      niftyPrice,
      isMarketOpen: marketOpen,
      timestamp: new Date().toISOString(),
    },
  };
}

import { bhavcopyService } from './bhavcopy-service';
import { engine } from './engine';
import { transformToFactorData, SignalOutput, DailyStockData } from './types';
import { promises as fs } from 'fs';
import path from 'path';
import { resolveSymbol, batchResolveFutures } from '../historify/master-contracts';

/** Extended signal with live price data */
export interface BoostSignal extends SignalOutput {
  pctChange?: number; // Live % change from Dhan
}

/** Live equity OHLC from Dhan */
interface LiveEqOHLC {
  high: number;
  low: number;
  close: number;     // Previous day close
  lastPrice: number;
}

/** Live futures depth from Dhan */
interface LiveFutData {
  volume: number;
  oi: number;
  lastPrice: number;
}

/**
 * Check if Indian market is currently open.
 * IST = UTC+5:30, market hours 9:15–15:30.
 */
function isMarketHours(): boolean {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600000);
  const day = ist.getDay();
  if (day === 0 || day === 6) return false;
  const hours = ist.getHours();
  const mins = ist.getMinutes();
  const time = hours * 60 + mins;
  return time >= 9 * 60 + 15 && time <= 15 * 60 + 30;
}

/**
 * Raw Dhan V2 market feed call.
 * The API expects numeric security IDs and returns nested structure:
 * { data: { SEGMENT: { "secId": { last_price, ohlc: { open, close, high, low }, volume?, oi? } } } }
 */
async function dhanMarketFeed(
  endpoint: 'ohlc' | 'quote',
  securities: Record<string, number[]>
): Promise<Record<string, Record<string, { last_price: number; ohlc: { open: number; close: number; high: number; low: number }; volume?: number; oi?: number }>>> {
  const token = process.env.DHAN_ACCESS_TOKEN;
  const clientId = process.env.DHAN_CLIENT_ID;
  if (!token || !clientId) return {};

  const resp = await fetch(`https://api.dhan.co/v2/marketfeed/${endpoint}`, {
    method: 'POST',
    headers: {
      'access-token': token,
      'client-id': clientId,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(securities),
  });

  if (!resp.ok) {
    console.error(`[Dhan] marketfeed/${endpoint} failed: ${resp.status}`);
    return {};
  }

  const json = await resp.json() as { data?: Record<string, Record<string, unknown>>; status: string };
  if (json.status !== 'success' || !json.data) return {};
  return json.data as Record<string, Record<string, { last_price: number; ohlc: { open: number; close: number; high: number; low: number }; volume?: number; oi?: number }>>;
}

export class RFactorDataService {
  async getFnOStocks(): Promise<string[]> {
    try {
      const filePath = path.join(process.cwd(), 'lib', 'data', 'fno_stocks_list.json');
      const data = await fs.readFile(filePath, 'utf8');
      const json = JSON.parse(data);
      return json.stocks;
    } catch {
      return ['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'SBIN'];
    }
  }

  async getRFactorSignal(symbol: string): Promise<SignalOutput> {
    const dailyData = await bhavcopyService.getHistoricalData(symbol, 25);
    if (dailyData.length < 15) {
      throw new Error(
        `Insufficient data for ${symbol}: found ${dailyData.length} days, need at least 15`
      );
    }
    const factorData = transformToFactorData(dailyData);
    const current = factorData[factorData.length - 1];
    const historical = factorData.slice(0, -1);
    return engine.calculateSignal(symbol, current, historical);
  }

  /**
   * Scan all F&O stocks and return BoostSignals.
   *
   * During market hours + Dhan credentials available:
   *   - Dhan equity OHLC → live spread ratio (coeff 0.625)
   *   - Dhan futures depth → live fut_volume (coeff -1.733) + fut_turnover (coeff 1.415)
   *   - Bhavcopy 20-day baseline for Z-score computation
   *   - Yesterday's PCR as proxy (coeff 0.077 — smallest impact)
   *
   * After hours / no Dhan → pure bhavcopy signals
   */
  async scanAllSymbols(limit: number = 206): Promise<BoostSignal[]> {
    const symbols = await this.getFnOStocks();
    const targetSymbols = symbols.slice(0, limit);

    await this.preWarmCache();

    const hasDhan = !!process.env.DHAN_ACCESS_TOKEN && !!process.env.DHAN_CLIENT_ID;
    const marketOpen = isMarketHours();

    if (hasDhan) {
      console.log(`[Boost] Dhan available, market ${marketOpen ? 'OPEN' : 'closed'} → computing LIVE R-Factor`);
      return this.computeLiveSignals(targetSymbols);
    }

    console.log('[Boost] No Dhan credentials → bhavcopy-only signals');
    return this.computeBhavcopySignals(targetSymbols);
  }

  private async computeBhavcopySignals(symbols: string[]): Promise<BoostSignal[]> {
    const results = await Promise.allSettled(
      symbols.map(s => this.getRFactorSignal(s))
    );
    return results
      .filter((r): r is PromiseFulfilledResult<SignalOutput> => r.status === 'fulfilled')
      .map(r => ({ ...r.value }))
      .sort((a, b) => b.compositeRFactor - a.compositeRFactor);
  }

  /**
   * Compute LIVE R-Factor by blending Dhan data with bhavcopy history.
   *
   * Data flow:
   * 1. Resolve symbols → Dhan equity + futures security IDs
   * 2. Batch fetch: equity OHLC (spread) + futures depth (volume, OI)
   * 3. For each symbol: build synthetic "today" from live data + yesterday's F&O proxy
   * 4. Run engine with live current vs 20-day historical baseline
   */
  private async computeLiveSignals(symbols: string[]): Promise<BoostSignal[]> {
    // Step 1: Resolve equity + futures security IDs
    const eqIdMap = new Map<string, number>();   // symbol → equity securityId
    const futIdMap = new Map<string, number>();   // symbol → futures securityId

    const eqResolves = symbols.map(async (s) => {
      const entry = await resolveSymbol(s, 'NSE');
      if (entry) eqIdMap.set(s, parseInt(entry.securityId, 10));
    });
    const futMapPromise = batchResolveFutures(symbols);

    await Promise.all([...eqResolves, futMapPromise]);
    const futResolved = await futMapPromise;
    for (const [sym, secId] of futResolved) {
      futIdMap.set(sym, parseInt(secId, 10));
    }

    console.log(`[Boost] Resolved ${eqIdMap.size} equity, ${futIdMap.size} futures IDs`);

    // Step 2: Batch-fetch live data (parallel equity OHLC + futures depth)
    const liveEq = new Map<string, LiveEqOHLC>();
    const liveFut = new Map<string, LiveFutData>();

    // Build reverse lookups: numericId → symbol
    const eqIdToSym = new Map<number, string>();
    for (const [sym, id] of eqIdMap) eqIdToSym.set(id, sym);
    const futIdToSym = new Map<number, string>();
    for (const [sym, id] of futIdMap) futIdToSym.set(id, sym);

    const fetchPromises: Promise<void>[] = [];

    if (eqIdMap.size > 0) {
      fetchPromises.push((async () => {
        try {
          const data = await dhanMarketFeed('ohlc', {
            NSE_EQ: Array.from(eqIdMap.values()),
          });
          const segment = data['NSE_EQ'];
          if (!segment) return;
          for (const [secIdStr, quote] of Object.entries(segment)) {
            const sym = eqIdToSym.get(parseInt(secIdStr, 10));
            if (sym && quote.ohlc) {
              liveEq.set(sym, {
                high: quote.ohlc.high,
                low: quote.ohlc.low,
                close: quote.ohlc.close,
                lastPrice: quote.last_price,
              });
            }
          }
          console.log(`[Boost] Got equity OHLC for ${liveEq.size} symbols`);
        } catch (e) {
          console.error('[Boost] Equity OHLC fetch failed:', e);
        }
      })());
    }

    if (futIdMap.size > 0) {
      fetchPromises.push((async () => {
        try {
          const data = await dhanMarketFeed('quote', {
            NSE_FNO: Array.from(futIdMap.values()),
          });
          const segment = data['NSE_FNO'];
          if (!segment) return;
          for (const [secIdStr, quote] of Object.entries(segment)) {
            const sym = futIdToSym.get(parseInt(secIdStr, 10));
            if (sym) {
              liveFut.set(sym, {
                volume: quote.volume ?? 0,
                oi: quote.oi ?? 0,
                lastPrice: quote.last_price,
              });
            }
          }
          console.log(`[Boost] Got futures depth for ${liveFut.size} symbols`);
        } catch (e) {
          console.error('[Boost] Futures depth fetch failed:', e);
        }
      })());
    }

    await Promise.all(fetchPromises);

    // Step 3: Compute R-Factor for each symbol with live blend
    const signalPromises = symbols.map(async (symbol) => {
      try {
        const dailyData = await bhavcopyService.getHistoricalData(symbol, 25);
        if (dailyData.length < 15) return null;

        const eq = liveEq.get(symbol);
        const fut = liveFut.get(symbol);
        const lastDay = dailyData[dailyData.length - 1];

        // Build today's DailyStockData from live + proxy
        const liveDay: DailyStockData = {
          // Equity: live from Dhan
          eq_high: eq?.high ?? lastDay.eq_high,
          eq_low: eq?.low ?? lastDay.eq_low,
          eq_close: eq?.close ?? lastDay.eq_close,
          eq_volume: lastDay.eq_volume,
          eq_turnover: lastDay.eq_turnover,
          // Futures: live volume + OI from Dhan
          fut_volume: fut?.volume ?? lastDay.fut_volume,
          fut_turnover: fut ? fut.volume * fut.lastPrice : lastDay.fut_turnover,
          fut_oi: fut?.oi ?? lastDay.fut_oi,
          fut_oi_change: fut ? Math.abs(fut.oi - lastDay.fut_oi) : lastDay.fut_oi_change,
          // Options: proxy from yesterday (PCR coeff is only 0.077)
          opt_volume: lastDay.opt_volume,
          opt_oi: lastDay.opt_oi,
          opt_turnover: lastDay.opt_turnover,
          ce_volume: lastDay.ce_volume,
          pe_volume: lastDay.pe_volume,
        };

        // Replace last day with live-blended data
        const blendedData = [...dailyData.slice(0, -1), liveDay];
        const factorData = transformToFactorData(blendedData);
        const current = factorData[factorData.length - 1];
        const historical = factorData.slice(0, -1);

        const signal = engine.calculateSignal(symbol, current, historical);
        const boost: BoostSignal = {
          ...signal,
          pctChange: eq ? ((eq.lastPrice - eq.close) / eq.close) * 100 : undefined,
        };
        return boost;
      } catch {
        return null;
      }
    });

    const results = await Promise.allSettled(signalPromises);
    const signals: BoostSignal[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        signals.push(r.value);
      }
    }

    return signals.sort((a, b) => b.compositeRFactor - a.compositeRFactor);
  }

  private async preWarmCache(): Promise<void> {
    await bhavcopyService.getHistoricalData('RELIANCE', 25);
  }
}

export const rFactorService = new RFactorDataService();

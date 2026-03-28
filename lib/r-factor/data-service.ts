import { promises as fs } from 'node:fs';
import path from 'node:path';
import { ADX } from 'trading-signals';
import { prisma } from '@/lib/db';
import { hasDhanAuth } from '@/lib/dhan/auth';
import {
  dhanMarketFeed,
  fetchIntradayCandles,
  fetchOptionChain,
  todayIST as getTodayIST,
  isMarketHours,
  isTradingDay,
  type OptionChainSummary,
} from '@/lib/dhan/market-feed';
import {
  batchResolveFutures,
  ensureSynced,
  MasterContractsNotSyncedError,
  resolveSymbol,
} from '../historify/master-contracts';
import { BhavcopyNotSyncedError, getHistoricalData } from './bhavcopy-service';
import {
  batchGetDhanDaily,
  fetchIntradayDayAggregate,
  fetchOptionAggregateForDate,
  getLatestDhanHistoricalDate,
} from './dhan-daily-service';
import { engine, RFactorEngine } from './engine';
import { type DailyStockData, type SignalOutput, transformToFactorData } from './types';

/** Extended signal with live price data */
export interface BoostSignal extends SignalOutput {
  pctChange?: number; // Live % change from Dhan
  sector?: string; // F&O sector classification
  lotValue?: number; // lotSize × lastPrice in ₹ (notional value per lot for margin estimation)
  adx?: number; // ADX trend strength (14-period)
  plusDI?: number; // +DI (bullish directional)
  minusDI?: number; // -DI (bearish directional)
}

/** Result of scanning all symbols */
export interface ScanResult {
  signals: BoostSignal[];
  dataSource: 'live' | 'bhavcopy' | 'bhavcopy-today';
  latestDate: string; // YYYY-MM-DD of the data being shown
  marketOpen: boolean; // Whether IST market was open when this was computed
}

/** Live equity data from Dhan Quote endpoint */
interface LiveEqData {
  high: number;
  low: number;
  close: number; // Previous day close
  lastPrice: number;
  volume: number; // Today's traded volume (from Quote, not available in OHLC)
  averagePrice: number; // VWAP (from Quote endpoint)
}

/** Live futures data from Dhan Quote endpoint */
interface LiveFutData {
  volume: number;
  oi: number;
  lastPrice: number;
  averagePrice: number; // VWAP — closer to NSE's TtlTrfVal when computing turnover
  ohlcHigh: number;
  ohlcLow: number;
}

// Disk-based Dhan market cache — survives Turbopack HMR and server restarts (same pattern as auth.ts)
const DHAN_CACHE_FILE = path.join(process.cwd(), 'data', '.dhan-market-cache.json');

type DhanCacheData = {
  date: string;
  liveEq: Record<string, LiveEqData>;
  liveFut: Record<string, LiveFutData>;
};

async function loadDhanCacheFromDisk(): Promise<{
  date: string;
  liveEq: Map<string, LiveEqData>;
  liveFut: Map<string, LiveFutData>;
} | null> {
  try {
    const raw = await fs.readFile(DHAN_CACHE_FILE, 'utf8');
    const data = JSON.parse(raw) as DhanCacheData;
    return {
      date: data.date,
      liveEq: new Map(Object.entries(data.liveEq)),
      liveFut: new Map(Object.entries(data.liveFut)),
    };
  } catch {
    return null;
  }
}

async function saveDhanCacheToDisk(cache: {
  date: string;
  liveEq: Map<string, LiveEqData>;
  liveFut: Map<string, LiveFutData>;
}): Promise<void> {
  const data: DhanCacheData = {
    date: cache.date,
    liveEq: Object.fromEntries(cache.liveEq),
    liveFut: Object.fromEntries(cache.liveFut),
  };
  await fs.writeFile(DHAN_CACHE_FILE, JSON.stringify(data)).catch(() => {});
}

// In-memory + disk cache for option chains (not persisted to disk — too large, background fetched)
const g = globalThis as unknown as {
  __dhanMarketCache?: { date: string; liveEq: Map<string, LiveEqData>; liveFut: Map<string, LiveFutData> };
  __optionChainCache?: { date: string; data: Map<string, OptionChainSummary>; fetchedAt: number };
  __ocFetchInProgress?: boolean;
};

export class RFactorDataService {
  private _overrideEngine: RFactorEngine | null = null;

  /** Override engine config for this request (preset/robust toggles from UI) */
  setEngineOverrides(overrides: Record<string, unknown>): void {
    this._overrideEngine = new RFactorEngine(overrides as Partial<import('./types').EngineConfig>);
  }

  clearEngineOverrides(): void {
    this._overrideEngine = null;
  }

  /** Get active engine — override if set, otherwise default */
  private get activeEngine(): RFactorEngine {
    return this._overrideEngine ?? engine;
  }

  // Dhan cache: always disk-first. Multiple Turbopack isolates share the same file.
  // In-memory globalThis is only used within a single request to avoid duplicate disk reads.
  private get dhanCache() {
    return g.__dhanMarketCache ?? null;
  }
  private set dhanCache(v) {
    g.__dhanMarketCache = v ?? undefined;
    if (v) saveDhanCacheToDisk(v);
  }

  /** Load Dhan cache from disk. ALWAYS reads disk — never trusts in-memory
   *  because Turbopack runs multiple workers with separate globalThis. */
  private async ensureDhanCache(todayKey: string): Promise<boolean> {
    const diskCache = await loadDhanCacheFromDisk();
    if (diskCache?.date === todayKey) {
      g.__dhanMarketCache = diskCache; // populate in-memory for this request's computations
      return true;
    }
    return false;
  }
  private get optionChainCache() {
    return g.__optionChainCache ?? null;
  }
  private set optionChainCache(v) {
    g.__optionChainCache = v ?? undefined;
  }

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
    const dailyData = await getHistoricalData(symbol, 25);
    if (dailyData.length < 15) {
      throw new Error(`Insufficient data for ${symbol}: found ${dailyData.length} days, need at least 15`);
    }
    const factorData = transformToFactorData(dailyData);
    const current = factorData[factorData.length - 1];
    const historical = factorData.slice(0, -1);
    return this.activeEngine.calculateSignal(symbol, current, historical);
  }

  /** Compute latest ADX values from daily OHLC history */
  private computeADX(dailyData: DailyStockData[]): {
    adx: number | null;
    plusDI: number | null;
    minusDI: number | null;
  } {
    if (dailyData.length < 28) return { adx: null, plusDI: null, minusDI: null };
    const indicator = new ADX(14);
    let result: { adx: number | null; plusDI: number | null; minusDI: number | null } = {
      adx: null,
      plusDI: null,
      minusDI: null,
    };
    for (const d of dailyData) {
      indicator.update({ high: d.eq_high, low: d.eq_low, close: d.eq_close }, false);
      try {
        const adxVal = Number(indicator.getResult());
        const pdi = Number(indicator.pdi);
        const mdi = Number(indicator.mdi);
        result = {
          adx: Math.round(adxVal * 10) / 10,
          plusDI: Math.round(pdi * 1000) / 10,
          minusDI: Math.round(mdi * 1000) / 10,
        };
      } catch {
        // Not enough data yet
      }
    }
    return result;
  }

  /**
   * Compute intraday ADX from 5-min candles (period 7).
   * Fetches today's candles from Dhan charts API.
   * Returns null if not enough data or market closed.
   */
  private async computeIntradayADX(
    securityId: number,
  ): Promise<{ adx: number | null; plusDI: number | null; minusDI: number | null }> {
    const nullResult: { adx: number | null; plusDI: number | null; minusDI: number | null } = {
      adx: null,
      plusDI: null,
      minusDI: null,
    };
    try {
      const candles = await fetchIntradayCandles(securityId, '5');
      // ADX period 7 on 5-min = needs 15+ candles (7*2+1 for warm-up)
      if (candles.length < 15) return nullResult;

      const indicator = new ADX(7);
      let result: { adx: number | null; plusDI: number | null; minusDI: number | null } = {
        adx: null,
        plusDI: null,
        minusDI: null,
      };
      for (const c of candles) {
        indicator.update({ high: c.high, low: c.low, close: c.close }, false);
        try {
          const adxVal = Number(indicator.getResult());
          const pdi = Number(indicator.pdi);
          const mdi = Number(indicator.mdi);
          result = {
            adx: Math.round(adxVal * 10) / 10,
            plusDI: Math.round(pdi * 1000) / 10,
            minusDI: Math.round(mdi * 1000) / 10,
          };
        } catch {
          // Not enough data yet
        }
      }
      return result;
    } catch {
      return nullResult;
    }
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
  async scanAllSymbols(
    _limit = 206,
    opts?: { useOptionChain?: boolean; stockList?: 'all' | 'tf' },
  ): Promise<ScanResult> {
    const allSymbols = await this.getFnOStocks();
    const targetSymbols = opts?.stockList === 'tf' ? await this.getTfTradedStocks(allSymbols) : allSymbols;
    const sectorMap = await this.getSectorMap();

    const hasDhan = hasDhanAuth();
    const marketOpen = isMarketHours();
    const tradingDay = isTradingDay();

    const todayIST = getTodayIST();

    // Decision matrix:
    // 1. Today's bhavcopy synced (post-market) → pure bhavcopy (matches TradeFinder exactly)
    // 2. Dhan available → fetch live/closing data (works during market, post-market, and pre-market next day)
    // 3. No Dhan → latest bhavcopy

    // Prefer today's bhavcopy if synced (post-market, same data source as TradeFinder)
    if (hasDhan && tradingDay && !marketOpen && (await this.hasTodayBhavcopy())) {
      console.log('[Boost] Post-market + today bhavcopy synced → using bhavcopy (matches TF)');
      const signals = this.attachSectors(await this.computeBhavcopySignals(targetSymbols), sectorMap);
      return { signals, dataSource: 'bhavcopy-today', latestDate: todayIST, marketOpen };
    }

    // Try Dhan whenever credentials are available.
    // Dhan API serves yesterday's closing data even at 1 AM — always valid.
    if (hasDhan) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const label = marketOpen ? 'OPEN' : tradingDay ? 'closed (post-market)' : 'pre-market/non-trading';
          console.log(`[Boost] ${label} + Dhan → computing LIVE R-Factor (attempt ${attempt})`);
          const useOC = opts?.useOptionChain !== false;
          const signals = this.attachSectors(await this.computeLiveSignals(targetSymbols, useOC), sectorMap);
          // latestDate: use today if trading day, otherwise Dhan cache date (yesterday's data)
          const latestDate = tradingDay ? todayIST : (this.dhanCache?.date ?? todayIST);
          return { signals, dataSource: 'live', latestDate, marketOpen };
        } catch (e) {
          if (e instanceof MasterContractsNotSyncedError || e instanceof BhavcopyNotSyncedError) throw e;
          if (attempt === 1) {
            console.warn('[Boost] Live attempt 1 failed, retrying in 2s:', e);
            await new Promise((r) => setTimeout(r, 2000));
          } else {
            console.warn('[Boost] Live attempt 2 failed, falling back to bhavcopy:', e);
          }
        }
      }
    }

    // Fallback: bhavcopy
    const latestBhavDate = await this.getLatestBhavcopyDate();
    const reason = !hasDhan ? 'no Dhan credentials' : 'Dhan failed';
    console.log(`[Boost] ${reason} → bhavcopy-only signals (${latestBhavDate})`);
    const signals = this.attachSectors(await this.computeBhavcopySignals(targetSymbols), sectorMap);
    return { signals, dataSource: 'bhavcopy', latestDate: latestBhavDate, marketOpen };
  }

  /**
   * LIVE mode: Dhan-only data, fresh on every call.
   * Use during market hours. Outside hours returns marketClosed flag.
   */
  async scanLive(opts?: { useOptionChain?: boolean; stockList?: 'all' | 'tf' }): Promise<ScanResult> {
    const allSymbols = await this.getFnOStocks();
    const targetSymbols = opts?.stockList === 'tf' ? await this.getTfTradedStocks(allSymbols) : allSymbols;
    const sectorMap = await this.getSectorMap();
    const marketOpen = isMarketHours();

    if (!marketOpen) {
      return { signals: [], dataSource: 'live', latestDate: getTodayIST(), marketOpen: false };
    }

    if (!hasDhanAuth()) {
      throw new Error('Dhan credentials not configured');
    }

    const useOC = opts?.useOptionChain !== false;
    const signals = this.attachSectors(await this.computeLiveSignals(targetSymbols, useOC), sectorMap);
    return { signals, dataSource: 'live', latestDate: getTodayIST(), marketOpen: true };
  }

  /**
   * PAST mode: Bhavcopy-only, 100% deterministic.
   * Same date = same results always. No Dhan dependency.
   */
  async scanPast(opts?: {
    date?: string;
    stockList?: 'all' | 'tf';
  }): Promise<ScanResult & { availableDates: string[] }> {
    const allSymbols = await this.getFnOStocks();
    const targetSymbols = opts?.stockList === 'tf' ? await this.getTfTradedStocks(allSymbols) : allSymbols;
    const sectorMap = await this.getSectorMap();

    // Get available dates from bhavcopy
    const dateRows = await prisma.bhavcopyDay.findMany({
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
    });
    const availableDates = dateRows.map((r) => r.date);

    // Add today if Dhan cache exists and today isn't in bhavcopy yet
    const todayIST = getTodayIST();
    const hasTodayBhavcopy = availableDates.includes(todayIST);
    const hasTodayDhan = !hasTodayBhavcopy && (await this.ensureDhanCache(todayIST));
    if (hasTodayDhan) {
      availableDates.unshift(todayIST); // Add today at the top
    }

    // Use requested date or latest
    const date = opts?.date ?? availableDates[0];
    if (!date) throw new BhavcopyNotSyncedError();

    // If requesting today and only Dhan cache is available, use live signals
    if (date === todayIST && !hasTodayBhavcopy && hasTodayDhan) {
      const signals = this.attachSectors(await this.computeLiveSignals(targetSymbols, false), sectorMap);
      return {
        signals,
        dataSource: 'live',
        latestDate: todayIST,
        marketOpen: isMarketHours(),
        availableDates,
      };
    }

    // Filter symbols that have data for this date
    const dateSymbols = await prisma.bhavcopyDay.findMany({
      where: { date },
      select: { symbol: true },
    });
    const dateSymbolSet = new Set(dateSymbols.map((r) => r.symbol));
    const filteredSymbols = targetSymbols.filter((s) => dateSymbolSet.has(s));

    const signals = this.attachSectors(await this.computeBhavcopySignals(filteredSymbols, date), sectorMap);
    return {
      signals,
      dataSource: 'bhavcopy',
      latestDate: date,
      marketOpen: isMarketHours(),
      availableDates,
    };
  }

  /**
   * DHAN-DAILY mode: Uses Dhan /charts/historical for daily OHLCV + OI.
   * Parallel system to bhavcopy — produces same DailyStockData → FactorData → engine.
   * Allows cross-checking R-Factor from two independent data sources.
   */
  async scanDhanDaily(opts?: {
    stockList?: 'all' | 'tf';
    date?: string;
  }): Promise<ScanResult & { rawData?: Map<string, DailyStockData>; failures?: string[] }> {
    const allSymbols = await this.getFnOStocks();
    const targetSymbols = opts?.stockList === 'tf' ? await this.getTfTradedStocks(allSymbols) : allSymbols;
    const sectorMap = await this.getSectorMap();
    const targetDate = opts?.date;

    console.log(
      `[Boost] Dhan-daily mode: fetching historical data for ${targetSymbols.length} symbols${targetDate ? ` (date: ${targetDate})` : ''}...`,
    );
    const { signals, rawData, failures } = await this.computeDhanDailySignals(targetSymbols, targetDate);
    const enriched = this.attachSectors(signals, sectorMap);
    return {
      signals: enriched,
      dataSource: 'dhan-daily' as ScanResult['dataSource'],
      latestDate: targetDate ?? getTodayIST(),
      marketOpen: isMarketHours(),
      rawData,
      failures,
    };
  }

  async scanDhanTodayFromLive(opts?: {
    stockList?: 'all' | 'tf';
    date?: string;
    latestHistoricalDate?: string;
  }): Promise<ScanResult & { rawData?: Map<string, DailyStockData>; failures?: string[] }> {
    const allSymbols = await this.getFnOStocks();
    const targetSymbols = opts?.stockList === 'tf' ? await this.getTfTradedStocks(allSymbols) : allSymbols;
    const sectorMap = await this.getSectorMap();
    const targetDate = opts?.date ?? getTodayIST();
    const latestHistoricalDate = opts?.latestHistoricalDate ?? (await getLatestDhanHistoricalDate()).latestDate;

    if (!latestHistoricalDate) {
      throw new Error('Unable to determine latest Dhan historical date for live-today sync');
    }

    console.log(
      `[Boost] Dhan live-today mode: building ${targetDate} from live quotes + historical baseline ${latestHistoricalDate} for ${targetSymbols.length} symbols...`,
    );

    const { signals, rawData, failures } = await this.computeDhanTodaySignals(
      targetSymbols,
      targetDate,
      latestHistoricalDate,
    );
    const enriched = this.attachSectors(signals, sectorMap);
    return {
      signals: enriched,
      dataSource: 'dhan-daily' as ScanResult['dataSource'],
      latestDate: targetDate,
      marketOpen: isMarketHours(),
      rawData,
      failures,
    };
  }

  /**
   * Compute R-Factor from Dhan daily historical data.
   * Returns signals + raw data (last day per symbol) + failures.
   */
  private async computeDhanDailySignals(
    symbols: string[],
    targetDate?: string,
  ): Promise<{ signals: BoostSignal[]; rawData: Map<string, DailyStockData>; failures: string[] }> {
    const { data: dataMap, failures } = await batchGetDhanDaily(symbols, 30, targetDate);
    if (failures.length > 0) {
      console.warn(
        `[DhanDaily] ${failures.length} symbols failed: ${failures.slice(0, 5).join(', ')}${failures.length > 5 ? '...' : ''}`,
      );
    }
    const results: (BoostSignal | null)[] = [];
    const rawData = new Map<string, DailyStockData>();

    for (const [sym, dailyData] of dataMap) {
      try {
        if (dailyData.length < 15) continue;
        // Save last day's raw data for comparison
        rawData.set(sym, dailyData[dailyData.length - 1]);
        const factorData = transformToFactorData(dailyData);
        const current = factorData[factorData.length - 1];
        const historical = factorData.slice(0, -1);
        const signal = this.activeEngine.calculateSignal(sym, current, historical);
        const { adx, plusDI, minusDI } = this.computeADX(dailyData);
        const today = dailyData[dailyData.length - 1];
        const yesterday = dailyData.length >= 2 ? dailyData[dailyData.length - 2] : null;
        const pctChange =
          yesterday && yesterday.eq_close > 0
            ? ((today.eq_close - yesterday.eq_close) / yesterday.eq_close) * 100
            : undefined;
        results.push({ ...signal, adx, plusDI, minusDI, pctChange } as BoostSignal);
      } catch (e) {
        console.warn(`[DhanDaily] ${sym} signal failed:`, (e as Error).message);
      }
    }

    return {
      signals: results
        .filter((r): r is BoostSignal => r !== null)
        .sort((a, b) => b.compositeRFactor - a.compositeRFactor),
      rawData,
      failures,
    };
  }

  private async computeDhanTodaySignals(
    symbols: string[],
    targetDate: string,
    latestHistoricalDate: string,
  ): Promise<{ signals: BoostSignal[]; rawData: Map<string, DailyStockData>; failures: string[] }> {
    await ensureSynced();

    const { data: dataMap, failures } = await batchGetDhanDaily(symbols, 30, latestHistoricalDate);
    const eqIdMap = new Map<string, number>();
    const futIdMap = new Map<string, number>();
    const lotSizeMap = new Map<string, number>();

    const eqResolves = symbols.map(async (s) => {
      const entry = await resolveSymbol(s, 'NSE');
      if (entry) eqIdMap.set(s, parseInt(entry.securityId, 10));
      else failures.push(`${s}: Equity not found for live today sync`);
    });
    const futMapPromise = batchResolveFutures(symbols, targetDate);

    await Promise.all([...eqResolves, futMapPromise]);
    const futResolved = await futMapPromise;
    for (const [sym, { securityId, lotSize }] of futResolved) {
      futIdMap.set(sym, parseInt(securityId, 10));
      lotSizeMap.set(sym, lotSize);
    }

    const results: BoostSignal[] = [];
    const rawData = new Map<string, DailyStockData>();

    for (const [sym, dailyData] of dataMap) {
      try {
        if (dailyData.length < 15) {
          failures.push(`${sym}: only ${dailyData.length} days (need 15+)`);
          continue;
        }

        const eqId = eqIdMap.get(sym);
        if (!eqId) {
          failures.push(`${sym}: equity securityId unavailable for ${targetDate}`);
          continue;
        }

        const eq = await fetchIntradayDayAggregate(eqId, 'NSE_EQ', 'EQUITY', targetDate);
        if (!eq) {
          failures.push(`${sym}: intraday equity data unavailable for ${targetDate}`);
          continue;
        }

        const lastDay = dailyData[dailyData.length - 1];
        const futId = futIdMap.get(sym);
        const fut = futId ? await fetchIntradayDayAggregate(futId, 'NSE_FNO', 'FUTSTK', targetDate, true) : null;
        const opt = await fetchOptionAggregateForDate(eqId, targetDate);
        const lotSize = lotSizeMap.get(sym) || 1;
        const futVolumeContracts = fut ? Math.round(fut.volume / lotSize) : lastDay.fut_volume;

        const liveDay: DailyStockData = {
          eq_high: eq.high,
          eq_low: eq.low,
          eq_close: eq.close,
          eq_volume: eq.volume,
          eq_turnover: eq.turnover > 0 ? eq.turnover : eq.volume * eq.close,
          fut_volume: futVolumeContracts,
          fut_turnover: fut ? (fut.turnover > 0 ? fut.turnover : fut.volume * fut.close) : lastDay.fut_turnover,
          fut_oi: fut?.oi ?? lastDay.fut_oi,
          fut_oi_change: fut ? Math.abs(fut.oi - lastDay.fut_oi) : lastDay.fut_oi_change,
          opt_volume: opt?.optVolume ?? lastDay.opt_volume,
          opt_oi: opt?.optOi ?? lastDay.opt_oi,
          opt_turnover: opt?.optTurnover ?? lastDay.opt_turnover,
          ce_volume: opt?.ceVolume ?? lastDay.ce_volume,
          pe_volume: opt?.peVolume ?? lastDay.pe_volume,
        };

        const blendedData = [...dailyData, liveDay].slice(-30);
        rawData.set(sym, liveDay);
        const factorData = transformToFactorData(blendedData);
        const current = factorData[factorData.length - 1];
        const historical = factorData.slice(0, -1);
        const signal = this.activeEngine.calculateSignal(sym, current, historical);
        const { adx, plusDI, minusDI } = this.computeADX(blendedData);
        const pctChange =
          eq.close > 0 && lastDay.eq_close > 0 ? ((eq.close - lastDay.eq_close) / lastDay.eq_close) * 100 : undefined;
        results.push({ ...signal, adx, plusDI, minusDI, pctChange } as BoostSignal);
      } catch (e) {
        failures.push(`${sym}: ${(e as Error).message}`);
      }
    }

    return {
      signals: results.sort((a, b) => b.compositeRFactor - a.compositeRFactor),
      rawData,
      failures,
    };
  }

  /** Get TradeFinder-traded stocks (intersection with official F&O list) */
  private async getTfTradedStocks(allFno: string[]): Promise<string[]> {
    try {
      const filePath = path.join(process.cwd(), 'lib', 'data', 'tf_traded_stocks.json');
      const data = await fs.readFile(filePath, 'utf8');
      const json = JSON.parse(data);
      return json.stocks;
    } catch {
      return allFno; // Fallback to full list if file missing
    }
  }

  private async getSectorMap(): Promise<Record<string, string>> {
    try {
      const filePath = path.join(process.cwd(), 'lib', 'data', 'fno_sectors.json');
      const data = await fs.readFile(filePath, 'utf8');
      return JSON.parse(data);
    } catch {
      return {};
    }
  }

  private attachSectors(signals: BoostSignal[], sectorMap: Record<string, string>): BoostSignal[] {
    for (const signal of signals) {
      signal.sector = sectorMap[signal.symbol] ?? undefined;
    }
    return signals;
  }

  private async getLatestBhavcopyDate(): Promise<string> {
    const row = await prisma.bhavcopyDay.findFirst({ orderBy: { date: 'desc' }, select: { date: true } });
    return row?.date ?? 'unknown';
  }

  /** Check if today's bhavcopy has been synced (any row with today's IST date) */
  private async hasTodayBhavcopy(): Promise<boolean> {
    const today = getTodayIST();
    const row = await prisma.bhavcopyDay.findFirst({ where: { date: today }, select: { date: true } });
    return row !== null;
  }

  private get ocFetchInProgress() {
    return g.__ocFetchInProgress ?? false;
  }
  private set ocFetchInProgress(v: boolean) {
    g.__ocFetchInProgress = v;
  }

  /**
   * Non-blocking option chain access. Returns cached data immediately.
   * Cache TTL:
   *   - Market hours: 15 min (OI/volume change constantly)
   *   - After close: full day (data is frozen)
   * Triggers background re-fetch when stale.
   */
  private getOptionChains(
    eqIdMap: Map<string, number>,
    expiries: Map<string, string>,
  ): Map<string, OptionChainSummary> {
    const todayCacheKey = getTodayIST();
    const marketOpen = isMarketHours();
    const cacheTtlMs = marketOpen ? 15 * 60 * 1000 : 24 * 60 * 60 * 1000; // 15 min live, 24h post-market
    const isFresh =
      this.optionChainCache?.date === todayCacheKey &&
      Date.now() - (this.optionChainCache?.fetchedAt ?? 0) < cacheTtlMs;

    if (isFresh) {
      return this.optionChainCache!.data;
    }

    // Fire-and-forget background fetch (or re-fetch if stale)
    if (!this.ocFetchInProgress) {
      this.ocFetchInProgress = true;
      this.fetchOptionChainsBackground(eqIdMap, expiries, todayCacheKey).finally(() => {
        this.ocFetchInProgress = false;
      });
    }

    return new Map(); // Empty → spread-quad fallback for all stocks this request
  }

  private async fetchOptionChainsBackground(
    eqIdMap: Map<string, number>,
    expiries: Map<string, string>,
    cacheKey: string,
  ): Promise<void> {
    const result = new Map<string, OptionChainSummary>();
    const symbols = Array.from(eqIdMap.keys()).filter((s) => expiries.has(s));
    console.log(`[Boost] Background: fetching option chains for ${symbols.length} symbols...`);

    for (const sym of symbols) {
      const secId = eqIdMap.get(sym)!;
      const expiry = expiries.get(sym)!;
      try {
        const summary = await fetchOptionChain(secId, expiry);
        if (summary) result.set(sym, summary);
      } catch {
        // Skip — spread-quad fallback for this symbol
      }
      await new Promise((r) => setTimeout(r, 3100)); // Rate limit: 1 req / 3s
    }

    console.log(`[Boost] Background: option chain done — ${result.size}/${symbols.length} cached`);
    this.optionChainCache = { date: cacheKey, data: result, fetchedAt: Date.now() };
  }

  private async computeBhavcopySignals(symbols: string[], upToDate?: string): Promise<BoostSignal[]> {
    const results = await Promise.allSettled(
      symbols.map(async (s) => {
        const dailyData = await getHistoricalData(s, 40, upToDate);
        if (dailyData.length < 15) return null;
        const factorData = transformToFactorData(dailyData);
        const current = factorData[factorData.length - 1];
        const historical = factorData.slice(0, -1);
        const signal = this.activeEngine.calculateSignal(s, current, historical);
        const { adx, plusDI, minusDI } = this.computeADX(dailyData);
        // % change: today's close vs yesterday's close
        const today = dailyData[dailyData.length - 1];
        const yesterday = dailyData.length >= 2 ? dailyData[dailyData.length - 2] : null;
        const pctChange =
          yesterday && yesterday.eq_close > 0
            ? ((today.eq_close - yesterday.eq_close) / yesterday.eq_close) * 100
            : undefined;
        return { ...signal, adx, plusDI, minusDI, pctChange } as BoostSignal;
      }),
    );
    return results
      .filter((r): r is PromiseFulfilledResult<BoostSignal> => r.status === 'fulfilled' && r.value !== null)
      .map((r) => r.value)
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
  private async computeLiveSignals(symbols: string[], useOptionChain = true): Promise<BoostSignal[]> {
    // Step 0: Verify master contracts are synced (throws MasterContractsNotSyncedError if not)
    await ensureSynced();

    // Step 1: Resolve equity + futures security IDs
    const eqIdMap = new Map<string, number>(); // symbol → equity securityId
    const futIdMap = new Map<string, number>(); // symbol → futures securityId
    const lotSizeMap = new Map<string, number>(); // symbol → lot size (for Dhan volume → contracts conversion)

    const eqResolves = symbols.map(async (s) => {
      const entry = await resolveSymbol(s, 'NSE');
      if (entry) eqIdMap.set(s, parseInt(entry.securityId, 10));
    });
    const futMapPromise = batchResolveFutures(symbols);

    await Promise.all([...eqResolves, futMapPromise]);
    const futResolved = await futMapPromise;
    const expiryMap = new Map<string, string>(); // symbol → nearest expiry YYYY-MM-DD (for option chain)
    for (const [sym, { securityId, lotSize, expiryDate }] of futResolved) {
      futIdMap.set(sym, parseInt(securityId, 10));
      lotSizeMap.set(sym, lotSize);
      if (expiryDate) expiryMap.set(sym, expiryDate);
    }

    console.log(`[Boost] Resolved ${eqIdMap.size} equity, ${futIdMap.size} futures IDs`);

    // Step 2: Batch-fetch live data (parallel equity OHLC + futures depth)
    // Dhan returns unstable OHLC after market close — cache per trading day for consistency
    const todayCacheKey = getTodayIST();
    let liveEq: Map<string, LiveEqData>;
    let liveFut: Map<string, LiveFutData>;

    const marketOpen = isMarketHours();

    // Disk is source of truth — load on every request to handle multiple Turbopack isolates
    const hasCached = !marketOpen && (await this.ensureDhanCache(todayCacheKey));
    const useCache = hasCached;

    if (useCache) {
      console.log(`[Boost] Market closed — using cached Dhan data for ${todayCacheKey}`);
      liveEq = this.dhanCache!.liveEq;
      liveFut = this.dhanCache!.liveFut;
    } else {
      liveEq = new Map();
      liveFut = new Map();

      // Build reverse lookups: numericId → symbol
      const eqIdToSym = new Map<number, string>();
      for (const [sym, id] of eqIdMap) eqIdToSym.set(id, sym);
      const futIdToSym = new Map<number, string>();
      for (const [sym, id] of futIdMap) futIdToSym.set(id, sym);

      // Fetch equity Quote (not OHLC — Quote includes volume + average_price) + futures depth.
      // NO silent error swallowing — if Dhan fails, throw so retry/fallback kicks in.
      const [eqData, futData] = await Promise.all([
        eqIdMap.size > 0 ? dhanMarketFeed('quote', { NSE_EQ: Array.from(eqIdMap.values()) }) : Promise.resolve(null),
        futIdMap.size > 0 ? dhanMarketFeed('quote', { NSE_FNO: Array.from(futIdMap.values()) }) : Promise.resolve(null),
      ]);

      if (eqData?.NSE_EQ) {
        for (const [secIdStr, quote] of Object.entries(eqData.NSE_EQ)) {
          const sym = eqIdToSym.get(parseInt(secIdStr, 10));
          if (sym && quote.ohlc) {
            liveEq.set(sym, {
              high: quote.ohlc.high,
              low: quote.ohlc.low,
              close: quote.ohlc.close,
              lastPrice: quote.last_price,
              volume: quote.volume ?? 0,
              averagePrice: quote.average_price ?? quote.last_price,
            });
          }
        }
      }

      if (futData?.NSE_FNO) {
        for (const [secIdStr, quote] of Object.entries(futData.NSE_FNO)) {
          const sym = futIdToSym.get(parseInt(secIdStr, 10));
          if (sym) {
            liveFut.set(sym, {
              volume: quote.volume ?? 0,
              oi: quote.oi ?? 0,
              lastPrice: quote.last_price,
              averagePrice: quote.average_price ?? quote.last_price,
              ohlcHigh: quote.ohlc?.high ?? quote.last_price,
              ohlcLow: quote.ohlc?.low ?? quote.last_price,
            });
          }
        }
      }

      console.log(`[Boost] Fetched Dhan data: ${liveEq.size} equity, ${liveFut.size} futures`);
      // Only cache if we got meaningful data (both equity AND futures)
      // Partial data (equity empty, futures present) causes inconsistent R-Factor between requests
      if (liveEq.size > 0 && liveFut.size > 0) {
        const cacheObj = { date: todayCacheKey, liveEq, liveFut };
        g.__dhanMarketCache = cacheObj;
        await saveDhanCacheToDisk(cacheObj);
      } else {
        console.warn(`[Boost] Partial Dhan data — eq=${liveEq.size} fut=${liveFut.size}, NOT caching`);
      }
    }

    // Step 2.5: Option chain data (CE/PE volume → live PCR)
    // Non-blocking: returns cached data or empty map. Background fetch populates cache for next refresh.
    const optChainData = useOptionChain
      ? this.getOptionChains(eqIdMap, expiryMap)
      : new Map<string, OptionChainSummary>();

    // Step 3: Compute R-Factor for each symbol with live blend
    const signalPromises = symbols.map(async (symbol) => {
      try {
        const dailyData = await getHistoricalData(symbol, 25);
        if (dailyData.length < 15) return null;

        const eq = liveEq.get(symbol);
        const fut = liveFut.get(symbol);
        const oc = optChainData.get(symbol); // Live option chain (CE/PE volume, OI)
        const lastDay = dailyData[dailyData.length - 1];
        const lotSize = lotSizeMap.get(symbol) || 1;

        // Dhan reports volume in shares, bhavcopy in contracts.
        // Convert Dhan volume to contracts for Z-score compatibility.
        const futVolumeContracts = fut ? Math.round(fut.volume / lotSize) : lastDay.fut_volume;

        // Compute VWAP-aligned futures turnover to match NSE bhavcopy's TtlTrfVal.
        // Bhavcopy uses official VWAP × volume. Dhan gives average_price (≈ VWAP).
        // Fallback: (high + low) / 2 as VWAP proxy. Last resort: lastPrice.
        const futTurnoverPrice = fut
          ? fut.averagePrice > 0
            ? fut.averagePrice
            : (fut.ohlcHigh + fut.ohlcLow) / 2 || fut.lastPrice
          : 0;

        // Build today's DailyStockData from live + proxy
        const liveDay: DailyStockData = {
          // Equity: live from Dhan Quote (includes volume + VWAP)
          eq_high: eq?.high ?? lastDay.eq_high,
          eq_low: eq?.low ?? lastDay.eq_low,
          eq_close: eq?.lastPrice ?? lastDay.eq_close, // Use LTP for live spread
          eq_volume: eq?.volume ?? lastDay.eq_volume, // Today's volume from Quote endpoint
          eq_turnover: eq ? eq.volume * eq.averagePrice : lastDay.eq_turnover, // VWAP-based turnover
          // Futures: live from Dhan Quote
          // Volume: shares → contracts (÷ lotSize) for Z-score compatibility with bhavcopy
          // Turnover: VWAP × volume (matches NSE bhavcopy TtlTrfVal methodology)
          fut_volume: futVolumeContracts,
          fut_turnover: fut ? fut.volume * futTurnoverPrice : lastDay.fut_turnover,
          fut_oi: fut?.oi ?? lastDay.fut_oi,
          fut_oi_change: fut ? Math.abs(fut.oi - lastDay.fut_oi) : lastDay.fut_oi_change,
          // Options: live from Dhan Option Chain if available, otherwise yesterday's proxy
          opt_volume: oc ? oc.totalOptVolume : lastDay.opt_volume,
          opt_oi: oc ? oc.totalOptOi : lastDay.opt_oi,
          opt_turnover: lastDay.opt_turnover, // No turnover in OC response — proxy
          ce_volume: oc ? oc.totalCeVolume : lastDay.ce_volume,
          pe_volume: oc ? oc.totalPeVolume : lastDay.pe_volume,
        };

        // Replace last bhavcopy day with today's live data.
        // The last bhavcopy day becomes part of the 20-day historical baseline,
        // and today's live data is the "current" day being scored.
        const blendedData = [...dailyData.slice(0, -1), liveDay];
        const factorData = transformToFactorData(blendedData);
        const current = factorData[factorData.length - 1];
        const historical = factorData.slice(0, -1);

        // V4 Dhan-live model: uses OI change, options volume, futures volume
        // (fitted on 79 TF-paired stocks, Pearson 0.55, Top-10 6/10).
        // With option chain: ensemble with live PCR.
        // Without option chain: Dhan-live composite (all Dhan quote factors).
        const signal = oc
          ? this.activeEngine.calculateSignal(symbol, current, historical)
          : this.activeEngine.calculateSignalLive(symbol, current, historical);
        // ADX from bhavcopy history (blended with live day)
        const { adx: adxVal, plusDI, minusDI } = this.computeADX(blendedData);
        const boost: BoostSignal = {
          ...signal,
          pctChange: eq ? ((eq.lastPrice - eq.close) / eq.close) * 100 : undefined,
          lotValue: eq ? lotSize * eq.lastPrice : undefined,
          adx: adxVal ?? undefined,
          plusDI: plusDI ?? undefined,
          minusDI: minusDI ?? undefined,
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

    const sorted = signals.sort((a, b) => b.compositeRFactor - a.compositeRFactor);

    // Compute intraday ADX (5-min, period 7) for top 20 stocks during market hours.
    // This replaces the daily ADX with a real-time trend indicator.
    // Only during market hours (need 5-min candles which aren't available post-market).
    if (isMarketHours()) {
      const top20 = sorted.slice(0, 20);
      await Promise.all(
        top20.map(async (s) => {
          const eqId = eqIdMap.get(s.symbol);
          if (!eqId) return;
          const intraday = await this.computeIntradayADX(eqId);
          if (intraday.adx !== null) {
            s.adx = intraday.adx;
            s.plusDI = intraday.plusDI ?? undefined;
            s.minusDI = intraday.minusDI ?? undefined;
          }
        }),
      );
    }

    return sorted;
  }
}

export const rFactorService = new RFactorDataService();

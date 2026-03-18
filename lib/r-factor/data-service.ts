import { promises as fs } from 'node:fs';
import path from 'node:path';
import { prisma } from '@/lib/db';
import { hasDhanAuth } from '@/lib/dhan/auth';
import {
  dhanMarketFeed,
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
import { engine } from './engine';
import { type DailyStockData, type SignalOutput, transformToFactorData } from './types';

/** Extended signal with live price data */
export interface BoostSignal extends SignalOutput {
  pctChange?: number; // Live % change from Dhan
  sector?: string; // F&O sector classification
  lotValue?: number; // lotSize × lastPrice in ₹ (notional value per lot for margin estimation)
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

export class RFactorDataService {
  // Cache Dhan API responses per trading day — Dhan returns unstable OHLC after market close
  private dhanCache: {
    date: string;
    liveEq: Map<string, LiveEqData>;
    liveFut: Map<string, LiveFutData>;
  } | null = null;

  // Cache option chain summaries per trading day (rate limit: 1 req / 3s, so cache aggressively)
  private optionChainCache: {
    date: string;
    data: Map<string, OptionChainSummary>;
  } | null = null;

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
  async scanAllSymbols(limit: number = 206): Promise<ScanResult> {
    const symbols = await this.getFnOStocks();
    const targetSymbols = symbols.slice(0, limit);
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
          const signals = this.attachSectors(await this.computeLiveSignals(targetSymbols), sectorMap);
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

  private ocFetchInProgress = false;

  /**
   * Non-blocking option chain access. Returns cached data immediately.
   * If cache is stale, triggers background fetch — results available on next scan (60s auto-refresh).
   * Page loads instantly with spread-quad model, upgrades to full OLS on subsequent refreshes.
   */
  private getOptionChains(
    eqIdMap: Map<string, number>,
    expiries: Map<string, string>,
  ): Map<string, OptionChainSummary> {
    const todayCacheKey = getTodayIST();

    if (this.optionChainCache?.date === todayCacheKey) {
      return this.optionChainCache.data;
    }

    // Fire-and-forget background fetch
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
    this.optionChainCache = { date: cacheKey, data: result };
  }

  private async computeBhavcopySignals(symbols: string[]): Promise<BoostSignal[]> {
    const results = await Promise.allSettled(symbols.map((s) => this.getRFactorSignal(s)));
    return results
      .filter((r): r is PromiseFulfilledResult<SignalOutput> => r.status === 'fulfilled')
      .map((r) => ({ ...r.value }))
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
    const useCache = !marketOpen && this.dhanCache?.date === todayCacheKey;

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
      this.dhanCache = { date: todayCacheKey, liveEq, liveFut };
    }

    // Step 2.5: Option chain data (CE/PE volume → live PCR)
    // Non-blocking: returns cached data or empty map. Background fetch populates cache for next refresh.
    const optChainData = this.getOptionChains(eqIdMap, expiryMap);

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

        // Replace last day with live-blended data
        const blendedData = [...dailyData.slice(0, -1), liveDay];
        const factorData = transformToFactorData(blendedData);
        const current = factorData[factorData.length - 1];
        const historical = factorData.slice(0, -1);

        // Full OLS model when we have option chain data (all factors live from Dhan)
        // Spread-quadratic fallback when option chain is missing
        const signal = oc
          ? engine.calculateSignal(symbol, current, historical)
          : engine.calculateSignalLive(symbol, current, historical);
        const boost: BoostSignal = {
          ...signal,
          pctChange: eq ? ((eq.lastPrice - eq.close) / eq.close) * 100 : undefined,
          lotValue: eq ? lotSize * eq.lastPrice : undefined,
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
}

export const rFactorService = new RFactorDataService();

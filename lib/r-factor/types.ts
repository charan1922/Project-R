/** Raw daily data from NSE bhavcopy (equity + F&O merged) */
export interface DailyStockData {
  eq_volume: number;
  eq_turnover: number;
  eq_open: number;
  eq_high: number;
  eq_low: number;
  eq_close: number;
  eq_trades: number;
  eq_delivery_qty: number;
  eq_delivery_pct: number;
  fut_volume: number;
  fut_oi: number;
  fut_oi_change: number;
  fut_turnover: number;
  fut_trades: number; // Total number of futures transactions (institutional block size signal)
  opt_volume: number;
  opt_oi: number;
  opt_turnover: number;
  opt_trades: number; // Total option transactions (CE + PE combined)
  ce_volume: number; // Call options volume (for PCR)
  pe_volume: number; // Put options volume (for PCR)
  ce_trades: number; // Call options trade count
  pe_trades: number; // Put options trade count
}

/** 8-factor model inputs derived from DailyStockData */
export interface FactorData {
  fut_turnover: number; // Futures turnover (80-stock Pearson 0.18)
  fut_volume: number; // Futures volume (Pearson 0.16, correlated with turnover)
  opt_volume: number; // Options total volume (Pearson 0.09)
  eq_trade_size: number; // Equity avg trade size = turnover/volume (Pearson 0.13)
  fut_avg_trade_size: number; // Futures avg trade size = turnover / trades (New institutional signal)
  opt_avg_trade_size: number; // Options avg trade size = turnover / trades (New institutional signal)
  oi_change: number; // |today's fut OI - yesterday's fut OI| (Pearson 0.21)
  oi_level: number; // Absolute OI RATIO vs 20d avg — captures sustained accumulation
  spread: number; // (high-low)/close RATIO vs 20d avg — dominant predictor (Pearson 0.54)
  pcr: number; // Put-Call ratio = pe_volume / ce_volume (Pearson 0.31)
}

/** Enhanced factor data with additional predictive features */
export interface EnhancedFactorData extends FactorData {
  // Momentum and acceleration features
  spread_acceleration: number; // (today_spread_ratio / yesterday_spread_ratio) - 1
  volume_acceleration: number; // Rate of change in futures volume
  turnover_acceleration: number; // Rate of change in futures turnover

  // Multi-day patterns
  spread_3d_avg: number; // 3-day rolling average spread ratio
  turnover_3d_avg: number; // 3-day rolling average turnover Z-score
  momentum_signal: number; // R-Factor trend indicator (1 = improving, -1 = deteriorating)

  // Volatility measures
  intraday_range_pct: number; // (high - low) / VWAP proxy
  close_position: number; // (close - low) / (high - low) — where close sits in the range

  // Sector-relative (populated later)
  sector_relative_spread?: number; // spread_z - mean(sector_spread_z)
  sector_relative_turnover?: number; // turnover_z - mean(sector_turnover_z)
}

export interface HistoricalPoint extends FactorData {
  symbol: string;
  date: string;
}

export type MarketRegime = 'Elephant' | 'Cheetah' | 'Hybrid' | 'Defensive';

/** Market-wide context for regime-aware R-Factor adjustment */
export interface MarketContext {
  niftyChange: number; // NIFTY 50 daily % change
  vixLevel: number; // India VIX level (volatility index)
  fiiNetFlow: number; // FII net buy/sell in ₹ crores
  diiNetFlow: number; // DII net buy/sell in ₹ crores
  advanceDeclineRatio: number; // Market breadth: advances / declines
  marketTimestamp: string; // When this context was captured
}

/** Model types in the ensemble */
export type ModelType = 'ols' | 'spread-quad' | 'momentum' | 'ensemble';

export interface SignalOutput {
  symbol: string;
  timestamp: string;
  zScores: {
    fut_turnover: number;
    fut_volume: number;
    opt_volume: number;
    eq_trade_size: number;
    fut_avg_trade_size: number;
    opt_avg_trade_size: number;
    oi_change: number;
    oi_level: number; // OI ratio vs 20d avg (>1 = accumulation, <1 = distribution)
    spread: number;
    pcr: number;
  };
  compositeRFactor: number;
  rawRFactor: number; // Before scale correction
  scaledRFactor: number; // After scale correction
  regime: MarketRegime;
  isBlastTrade: boolean;
  modelUsed: ModelType; // Which model computed compositeRFactor
  confidence: number; // 0-1 confidence score based on factor agreement
  marketAdjustment: number; // How much market context adjusted the score
  ensembleWeights?: Record<ModelType, number>; // Weights if ensemble was used
}

export interface EngineConfig {
  lookbackPeriod: number;
  minLookback: number; // Minimum days required
  maxLookback: number; // Maximum days for adaptive lookback
  thresholds: {
    blastTrade: number;
    regimeSwitch: number;
    highVix: number; // VIX threshold for regime adjustment
    strongMarketMove: number; // % change threshold for market adjustment
  };
  // Scale correction parameters
  scaleCorrection: {
    enabled: boolean;
    expansionThreshold: number; // R-Factor above which to expand
    expansionFactor: number; // How much to amplify extreme values
  };
  // Ensemble model weights
  ensembleWeights: {
    ols: number;
    spreadQuad: number; // matches 'spread-quad' key
    momentum: number;
  };
  // Robust regression settings
  robustRegression: {
    enabled: boolean;
    huberEpsilon: number; // Huber loss threshold
  };
}

// OLS coefficients are hardcoded in engine.ts — these thresholds are for regime/blast classification only
export const DEFAULT_CONFIG: EngineConfig = {
  lookbackPeriod: 20,
  minLookback: 10,
  maxLookback: 30,
  thresholds: {
    blastTrade: 2.8,
    regimeSwitch: 1.5,
    highVix: 20,
    strongMarketMove: 2.0,
  },
  scaleCorrection: {
    enabled: true,
    expansionThreshold: 2.5,
    expansionFactor: 1.5,
  },
  ensembleWeights: {
    ols: 0.05,
    spreadQuad: 0.9,
    momentum: 0.05,
  },
  robustRegression: {
    enabled: false, // Disabled: penalizes high-activity stocks that TF ranks highest
    huberEpsilon: 1.35,
  },
};

/**
 * Transform raw daily data to factor inputs.
 * Spread is computed as a RATIO (today / 20d avg) — validated to work better than Z-score.
 * PCR is computed from CE/PE volume split.
 */
export function transformToFactorData(daily: DailyStockData[]): FactorData[] {
  return daily.map((d, i) => {
    // Compute 20-day average spread for ratio calculation
    const lookbackStart = Math.max(0, i - 20);
    const lookback = daily.slice(lookbackStart, i);
    const avgSpread =
      lookback.length > 0
        ? lookback.reduce((sum, h) => sum + (h.eq_close > 0 ? (h.eq_high - h.eq_low) / h.eq_close : 0), 0) /
          lookback.length
        : 0;
    const currentSpread = d.eq_close > 0 ? (d.eq_high - d.eq_low) / d.eq_close : 0;

    // Compute 20-day average OI level for ratio (captures sustained accumulation)
    const avgOi = lookback.length > 0 ? lookback.reduce((sum, h) => sum + h.fut_oi, 0) / lookback.length : 0;

    return {
      fut_turnover: d.fut_turnover,
      fut_volume: d.fut_volume,
      opt_volume: d.opt_volume,
      eq_trade_size: d.eq_volume > 0 ? d.eq_turnover / d.eq_volume : 0,
      fut_avg_trade_size: d.fut_trades > 0 ? d.fut_turnover / d.fut_trades : 0,
      opt_avg_trade_size: d.opt_trades > 0 ? d.opt_turnover / d.opt_trades : 0,
      oi_change: Math.abs(d.fut_oi_change),
      oi_level: avgOi > 0 ? d.fut_oi / avgOi : 0, // OI ratio vs 20d avg
      spread: avgSpread > 0 ? currentSpread / avgSpread : 0,
      pcr: d.ce_volume > 0 ? d.pe_volume / d.ce_volume : 0,
    };
  });
}

/**
 * Transform raw daily data to enhanced factor inputs with additional features.
 * Includes momentum, acceleration, and multi-day patterns.
 */
export function transformToEnhancedFactorData(daily: DailyStockData[]): EnhancedFactorData[] {
  const baseFactors = transformToFactorData(daily);

  return baseFactors.map((f, i) => {
    // Calculate acceleration features (need at least 2 days)
    const prevSpread = i > 0 ? baseFactors[i - 1].spread : f.spread;
    const prevVolume = i > 0 ? baseFactors[i - 1].fut_volume : f.fut_volume;
    const prevTurnover = i > 0 ? baseFactors[i - 1].fut_turnover : f.fut_turnover;

    const spreadAcceleration = prevSpread > 0 ? f.spread / prevSpread - 1 : 0;
    const volumeAcceleration = prevVolume > 0 ? f.fut_volume / prevVolume - 1 : 0;
    const turnoverAcceleration = prevTurnover > 0 ? f.fut_turnover / prevTurnover - 1 : 0;

    // Multi-day rolling averages
    const lookback3 = baseFactors.slice(Math.max(0, i - 2), i + 1);
    const spread3dAvg = lookback3.reduce((sum, h) => sum + h.spread, 0) / lookback3.length;
    const turnover3dAvg = lookback3.reduce((sum, h) => sum + h.fut_turnover, 0) / lookback3.length;

    // Momentum signal: compare current values to 3-day avg
    const momentumSignal = calculateMomentumSignal(f, { spread: spread3dAvg, fut_turnover: turnover3dAvg });

    // Volatility measures
    const currentDay = daily[i];
    const vwapProxy = currentDay.eq_volume > 0 ? currentDay.eq_turnover / currentDay.eq_volume : currentDay.eq_close;
    const intradayRangePct = vwapProxy > 0 ? (currentDay.eq_high - currentDay.eq_low) / vwapProxy : 0;

    const range = currentDay.eq_high - currentDay.eq_low;
    const closePosition = range > 0 ? (currentDay.eq_close - currentDay.eq_low) / range : 0.5;

    return {
      ...f,
      spread_acceleration: spreadAcceleration,
      volume_acceleration: volumeAcceleration,
      turnover_acceleration: turnoverAcceleration,
      spread_3d_avg: spread3dAvg,
      turnover_3d_avg: turnover3dAvg,
      momentum_signal: momentumSignal,
      intraday_range_pct: intradayRangePct,
      close_position: closePosition,
    };
  });
}

/**
 * Calculate momentum signal based on current vs 3-day average.
 * Returns: 1 (improving), 0 (neutral), -1 (deteriorating)
 */
function calculateMomentumSignal(current: FactorData, avg: { spread: number; fut_turnover: number }): number {
  let signal = 0;

  // Spread improving (current > avg by 10%+)
  if (current.spread > avg.spread * 1.1) signal += 1;
  else if (current.spread < avg.spread * 0.9) signal -= 1;

  // Turnover improving
  if (current.fut_turnover > avg.fut_turnover * 1.1) signal += 1;
  else if (current.fut_turnover < avg.fut_turnover * 0.9) signal -= 1;

  // Normalize to -1, 0, 1
  return Math.max(-1, Math.min(1, signal / 2));
}

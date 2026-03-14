/** Raw daily data from NSE bhavcopy (equity + F&O merged) */
export interface DailyStockData {
  eq_volume: number;
  eq_turnover: number;
  eq_high: number;
  eq_low: number;
  eq_close: number;
  fut_volume: number;
  fut_oi: number;
  fut_oi_change: number;
  fut_turnover: number;
  opt_volume: number;
  opt_oi: number;
  opt_turnover: number;
  ce_volume: number;   // Call options volume (for PCR)
  pe_volume: number;   // Put options volume (for PCR)
}

/** 7-factor model inputs derived from DailyStockData */
export interface FactorData {
  fut_turnover: number;   // Futures turnover (80-stock Pearson 0.18)
  fut_volume: number;     // Futures volume (Pearson 0.16, correlated with turnover)
  opt_volume: number;     // Options total volume (Pearson 0.09)
  eq_trade_size: number;  // Equity avg trade size = turnover/volume (Pearson 0.13)
  oi_change: number;      // |today's fut OI - yesterday's fut OI| (Pearson 0.21)
  spread: number;         // (high-low)/close RATIO vs 20d avg — dominant predictor (Pearson 0.54)
  pcr: number;            // Put-Call ratio = pe_volume / ce_volume (Pearson 0.31)
}

export interface HistoricalPoint extends FactorData {
  symbol: string;
  date: string;
}

export type MarketRegime = 'Elephant' | 'Cheetah' | 'Hybrid' | 'Defensive';

export interface SignalOutput {
  symbol: string;
  timestamp: string;
  zScores: {
    fut_turnover: number;
    fut_volume: number;
    opt_volume: number;
    eq_trade_size: number;
    oi_change: number;
    spread: number;
    pcr: number;
  };
  compositeRFactor: number;
  regime: MarketRegime;
  isBlastTrade: boolean;
}

export interface EngineConfig {
  lookbackPeriod: number;
  weights: {
    spread: number;
    fut_turnover: number;
    pcr: number;
    oi_change: number;
    eq_trade_size: number;
    fut_volume: number;
    opt_volume: number;
  };
  thresholds: {
    blastTrade: number;
    regimeSwitch: number;
  };
}

// Weights validated against 80 F&O stocks from TradeFinder (March 13 2026)
// Previous 11-stock weights were overfitting — this is the 80-stock corrected version
export const DEFAULT_CONFIG: EngineConfig = {
  lookbackPeriod: 20,
  weights: {
    spread: 0.30,        // Dominant predictor (Pearson 0.54 as ratio)
    fut_turnover: 0.20,  // Strong futures signal
    pcr: 0.15,           // Put-Call ratio (Pearson 0.31)
    oi_change: 0.12,     // OI change direction
    eq_trade_size: 0.10, // Institutional block trade size
    fut_volume: 0.08,    // Reduced — multicollinear with turnover
    opt_volume: 0.05,    // Weak at 80-stock scale
  },
  thresholds: {
    blastTrade: 2.0,
    regimeSwitch: 1.5,
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
    const avgSpread = lookback.length > 0
      ? lookback.reduce((sum, h) =>
          sum + (h.eq_close > 0 ? (h.eq_high - h.eq_low) / h.eq_close : 0), 0) / lookback.length
      : 0;
    const currentSpread = d.eq_close > 0 ? (d.eq_high - d.eq_low) / d.eq_close : 0;

    return {
      fut_turnover: d.fut_turnover,
      fut_volume: d.fut_volume,
      opt_volume: d.opt_volume,
      eq_trade_size: d.eq_volume > 0 ? d.eq_turnover / d.eq_volume : 0,
      oi_change: Math.abs(d.fut_oi_change),
      spread: avgSpread > 0 ? currentSpread / avgSpread : 0,
      pcr: d.ce_volume > 0 ? d.pe_volume / d.ce_volume : 0,
    };
  });
}

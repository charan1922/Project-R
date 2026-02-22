export interface FactorData {
  volume: number;
  oi: number;
  turnover: number;
  spread: number;
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
    volume: number;
    oi: number;
    turnover: number;
    spread: number;
  };
  compositeRFactor: number;
  regime: MarketRegime;
  isBlastTrade: boolean;
}

export interface EngineConfig {
  lookbackPeriod: number;
  weights: {
    volume: number;
    oi: number;
    turnover: number;
    spread: number;
  };
  thresholds: {
    blastTrade: number;
    regimeSwitch: number;
  };
}

export const DEFAULT_CONFIG: EngineConfig = {
  lookbackPeriod: 20,
  weights: {
    volume: 0.2,
    oi: 0.5,
    turnover: 0.2,
    spread: 0.1,
  },
  thresholds: {
    blastTrade: 3.0,
    regimeSwitch: 1.5, // Spread Z-score above this triggers Cheetah classification
  },
};

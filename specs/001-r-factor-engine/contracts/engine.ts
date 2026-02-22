export interface FactorData {
  volume: number;
  oi: number;
  turnover: number;
  spread: number;
}

export interface RollingStats {
  mean: number;
  stdDev: number;
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

export interface RFactorEngineInterface {
  /**
   * Calculates the current R-Factor signal for a given symbol
   * @param current The latest data point (Volume, OI, Turnover, Spread)
   * @param historical An array of at least N previous data points for lookback
   */
  calculateSignal(
    symbol: string,
    current: FactorData,
    historical: FactorData[]
  ): SignalOutput;

  /**
   * Validates if a signal meets "Blast Trade" criteria
   */
  isBlast(signal: SignalOutput): boolean;

  /**
   * Classifies the regime based on statistical factors
   */
  classifyRegime(signal: SignalOutput): MarketRegime;
}

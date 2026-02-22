import { calculateZScore } from './stats';
import { 
  FactorData, 
  SignalOutput, 
  MarketRegime, 
  EngineConfig, 
  DEFAULT_CONFIG 
} from './types';

export class RFactorEngine {
  private config: EngineConfig;

  constructor(config: Partial<EngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculates market signal output for a given symbol
   */
  public calculateSignal(
    symbol: string,
    current: FactorData,
    historical: FactorData[]
  ): SignalOutput {
    // Extract series for each factor from historical data
    const volumeSeries = historical.map(h => h.volume);
    const oiSeries = historical.map(h => h.oi);
    const turnoverSeries = historical.map(h => h.turnover);
    const spreadSeries = historical.map(h => h.spread);

    // Calculate Z-scores
    const volumeZ = calculateZScore(current.volume, volumeSeries);
    const oiZ = calculateZScore(current.oi, oiSeries);
    const turnoverZ = calculateZScore(current.turnover, turnoverSeries);
    const spreadZ = calculateZScore(current.spread, spreadSeries);

    const zScores = {
      volume: volumeZ,
      oi: oiZ,
      turnover: turnoverZ,
      spread: spreadZ
    };

    const compositeRFactor = this.calculateCompositeScore(zScores);
    const regime = this.classifyRegime(spreadZ);
    const isBlastTrade = this.checkIsBlast(volumeZ);

    return {
      symbol,
      timestamp: new Date().toISOString(),
      zScores,
      compositeRFactor,
      regime,
      isBlastTrade
    };
  }

  /**
   * Calculates weighted composite R-Factor score
   */
  private calculateCompositeScore(zScores: SignalOutput['zScores']): number {
    const { weights } = this.config;
    return (
      zScores.volume * weights.volume +
      zScores.oi * weights.oi +
      zScores.turnover * weights.turnover +
      zScores.spread * weights.spread
    );
  }

  /**
   * Classifies the market regime based on spread dynamics
   */
  private classifyRegime(spreadZ: number): MarketRegime {
    if (spreadZ > this.config.thresholds.regimeSwitch) {
      return 'Cheetah';
    }
    // Simplification for now: if not cheetah, it's elephant
    // In reality, logic could be more complex (e.g. volume + spread)
    return 'Elephant';
  }

  /**
   * Determines if the volume activity constitutes a "Blast Trade"
   */
  private checkIsBlast(volumeZ: number): boolean {
    return volumeZ >= this.config.thresholds.blastTrade;
  }
}

// Export default singleton instance with default config
export const engine = new RFactorEngine();

import { bhavcopyService } from './bhavcopy-service';
import { engine } from './engine';
import { transformToFactorData, SignalOutput } from './types';
import { promises as fs } from 'fs';
import path from 'path';

export class RFactorDataService {
  /**
   * Load F&O stocks list
   */
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

  /**
   * Get R-Factor signal for a single symbol.
   * Downloads ~25 days of bhavcopy data, transforms to factors, computes Z-scores.
   */
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
   * Scan multiple F&O stocks for signals.
   * Since bhavcopy contains ALL stocks, each day's data is fetched once
   * and shared across all symbols (via cache).
   */
  async scanAllSymbols(limit: number = 20): Promise<SignalOutput[]> {
    const symbols = await this.getFnOStocks();
    const targetSymbols = symbols.slice(0, limit);

    // Pre-warm cache: fetch all trading days once
    // (subsequent getHistoricalData calls will hit cache)
    await this.preWarmCache();

    const results = await Promise.allSettled(
      targetSymbols.map(s => this.getRFactorSignal(s))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<SignalOutput> => r.status === 'fulfilled')
      .map(r => r.value)
      .sort((a, b) => b.compositeRFactor - a.compositeRFactor);
  }

  /**
   * Pre-warm the bhavcopy cache by downloading recent trading days.
   * Each day's download covers ALL stocks, so this is efficient.
   */
  private async preWarmCache(): Promise<void> {
    // Trigger a single symbol fetch to ensure all days are downloaded.
    // The bhavcopy service caches per-day files that contain all stocks.
    await bhavcopyService.getHistoricalData('RELIANCE', 25);
  }
}

export const rFactorService = new RFactorDataService();

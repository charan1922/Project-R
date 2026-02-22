import { NseIndia } from "stock-nse-india";
import { FactorData, HistoricalPoint, SignalOutput, engine } from "./r-factor";
import { promises as fs } from "fs";
import path from "path";

const nseIndia = new NseIndia();

export class NseService {
  private readonly CACHE_DIR = path.join(process.cwd(), "data", "cache");
  private readonly CACHE_TTL = 1000 * 60 * 60 * 24; // 24 hours for historical data

  /**
   * Load F&O stocks list from file
   */
  async getFnOStocks(): Promise<string[]> {
    try {
      const filePath = path.join(process.cwd(), "data", "fno_stocks_list.json");
      const data = await fs.readFile(filePath, "utf8");
      const json = JSON.parse(data);
      return json.stocks;
    } catch (err) {
      return ["PNB", "RELIANCE", "TCS", "HDFCBANK", "INFY"];
    }
  }

  /**
   * Fetches the last N trading days for a symbol and maps to FactorData
   */
  async getHistoricalFactorData(symbol: string, days: number = 30): Promise<FactorData[]> {
    const cacheFile = path.join(this.CACHE_DIR, `${symbol}_${days}.json`);
    
    try {
      const stats = await fs.stat(cacheFile);
      if (Date.now() - stats.mtimeMs < this.CACHE_TTL) {
        const cachedData = await fs.readFile(cacheFile, "utf8");
        return JSON.parse(cachedData);
      }
    } catch (e) {
      // Cache miss or file error
    }

    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - days);

    const historical = await nseIndia.getEquityHistoricalData(symbol, { start, end });
    const allPoints = historical.flatMap((d: any) => d.data || []);
    
    const data = allPoints.map((p: any) => ({
      volume: p.chTotTradedQty || 0,
      oi: 0,
      turnover: p.chTotTradedVal || 0,
      spread: (p.chTradeHighPrice - p.chTradeLowPrice) / p.chClosingPrice || 0
    }));

    // Save to cache
    try {
      await fs.writeFile(cacheFile, JSON.stringify(data));
    } catch (e) {
      console.error(`Failed to write cache for ${symbol}:`, e);
    }

    return data;
  }

  /**
   * Fetches real-time data point for a symbol
   */
  async getCurrentFactorData(symbol: string): Promise<FactorData> {
    const details = await nseIndia.getEquityDetails(symbol);
    const p = details.priceInfo;
    
    let totalOI = 0;
    try {
      const oc: any = await nseIndia.getEquityOptionChain(symbol);
      if (oc && oc.filtered) {
        totalOI = (oc.filtered.CE?.totOI || 0) + (oc.filtered.PE?.totOI || 0);
      }
    } catch (e) {
      // Ignore OI errors
    }

    return {
      volume: details.preOpenMarket?.totalTradedVolume || 0,
      oi: totalOI,
      turnover: (p?.lastPrice || 0) * (details.preOpenMarket?.totalTradedVolume || 0),
      spread: (p?.intraDayHighLow?.max - p?.intraDayHighLow?.min) / p?.lastPrice || 0
    };
  }

  /**
   * Gets the R-Factor signal for a symbol
   */
  async getRFactorSignal(symbol: string): Promise<SignalOutput> {
    const [historical, current] = await Promise.all([
      this.getHistoricalFactorData(symbol),
      this.getCurrentFactorData(symbol)
    ]);

    if (historical.length < 15) {
       throw new Error(`Insufficient historical data for ${symbol}. Found ${historical.length} days.`);
    }

    return engine.calculateSignal(symbol, current, historical);
  }

  /**
   * Clears the file-based cache
   */
  async clearCache(): Promise<void> {
    try {
      const files = await fs.readdir(this.CACHE_DIR);
      for (const file of files) {
        if (file.endsWith(".json")) {
          await fs.unlink(path.join(this.CACHE_DIR, file));
        }
      }
    } catch (e) {
      console.error("Failed to clear cache:", e);
    }
  }

  /**
   * Scans all F&O stocks for signals
   */
  async scanAllSymbols(limit: number = 20): Promise<SignalOutput[]> {
    const symbols = await this.getFnOStocks();
    const targetSymbols = symbols.slice(0, limit);
    
    const results = await Promise.allSettled(
      targetSymbols.map(s => this.getRFactorSignal(s))
    );

    return results
      .filter((r): r is PromiseFulfilledResult<SignalOutput> => r.status === 'fulfilled')
      .map(r => r.value);
  }
}

export const nseService = new NseService();

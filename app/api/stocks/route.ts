import { NextResponse } from "next/server";
import { NseIndia } from "stock-nse-india";
import { promises as fs } from "fs";
import path from "path";

const nseIndia = new NseIndia();

// Load F&O stocks list
async function getFnOStocks(): Promise<string[]> {
  try {
    const filePath = path.join(process.cwd(), "data", "fno_stocks_list.json");
    const data = await fs.readFile(filePath, "utf8");
    const json = JSON.parse(data);
    return json.stocks;
  } catch (err) {
    console.error("Error loading F&O stocks:", err);
    // Fallback to default list
    return [
      "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "HINDUNILVR", "ITC", "SBIN",
      "BHARTIARTL", "KOTAKBANK", "AXISBANK", "LT", "HCLTECH", "ASIANPAINT", "MARUTI",
      "SUNPHARMA", "TITAN", "BAJFINANCE", "WIPRO", "ULTRACEMCO"
    ];
  }
}

// Load sector mappings
async function getSectorMappings(): Promise<Record<string, string>> {
  try {
    const filePath = path.join(process.cwd(), "data", "fno_sectors.json");
    const data = await fs.readFile(filePath, "utf8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error loading sector mappings:", err);
    return {};
  }
}

export async function GET() {
  try {
    const STOCK_SYMBOLS = await getFnOStocks();
    const SECTOR_MAP = await getSectorMappings();
    
    console.log(`Fetching data for ${STOCK_SYMBOLS.length} F&O stocks...`);

    // Fetch stocks in batches to avoid overwhelming the API
    const batchSize = 20;
    const stocks: any[] = [];
    
    for (let i = 0; i < Math.min(STOCK_SYMBOLS.length, 150); i += batchSize) {
      const batch = STOCK_SYMBOLS.slice(i, i + batchSize);
      
      const batchResults = await Promise.all(
        batch.map(async (symbol) => {
          try {
            const details = await nseIndia.getEquityDetails(symbol);
            const priceInfo = details.priceInfo;
            
            return {
              symbol,
              name: details.info?.companyName || symbol,
              price: priceInfo?.lastPrice || 0,
              change: priceInfo?.change || 0,
              percentChange: priceInfo?.pChange || 0,
              open: priceInfo?.open || 0,
              high: priceInfo?.intraDayHighLow?.max || 0,
              low: priceInfo?.intraDayHighLow?.min || 0,
              close: priceInfo?.close || 0,
              sector: SECTOR_MAP[symbol] || "OTHER",
              volume: details.preOpenMarket?.totalTradedVolume || 0,
            };
          } catch (err) {
            console.error(`Error fetching ${symbol}:`, (err as Error).message);
            return {
              symbol,
              name: symbol,
              price: 0,
              change: 0,
              percentChange: 0,
              open: 0,
              high: 0,
              low: 0,
              close: 0,
              sector: SECTOR_MAP[symbol] || "OTHER",
              volume: 0,
            };
          }
        })
      );
      
      stocks.push(...batchResults);
      
      // Small delay between batches
      if (i + batchSize < STOCK_SYMBOLS.length) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    // Group by sector
    const sectorData = stocks.reduce((acc, stock) => {
      const sector = stock.sector;
      if (!acc[sector]) {
        acc[sector] = {
          stocks: [],
          totalChange: 0,
          upCount: 0,
          downCount: 0,
        };
      }
      acc[sector].stocks.push(stock);
      acc[sector].totalChange += stock.percentChange;
      if (stock.percentChange > 0) acc[sector].upCount++;
      else if (stock.percentChange < 0) acc[sector].downCount++;
      return acc;
    }, {} as Record<string, any>);

    // Calculate sector performance
    Object.keys(sectorData).forEach((sector) => {
      const s = sectorData[sector];
      s.avgChange = s.stocks.length > 0 ? s.totalChange / s.stocks.length : 0;
    });

    return NextResponse.json({ 
      stocks, 
      sectorData,
      totalFnOStocks: STOCK_SYMBOLS.length,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock data" },
      { status: 500 }
    );
  }
}

export const revalidate = 60; // Revalidate every 60 seconds

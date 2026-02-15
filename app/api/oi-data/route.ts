import { NextResponse } from "next/server";
import { NseIndia } from "stock-nse-india";

const nseIndia = new NseIndia();

// Top F&O stocks to scan
const SCAN_STOCKS = [
  "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "HINDUNILVR", "ITC", "SBIN",
  "BHARTIARTL", "KOTAKBANK", "AXISBANK", "LT", "HCLTECH", "ASIANPAINT", "MARUTI",
  "SUNPHARMA", "TITAN", "BAJFINANCE", "WIPRO", "ULTRACEMCO", "NESTLEIND", "POWERGRID",
  "M&M", "ADANIENT", "NTPC", "GRASIM", "JSWSTEEL", "TATAMOTORS", "TECHM", "HDFCLIFE",
  "TATASTEEL", "BAJAJFINSV", "CIPLA", "ONGC", "DRREDDY", "DIVISLAB", "HEROMOTOCO",
  "COALINDIA", "HINDALCO", "ADANIPORTS", "BPCL", "EICHERMOT", "SBILIFE", "APOLLOHOSP",
  "BRITANNIA", "SHREECEM", "INDUSINDBK", "UPL", "TORNTPHARM", "MARICO", "PIDILITIND"
];

export async function GET() {
  try {
    const results = await Promise.all(
      SCAN_STOCKS.map(async (symbol) => {
        try {
          // Get equity details for price
          const details = await nseIndia.getEquityDetails(symbol);
          const priceInfo = details.priceInfo;
          
          // Get option chain for OI data
          let totalCallOI = 0;
          let totalPutOI = 0;
          
          try {
            const optionChain = await nseIndia.getEquityOptionChain(symbol);
            
            // Extract OI from option chain data
            if (optionChain && optionChain.records && optionChain.records.data) {
              for (const item of optionChain.records.data) {
                if (item.CE && item.CE.openInterest) {
                  totalCallOI += item.CE.openInterest;
                }
                if (item.PE && item.PE.openInterest) {
                  totalPutOI += item.PE.openInterest;
                }
              }
            }
          } catch (oiErr) {
            console.log(`OI data not available for ${symbol}`);
          }
          
          const putCallRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 1;
          
          // Calculate price change
          const changePercent = priceInfo?.pChange || 0;
          
          // Determine signal based on price movement and OI
          let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
          let strength: "STRONG" | "MODERATE" | "WEAK" = "WEAK";
          
          // Buy: Price up + High Put/Call ratio (more puts = sellers bearish = bullish)
          if (changePercent > 1.5 && putCallRatio > 1.0) {
            signal = "BUY";
            strength = changePercent > 3 && putCallRatio > 1.3 ? "STRONG" : "MODERATE";
          }
          // Sell: Price down + Low Put/Call ratio (more calls = sellers bullish = bearish)
          else if (changePercent < -1.5 && putCallRatio < 1.0) {
            signal = "SELL";
            strength = changePercent < -3 && putCallRatio < 0.8 ? "STRONG" : "MODERATE";
          }
          // Also check extreme price moves
          else if (changePercent > 2) {
            signal = "BUY";
            strength = "MODERATE";
          } else if (changePercent < -2) {
            signal = "SELL";
            strength = "MODERATE";
          }
          
          return {
            symbol,
            name: details.info?.companyName || symbol,
            price: priceInfo?.lastPrice || 0,
            change: priceInfo?.change || 0,
            changePercent: parseFloat(changePercent.toFixed(2)),
            open: priceInfo?.open || 0,
            high: priceInfo?.intraDayHighLow?.max || 0,
            low: priceInfo?.intraDayHighLow?.min || 0,
            close: priceInfo?.close || 0,
            volume: details.preOpenMarket?.totalTradedVolume || 0,
            totalCallOI,
            totalPutOI,
            putCallRatio: parseFloat(putCallRatio.toFixed(2)),
            signal,
            strength,
            timestamp: new Date().toISOString(),
          };
        } catch (err) {
          console.error(`Error fetching ${symbol}:`, (err as Error).message);
          return null;
        }
      })
    );

    // Filter out nulls and sort by signal strength
    const validResults = results.filter(Boolean).sort((a: any, b: any) => {
      const signalOrder = { BUY: 0, SELL: 1, NEUTRAL: 2 };
      return signalOrder[a!.signal] - signalOrder[b!.signal];
    });

    return NextResponse.json({
      stocks: validResults,
      scannedAt: new Date().toISOString(),
      totalScanned: SCAN_STOCKS.length,
      successful: validResults.length,
    });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch OI data" },
      { status: 500 }
    );
  }
}

export const revalidate = 30;

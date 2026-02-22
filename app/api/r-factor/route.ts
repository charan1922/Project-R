import { NextRequest, NextResponse } from "next/server";
import { nseService } from "@/lib/nse-service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const symbol = searchParams.get("symbol")?.toUpperCase();

    if (symbol) {
      console.log(`Calculating R-Factor for ${symbol}...`);
      const signal = await nseService.getRFactorSignal(symbol);
      return NextResponse.json({
        success: true,
        data: signal,
        timestamp: new Date().toISOString()
      });
    }

    // If no symbol, run a bulk scan
    console.log("Running bulk R-Factor scan...");
    const limit = parseInt(searchParams.get("limit") || "15");
    const signals = await nseService.scanAllSymbols(limit);

    return NextResponse.json({
      success: true,
      count: signals.length,
      data: signals,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("R-Factor API Error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: (error as Error).message || "Failed to calculate R-Factor" 
      },
      { status: 500 }
    );
  }
}

export const revalidate = 60; // Revalidate every minute

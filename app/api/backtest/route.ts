import { NextResponse } from "next/server";

const TOP_50_STOCKS = [
  "RELIANCE","TCS","HDFCBANK","ICICIBANK","INFY","HINDUNILVR","ITC","SBIN",
  "BHARTIARTL","KOTAKBANK","AXISBANK","LT","HCLTECH","ASIANPAINT","MARUTI",
  "SUNPHARMA","TITAN","BAJFINANCE","WIPRO","ULTRACEMCO","NESTLEIND","POWERGRID",
  "M&M","ADANIENT","NTPC","GRASIM","JSWSTEEL","TATAMOTORS","TECHM","HDFCLIFE",
  "TATASTEEL","BAJAJFINSV","CIPLA","ONGC","DRREDDY","DIVISLAB","HEROMOTOCO",
  "COALINDIA","HINDALCO","ADANIPORTS","BPCL","EICHERMOT","SBILIFE","APOLLOHOSP",
  "BRITANNIA","SHREECEM","INDUSINDBK","UPL","TORNTPHARM","MARICO",
];

const REGIMES: Record<string, "Elephant" | "Cheetah" | "Normal"> = {
  RELIANCE: "Elephant", TCS: "Elephant", HDFCBANK: "Elephant", ICICIBANK: "Elephant",
  INFY: "Elephant", HINDUNILVR: "Elephant", ITC: "Elephant", SBIN: "Elephant",
  BHARTIARTL: "Elephant", KOTAKBANK: "Elephant", AXISBANK: "Elephant", LT: "Elephant",
  HCLTECH: "Elephant", ASIANPAINT: "Normal", MARUTI: "Normal", SUNPHARMA: "Normal",
  TITAN: "Cheetah", BAJFINANCE: "Cheetah", WIPRO: "Elephant", ULTRACEMCO: "Normal",
  NESTLEIND: "Cheetah", POWERGRID: "Elephant", "M&M": "Elephant", ADANIENT: "Cheetah",
  NTPC: "Elephant", GRASIM: "Normal", JSWSTEEL: "Normal", TATAMOTORS: "Normal",
  TECHM: "Normal", HDFCLIFE: "Elephant", TATASTEEL: "Normal", BAJAJFINSV: "Cheetah",
  CIPLA: "Normal", ONGC: "Elephant", DRREDDY: "Cheetah", DIVISLAB: "Cheetah",
  HEROMOTOCO: "Cheetah", COALINDIA: "Elephant", HINDALCO: "Normal", ADANIPORTS: "Normal",
  BPCL: "Normal", EICHERMOT: "Cheetah", SBILIFE: "Normal", APOLLOHOSP: "Cheetah",
  BRITANNIA: "Normal", SHREECEM: "Cheetah", INDUSINDBK: "Normal", UPL: "Normal",
  TORNTPHARM: "Cheetah", MARICO: "Normal",
};

function generateSeed(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      symbol = "RELIANCE",
      days = 90,
      rThreshold = 1.5,
      volWeight = 0.40,
      turnWeight = 0.30,
      oiWeight = 0.20,
      spreadWeight = 0.10,
    } = body;

    const upperSymbol = symbol.toUpperCase();
    if (!TOP_50_STOCKS.includes(upperSymbol)) {
      return NextResponse.json(
        { error: `Symbol ${upperSymbol} not found in NSE F&O top 50 stocks` },
        { status: 400 }
      );
    }

    const seed = generateSeed(upperSymbol + days.toString() + rThreshold.toString());
    const rand = seededRandom(seed);

    const regime = REGIMES[upperSymbol] || "Normal";
    const regimeMultiplier = regime === "Elephant" ? 0.7 : regime === "Cheetah" ? 1.4 : 1.0;

    const trades: Array<{
      date: string;
      symbol: string;
      signal: "BUY" | "SELL";
      entryPrice: number;
      exitPrice: number;
      pnl: number;
      pnlPercent: number;
      rFactor: number;
      zVol: number;
      zTurn: number;
      zOI: number;
      zSpread: number;
      status: "WIN" | "LOSS";
    }> = [];

    const basePrice = 500 + rand() * 4500;
    const startDate = new Date(2025, 5, 1);

    for (let d = 0; d < days; d++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + d);
      if (currentDate.getDay() === 0 || currentDate.getDay() === 6) continue;

      const zVol = (rand() * 5 - 0.5) * regimeMultiplier;
      const zTurn = (rand() * 4.5 - 0.3) * regimeMultiplier;
      const zOI = (rand() * 4 - 0.5) * regimeMultiplier;
      const zSpread = (rand() * 3 - 0.5) * regimeMultiplier;

      const rFactor =
        volWeight * Math.max(0, zVol) +
        turnWeight * Math.max(0, zTurn) +
        oiWeight * Math.max(0, zOI) +
        spreadWeight * Math.max(0, zSpread);

      if (rFactor < rThreshold) continue;

      const isBullish = rand() > 0.45;
      const signal: "BUY" | "SELL" = isBullish ? "BUY" : "SELL";
      const dayPrice = basePrice * (0.85 + rand() * 0.3);
      const movePercent = (rand() * 6 - 2) * (regime === "Cheetah" ? 1.5 : 1.0);
      const exitPrice = dayPrice * (1 + movePercent / 100);
      const pnl = signal === "BUY" ? exitPrice - dayPrice : dayPrice - exitPrice;
      const pnlPercent = (pnl / dayPrice) * 100;

      trades.push({
        date: currentDate.toISOString().split("T")[0],
        symbol: upperSymbol,
        signal,
        entryPrice: parseFloat(dayPrice.toFixed(2)),
        exitPrice: parseFloat(exitPrice.toFixed(2)),
        pnl: parseFloat(pnl.toFixed(2)),
        pnlPercent: parseFloat(pnlPercent.toFixed(2)),
        rFactor: parseFloat(rFactor.toFixed(2)),
        zVol: parseFloat(Math.max(0, zVol).toFixed(2)),
        zTurn: parseFloat(Math.max(0, zTurn).toFixed(2)),
        zOI: parseFloat(Math.max(0, zOI).toFixed(2)),
        zSpread: parseFloat(Math.max(0, zSpread).toFixed(2)),
        status: pnl >= 0 ? "WIN" : "LOSS",
      });
    }

    const wins = trades.filter((t) => t.status === "WIN");
    const losses = trades.filter((t) => t.status === "LOSS");
    const grossProfit = wins.reduce((s, t) => s + t.pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0));
    const totalReturn = trades.reduce((s, t) => s + t.pnlPercent, 0);

    let maxDrawdown = 0;
    let peak = 0;
    let equity = 0;
    for (const t of trades) {
      equity += t.pnl;
      if (equity > peak) peak = equity;
      const dd = peak - equity;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    const returns = trades.map((t) => t.pnlPercent);
    const meanReturn = returns.length > 0 ? returns.reduce((a, b) => a + b, 0) / returns.length : 0;
    const stdReturn = returns.length > 1
      ? Math.sqrt(returns.reduce((s, r) => s + (r - meanReturn) ** 2, 0) / (returns.length - 1))
      : 1;

    const stats = {
      totalTrades: trades.length,
      wins: wins.length,
      losses: losses.length,
      winRate: trades.length > 0 ? parseFloat(((wins.length / trades.length) * 100).toFixed(1)) : 0,
      totalReturn: parseFloat(totalReturn.toFixed(2)),
      profitFactor: grossLoss > 0 ? parseFloat((grossProfit / grossLoss).toFixed(2)) : grossProfit > 0 ? 999 : 0,
      maxDrawdown: parseFloat(maxDrawdown.toFixed(2)),
      sharpeRatio: stdReturn > 0 ? parseFloat((meanReturn / stdReturn).toFixed(2)) : 0,
      avgWin: wins.length > 0 ? parseFloat((grossProfit / wins.length).toFixed(2)) : 0,
      avgLoss: losses.length > 0 ? parseFloat((grossLoss / losses.length).toFixed(2)) : 0,
      expectancy: trades.length > 0
        ? parseFloat(
            (
              (wins.length / trades.length) * (grossProfit / Math.max(wins.length, 1)) -
              (losses.length / trades.length) * (grossLoss / Math.max(losses.length, 1))
            ).toFixed(2)
          )
        : 0,
      regime,
    };

    return NextResponse.json({
      symbol: upperSymbol,
      regime,
      parameters: { days, rThreshold, volWeight, turnWeight, oiWeight, spreadWeight },
      stats,
      trades,
      availableStocks: TOP_50_STOCKS,
    });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}

export async function GET() {
  return NextResponse.json({
    availableStocks: TOP_50_STOCKS,
    regimes: REGIMES,
    description: "NSE F&O Top 50 stocks backtest API. POST with { symbol, days, rThreshold, volWeight, turnWeight, oiWeight, spreadWeight }",
  });
}

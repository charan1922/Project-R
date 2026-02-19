"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  LineChart,
  Play,
  TrendingUp,
  TrendingDown,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Info,
  RefreshCw,
} from "lucide-react";

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

interface BacktestTrade {
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
  status: "WIN" | "LOSS";
}

interface BacktestStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  totalReturn: number;
  profitFactor: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgWin: number;
  avgLoss: number;
  expectancy: number;
}

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

function runSimulatedBacktest(
  symbol: string,
  days: number,
  rThreshold: number,
  volWeight: number,
  turnWeight: number,
  oiWeight: number,
  spreadWeight: number,
): { trades: BacktestTrade[]; stats: BacktestStats } {
  const seed = generateSeed(symbol + days.toString() + rThreshold.toString());
  const rand = seededRandom(seed);

  const regime = REGIMES[symbol] || "Normal";
  const regimeMultiplier = regime === "Elephant" ? 0.7 : regime === "Cheetah" ? 1.4 : 1.0;

  const trades: BacktestTrade[] = [];
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

    const rFactor = volWeight * Math.max(0, zVol) +
                    turnWeight * Math.max(0, zTurn) +
                    oiWeight * Math.max(0, zOI) +
                    spreadWeight * Math.max(0, zSpread);

    if (rFactor < rThreshold) continue;

    const isBullish = rand() > 0.45;
    const signal: "BUY" | "SELL" = isBullish ? "BUY" : "SELL";

    const dayPrice = basePrice * (0.85 + rand() * 0.3);
    const movePercent = (rand() * 6 - 2) * (regime === "Cheetah" ? 1.5 : 1.0);
    const exitPrice = dayPrice * (1 + movePercent / 100);
    const pnl = signal === "BUY"
      ? exitPrice - dayPrice
      : dayPrice - exitPrice;
    const pnlPercent = (pnl / dayPrice) * 100;

    trades.push({
      date: currentDate.toISOString().split("T")[0],
      symbol,
      signal,
      entryPrice: parseFloat(dayPrice.toFixed(2)),
      exitPrice: parseFloat(exitPrice.toFixed(2)),
      pnl: parseFloat(pnl.toFixed(2)),
      pnlPercent: parseFloat(pnlPercent.toFixed(2)),
      rFactor: parseFloat(rFactor.toFixed(2)),
      zVol: parseFloat(Math.max(0, zVol).toFixed(2)),
      zTurn: parseFloat(Math.max(0, zTurn).toFixed(2)),
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

  const stats: BacktestStats = {
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
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
  };

  return { trades, stats };
}

export default function BacktestPlaygroundPage() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [days, setDays] = useState("90");
  const [rThreshold, setRThreshold] = useState("1.5");
  const [volWeight, setVolWeight] = useState("0.40");
  const [turnWeight, setTurnWeight] = useState("0.30");
  const [oiWeight, setOiWeight] = useState("0.20");
  const [spreadWeight, setSpreadWeight] = useState("0.10");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ trades: BacktestTrade[]; stats: BacktestStats } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const filteredStocks = useMemo(() => {
    const q = symbol.toUpperCase();
    return TOP_50_STOCKS.filter((s) => s.includes(q)).slice(0, 8);
  }, [symbol]);

  const handleRunBacktest = () => {
    setLoading(true);
    setTimeout(() => {
      const result = runSimulatedBacktest(
        symbol.toUpperCase(),
        parseInt(days) || 90,
        parseFloat(rThreshold) || 1.5,
        parseFloat(volWeight) || 0.4,
        parseFloat(turnWeight) || 0.3,
        parseFloat(oiWeight) || 0.2,
        parseFloat(spreadWeight) || 0.1
      );
      setResults(result);
      setLoading(false);
    }, 800);
  };

  const regime = REGIMES[symbol.toUpperCase()] || "Normal";

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-slate-100 flex items-center gap-3">
          <LineChart className="w-8 h-8 text-sky-400" />
          Strategy Backtest Playground
        </h1>
        <p className="text-slate-400">
          Test the 4-Factor Z-Score R-Factor strategy on 50 NSE F&O stocks. Adjust weights and thresholds to learn how parameters affect performance.
        </p>
      </div>

      {/* Info */}
      <Card className="bg-sky-500/5 border-sky-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-sky-400 mt-0.5 shrink-0" />
          <div>
            <h4 className="font-semibold text-sky-400 mb-1">Educational Simulation</h4>
            <p className="text-sm text-slate-400">
              This playground uses a deterministic simulation engine seeded by stock name and parameters.
              Results are consistent for the same inputs, allowing you to compare different parameter
              combinations and understand how R-Factor thresholds, factor weights, and stock regimes
              affect strategy performance.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Target className="w-5 h-5 text-sky-400" />
            Backtest Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Row 1: Symbol, Days, Threshold */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <label className="text-sm text-slate-400 mb-2 block">Stock Symbol</label>
              <Input
                value={symbol}
                onChange={(e) => {
                  setSymbol(e.target.value.toUpperCase());
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                placeholder="e.g., RELIANCE"
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
              {showSuggestions && filteredStocks.length > 0 && symbol.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg overflow-hidden shadow-lg">
                  {filteredStocks.map((s) => (
                    <button
                      key={s}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 flex items-center justify-between"
                      onMouseDown={() => {
                        setSymbol(s);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>{s}</span>
                      <Badge
                        className={
                          REGIMES[s] === "Elephant"
                            ? "bg-sky-500/20 text-sky-400"
                            : REGIMES[s] === "Cheetah"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-600/20 text-slate-400"
                        }
                      >
                        {REGIMES[s] || "Normal"}
                      </Badge>
                    </button>
                  ))}
                </div>
              )}
              <div className="mt-1">
                <Badge
                  className={
                    regime === "Elephant"
                      ? "bg-sky-500/20 text-sky-400"
                      : regime === "Cheetah"
                      ? "bg-amber-500/20 text-amber-400"
                      : "bg-slate-600/20 text-slate-400"
                  }
                >
                  {regime}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Lookback Days</label>
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">R-Factor Threshold</label>
              <Input
                type="number"
                step="0.1"
                value={rThreshold}
                onChange={(e) => setRThreshold(e.target.value)}
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleRunBacktest}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 w-full text-slate-100"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 mr-2" /> Run Backtest
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Row 2: Factor Weights */}
          <div>
            <h4 className="text-sm font-semibold text-slate-300 mb-3">Factor Weights (must sum to 1.0)</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs text-sky-400 mb-1 block">Volume (40%)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={volWeight}
                  onChange={(e) => setVolWeight(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-indigo-400 mb-1 block">Turnover (30%)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={turnWeight}
                  onChange={(e) => setTurnWeight(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-violet-400 mb-1 block">OI (20%)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={oiWeight}
                  onChange={(e) => setOiWeight(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
              <div>
                <label className="text-xs text-amber-400 mb-1 block">Spread (10%)</label>
                <Input
                  type="number"
                  step="0.05"
                  value={spreadWeight}
                  onChange={(e) => setSpreadWeight(e.target.value)}
                  className="bg-slate-800 border-slate-700 text-slate-100"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-slate-100">{results.stats.totalTrades}</div>
                <div className="text-sm text-slate-400">Total Trades</div>
                <div className="text-xs text-slate-500 mt-1">
                  {results.stats.wins}W / {results.stats.losses}L
                </div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div
                  className={`text-2xl font-bold ${
                    results.stats.winRate >= 50 ? "text-emerald-400" : "text-red-400"
                  }`}
                >
                  {results.stats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-400">Win Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div
                  className={`text-2xl font-bold ${
                    results.stats.profitFactor >= 1.5 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {results.stats.profitFactor}
                </div>
                <div className="text-sm text-slate-400">Profit Factor</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div
                  className={`text-2xl font-bold ${
                    results.stats.sharpeRatio >= 1.0 ? "text-emerald-400" : "text-amber-400"
                  }`}
                >
                  {results.stats.sharpeRatio}
                </div>
                <div className="text-sm text-slate-400">Sharpe Ratio</div>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className={`text-lg font-bold ${results.stats.totalReturn >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {results.stats.totalReturn >= 0 ? "+" : ""}
                  {results.stats.totalReturn}%
                </div>
                <div className="text-xs text-slate-400">Total Return</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="text-lg font-bold text-emerald-400">
                  +{results.stats.avgWin.toFixed(0)}
                </div>
                <div className="text-xs text-slate-400">Avg Win</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="text-lg font-bold text-red-400">
                  -{results.stats.avgLoss.toFixed(0)}
                </div>
                <div className="text-xs text-slate-400">Avg Loss</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="text-lg font-bold text-red-400">
                  -{results.stats.maxDrawdown.toFixed(0)}
                </div>
                <div className="text-xs text-slate-400">Max Drawdown</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className={`text-lg font-bold ${results.stats.expectancy >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {results.stats.expectancy >= 0 ? "+" : ""}
                  {results.stats.expectancy.toFixed(0)}
                </div>
                <div className="text-xs text-slate-400">Expectancy</div>
              </CardContent>
            </Card>
          </div>

          {/* Equity Curve (simplified visual) */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-sky-400" />
                Equity Curve
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-32 flex items-end gap-0.5">
                {results.trades.map((trade, i) => {
                  const cumPnl = results.trades
                    .slice(0, i + 1)
                    .reduce((s, t) => s + t.pnl, 0);
                  const maxAbsPnl = Math.max(
                    ...results.trades.map((_, idx) =>
                      Math.abs(
                        results.trades
                          .slice(0, idx + 1)
                          .reduce((s, t) => s + t.pnl, 0)
                      )
                    ),
                    1
                  );
                  const height = Math.abs(cumPnl) / maxAbsPnl;
                  return (
                    <div
                      key={i}
                      className={`flex-1 min-w-[2px] rounded-t-sm transition-all ${
                        cumPnl >= 0 ? "bg-emerald-500" : "bg-red-500"
                      }`}
                      style={{ height: `${Math.max(height * 100, 2)}%` }}
                      title={`Trade ${i + 1}: ${trade.date} | P&L: ${trade.pnl.toFixed(0)} | Cum: ${cumPnl.toFixed(0)}`}
                    />
                  );
                })}
              </div>
              <div className="flex justify-between mt-2 text-xs text-slate-500">
                <span>{results.trades[0]?.date || ""}</span>
                <span>{results.trades[results.trades.length - 1]?.date || ""}</span>
              </div>
            </CardContent>
          </Card>

          {/* Trade Log */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100">Trade Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 text-slate-400 font-medium">Date</th>
                      <th className="text-left py-3 text-slate-400 font-medium">Signal</th>
                      <th className="text-left py-3 text-slate-400 font-medium">R-Factor</th>
                      <th className="text-left py-3 text-slate-400 font-medium">Z(Vol)</th>
                      <th className="text-left py-3 text-slate-400 font-medium">Entry</th>
                      <th className="text-left py-3 text-slate-400 font-medium">Exit</th>
                      <th className="text-left py-3 text-slate-400 font-medium">P&L %</th>
                      <th className="text-left py-3 text-slate-400 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.trades.slice(0, 30).map((trade, index) => (
                      <tr key={index} className="border-b border-slate-800/50">
                        <td className="py-2.5 text-slate-300">{trade.date}</td>
                        <td>
                          <Badge
                            className={
                              trade.signal === "BUY"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          >
                            {trade.signal}
                          </Badge>
                        </td>
                        <td className="font-mono text-sky-400">{trade.rFactor}</td>
                        <td className="font-mono text-slate-300">{trade.zVol}</td>
                        <td className="text-slate-300">{trade.entryPrice}</td>
                        <td className="text-slate-300">{trade.exitPrice}</td>
                        <td
                          className={
                            trade.pnlPercent >= 0 ? "text-emerald-400" : "text-red-400"
                          }
                        >
                          {trade.pnlPercent >= 0 ? (
                            <ArrowUpRight className="w-3 h-3 inline mr-1" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3 inline mr-1" />
                          )}
                          {trade.pnlPercent}%
                        </td>
                        <td>
                          <Badge
                            className={
                              trade.status === "WIN"
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-red-500/20 text-red-400"
                            }
                          >
                            {trade.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {results.trades.length > 30 && (
                  <p className="text-center text-sm text-slate-500 mt-3">
                    Showing 30 of {results.trades.length} trades
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!results && !loading && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-12 text-center">
            <BarChart3 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 mb-2">
              Configure parameters above and click "Run Backtest" to see results.
            </p>
            <p className="text-xs text-slate-500">
              Try different stocks, thresholds, and factor weights to learn how they affect strategy performance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

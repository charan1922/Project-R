"use client";

import { useState } from "react";
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
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  Database,
  Info
} from "lucide-react";

interface BacktestResult {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  signal: "BUY" | "SELL";
  status: "WIN" | "LOSS";
}

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [days, setDays] = useState("30");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestResult[] | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Call the real backtest API
      const res = await fetch(`/api/backtest?symbol=${symbol}&days=${days}`);
      if (!res.ok) throw new Error("Backtest failed");
      
      const data = await res.json();
      setResults(data.trades);
      setStats(data.stats);
    } catch (err) {
      setError("Backtest requires historical OI data API. This feature needs integration with historical data provider.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <LineChart className="w-8 h-8 text-blue-400" />
          Strategy Backtest
        </h1>
        <p className="text-slate-400">
          Test the OI + Breakout strategy on historical data
        </p>
      </div>

      {/* Info Card */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-400 mb-1">Historical Data Required</h4>
            <p className="text-sm text-slate-400">
              Backtesting requires historical Open Interest data. To implement this feature, 
              you need access to:
            </p>
            <ul className="mt-2 text-sm text-slate-400 list-disc list-inside">
              <li>Historical option chain data (OI by strike)</li>
              <li>Daily price and volume history</li>
              <li>Provider: TrueData, GlobalDataFeed, or NSE Historical</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Parameters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Backtest Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Stock Symbol</label>
              <Input
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                placeholder="e.g., RELIANCE"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Lookback (Days)</label>
              <Input
                type="number"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={runBacktest} 
                disabled={loading}
                className="bg-blue-500 hover:bg-blue-600 w-full"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Running...</>
                ) : (
                  <><Play className="w-4 h-4 mr-2" /> Run Backtest</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-white">{stats.totalTrades}</div>
                <div className="text-sm text-slate-400">Total Trades</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${stats.winRate >= 50 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.winRate.toFixed(1)}%
                </div>
                <div className="text-sm text-slate-400">Win Rate</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${stats.profitFactor >= 1.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {stats.profitFactor}
                </div>
                <div className="text-sm text-slate-400">Profit Factor</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardContent className="p-4">
                <div className={`text-2xl font-bold ${stats.totalReturn >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {stats.totalReturn >= 0 ? '+' : ''}{stats.totalReturn}%
                </div>
                <div className="text-sm text-slate-400">Total Return</div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left border-b border-slate-800">
                      <th className="pb-3 text-slate-400">Date</th>
                      <th className="pb-3 text-slate-400">Symbol</th>
                      <th className="pb-3 text-slate-400">Signal</th>
                      <th className="pb-3 text-slate-400">Entry</th>
                      <th className="pb-3 text-slate-400">Exit</th>
                      <th className="pb-3 text-slate-400">P&L</th>
                      <th className="pb-3 text-slate-400">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results?.map((trade, index) => (
                      <tr key={index} className="border-b border-slate-800">
                        <td className="py-3 text-slate-300">{trade.entryDate}</td>
                        <td className="font-semibold text-white">{trade.symbol}</td>
                        <td>
                          <Badge className={trade.signal === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                            {trade.signal}
                          </Badge>
                        </td>
                        <td className="text-slate-300">₹{trade.entryPrice}</td>
                        <td className="text-slate-300">₹{trade.exitPrice}</td>
                        <td className={trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                          {trade.pnl >= 0 ? <ArrowUpRight className="w-4 h-4 inline" /> : <ArrowDownRight className="w-4 h-4 inline" />}
                          {trade.pnlPercent}%
                        </td>
                        <td>
                          <Badge className={trade.status === "WIN" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                            {trade.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!stats && !error && !loading && (
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-12 text-center">
            <Database className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Configure parameters and run backtest to see results</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

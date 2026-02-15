"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  LineChart, 
  Play, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  Target,
  Percent,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface BacktestResult {
  symbol: string;
  entryDate: string;
  exitDate: string;
  entryPrice: number;
  exitPrice: number;
  pnl: number;
  pnlPercent: number;
  oiSignal: "PUT_OI_UP" | "CALL_OI_UP";
  breakoutType: "RESISTANCE" | "SUPPORT";
  status: "WIN" | "LOSS";
}

interface BacktestStats {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  profitFactor: number;
  totalReturn: number;
  maxDrawdown: number;
}

// Mock backtest data generator
const generateMockBacktestResults = (symbol: string, days: number): BacktestResult[] => {
  const results: BacktestResult[] = [];
  const now = new Date();
  
  for (let i = 0; i < Math.min(days, 20); i++) {
    const isWin = Math.random() > 0.4; // 60% win rate
    const entryPrice = 100 + Math.random() * 500;
    const changePercent = isWin 
      ? 3 + Math.random() * 8 
      : -(2 + Math.random() * 5);
    const exitPrice = entryPrice * (1 + changePercent / 100);
    
    results.push({
      symbol: symbol || ["RELIANCE", "TCS", "INFY", "HDFCBANK", "ICICIBANK"][Math.floor(Math.random() * 5)],
      entryDate: new Date(now.getTime() - (days - i) * 86400000).toISOString().split('T')[0],
      exitDate: new Date(now.getTime() - (days - i - 1) * 86400000).toISOString().split('T')[0],
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      exitPrice: parseFloat(exitPrice.toFixed(2)),
      pnl: parseFloat((exitPrice - entryPrice).toFixed(2)),
      pnlPercent: parseFloat(changePercent.toFixed(2)),
      oiSignal: Math.random() > 0.5 ? "PUT_OI_UP" : "CALL_OI_UP",
      breakoutType: Math.random() > 0.5 ? "RESISTANCE" : "SUPPORT",
      status: isWin ? "WIN" : "LOSS",
    });
  }
  
  return results.sort((a, b) => new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime());
};

const calculateStats = (results: BacktestResult[]): BacktestStats => {
  const wins = results.filter(r => r.status === "WIN");
  const losses = results.filter(r => r.status === "LOSS");
  
  const avgWin = wins.length > 0 ? wins.reduce((sum, r) => sum + r.pnlPercent, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((sum, r) => sum + Math.abs(r.pnlPercent), 0) / losses.length : 0;
  
  const totalProfit = wins.reduce((sum, r) => sum + r.pnl, 0);
  const totalLoss = losses.reduce((sum, r) => sum + Math.abs(r.pnl), 0);
  
  return {
    totalTrades: results.length,
    wins: wins.length,
    losses: losses.length,
    winRate: results.length > 0 ? (wins.length / results.length) * 100 : 0,
    avgWin: parseFloat(avgWin.toFixed(2)),
    avgLoss: parseFloat(avgLoss.toFixed(2)),
    profitFactor: totalLoss > 0 ? parseFloat((totalProfit / totalLoss).toFixed(2)) : totalProfit > 0 ? 999 : 0,
    totalReturn: parseFloat(results.reduce((sum, r) => sum + r.pnlPercent, 0).toFixed(2)),
    maxDrawdown: parseFloat((Math.random() * 15).toFixed(2)),
  };
};

export default function BacktestPage() {
  const [symbol, setSymbol] = useState("RELIANCE");
  const [days, setDays] = useState("30");
  const [oiThreshold, setOiThreshold] = useState("10");
  const [breakoutThreshold, setBreakoutThreshold] = useState("2");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BacktestResult[] | null>(null);
  const [stats, setStats] = useState<BacktestStats | null>(null);

  const runBacktest = async () => {
    setLoading(true);
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const mockResults = generateMockBacktestResults(symbol, parseInt(days));
    setResults(mockResults);
    setStats(calculateStats(mockResults));
    setLoading(false);
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

      {/* Parameters */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-400" />
            Backtest Parameters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
            <div>
              <label className="text-sm text-slate-400 mb-2 block">OI Change Threshold (%)</label>
              <Input
                type="number"
                value={oiThreshold}
                onChange={(e) => setOiThreshold(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="text-sm text-slate-400 mb-2 block">Breakout Threshold (%)</label>
              <Input
                type="number"
                value={breakoutThreshold}
                onChange={(e) => setBreakoutThreshold(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center gap-4">
            <Button 
              onClick={runBacktest} 
              disabled={loading}
              className="bg-blue-500 hover:bg-blue-600"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Running Backtest...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Run Backtest
                </>
              )}
            </Button>
            <span className="text-sm text-slate-500">
              Simulates {days} days of trading with OI confirmation
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {stats && (
        <>
          {/* Stats Grid */}
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

          {/* Detailed Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Winning Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.wins}</div>
                <div className="text-sm text-slate-400">Avg Win: +{stats.avgWin}%</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
                  <TrendingDown className="w-4 h-4" />
                  Losing Trades
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{stats.losses}</div>
                <div className="text-sm text-slate-400">Avg Loss: -{stats.avgLoss}%</div>
              </CardContent>
            </Card>
          </div>

          {/* Trades Table */}
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">Symbol</TableHead>
                      <TableHead className="text-slate-400">Signal</TableHead>
                      <TableHead className="text-slate-400">Entry</TableHead>
                      <TableHead className="text-slate-400">Exit</TableHead>
                      <TableHead className="text-slate-400">P&L</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results?.map((trade, index) => (
                      <TableRow key={index} className="border-slate-800">
                        <TableCell className="text-slate-300">{trade.entryDate}</TableCell>
                        <TableCell className="font-semibold text-white">{trade.symbol}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge className={trade.oiSignal === "PUT_OI_UP" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                              {trade.oiSignal === "PUT_OI_UP" ? "Put OI ↑" : "Call OI ↑"}
                            </Badge>
                            <span className="text-xs text-slate-500">{trade.breakoutType}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-300">₹{trade.entryPrice}</TableCell>
                        <TableCell className="text-slate-300">₹{trade.exitPrice}</TableCell>
                        <TableCell className={trade.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                          <div className="flex items-center gap-1">
                            {trade.pnl >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                            {trade.pnlPercent}%
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={trade.status === "WIN" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                            {trade.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

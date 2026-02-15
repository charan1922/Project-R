'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3, Activity, Building2 } from 'lucide-react';
import Link from 'next/link';

interface Trade {
  Date: string;
  Symbol: string;
  Option_Type: string;
  Strike: string;
  Expiry: string;
  Qty: string;
  Avg_Price: string;
  LTP: string;
  P_L: string;
  Daily_Total_PnL: string;
  Verification_Timestamp: string;
  Page: number;
}

interface DailySummary {
  date: string;
  totalPnL: string;
  timestamp: string;
  numTrades: number;
  trades: Trade[];
}

interface Data {
  totalTrades: number;
  totalDays: number;
  extractedAt: string;
  trades: Trade[];
  dailySummaries: DailySummary[];
}

// Sample data for initial render
const sampleData: Data = {
  totalTrades: 0,
  totalDays: 0,
  extractedAt: new Date().toISOString(),
  trades: [],
  dailySummaries: []
};

export default function Dashboard() {
  const [data, setData] = useState<Data>(sampleData);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Load data on mount
  useMemo(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then((d: Data) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const totalPnL = data.trades.reduce((sum, t) => sum + (parseFloat(t.P_L) || 0), 0);
    const winningTrades = data.trades.filter(t => parseFloat(t.P_L) > 0).length;
    const losingTrades = data.trades.filter(t => parseFloat(t.P_L) < 0).length;
    const winningDays = data.dailySummaries.filter(s => parseFloat(s.totalPnL) > 0).length;
    const losingDays = data.dailySummaries.filter(s => parseFloat(s.totalPnL) < 0).length;
    
    const symbolCount: Record<string, number> = {};
    data.trades.forEach(t => { symbolCount[t.Symbol] = (symbolCount[t.Symbol] || 0) + 1; });
    const topSymbols = Object.entries(symbolCount).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    return { totalPnL, winningTrades, losingTrades, winningDays, losingDays, topSymbols };
  }, [data]);

  const filteredTrades = useMemo(() => {
    if (!searchQuery) return data.trades;
    const q = searchQuery.toLowerCase();
    return data.trades.filter(t => 
      t.Symbol.toLowerCase().includes(q) ||
      t.Date.includes(q) ||
      t.Option_Type.toLowerCase().includes(q)
    );
  }, [data.trades, searchQuery]);

  const formatCurrency = (val: string | number) => {
    const num = typeof val === 'string' ? parseFloat(val) || 0 : val;
    return `₹${num.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="text-zinc-400">Loading trading data...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Sensibull Trading Dashboard
            </h1>
            <p className="text-zinc-400">
              {data.totalDays} Days Verified P&L • {data.totalTrades} Total Trades
            </p>
          </div>
          <Link 
            href="/stocks" 
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors"
          >
            <Building2 className="w-5 h-5" />
            <span>View All Stocks</span>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total P&L</CardTitle>
              <DollarSign className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.totalPnL)}
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.totalPnL >= 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
                {' '}Overall Performance
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Total Trades</CardTitle>
              <Activity className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{data.totalTrades}</div>
              <p className="text-xs text-zinc-500 mt-1">
                <span className="text-green-400">{stats.winningTrades}</span> Wins • 
                <span className="text-red-400"> {stats.losingTrades}</span> Losses
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Win Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">
                {data.totalTrades ? ((stats.winningTrades / data.totalTrades) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-xs text-zinc-500 mt-1">
                {stats.winningDays} winning days
              </p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900 border-zinc-800">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-zinc-400">Trading Days</CardTitle>
              <Calendar className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-zinc-100">{data.totalDays}</div>
              <p className="text-xs text-zinc-500 mt-1">
                <span className="text-green-400">{stats.winningDays}</span> profit • 
                <span className="text-red-400"> {stats.losingDays}</span> loss
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="trades" className="space-y-4">
          <TabsList className="bg-zinc-900 border-zinc-800">
            <TabsTrigger value="trades">All Trades</TabsTrigger>
            <TabsTrigger value="daily">Daily Summary</TabsTrigger>
            <TabsTrigger value="symbols">Top Symbols</TabsTrigger>
          </TabsList>

          <TabsContent value="trades" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-zinc-100">Trade History</CardTitle>
                  <Input
                    placeholder="Search by symbol, date..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-64 bg-zinc-950 border-zinc-800 text-zinc-100"
                  />
                </div>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-zinc-900">
                        <TableHead className="text-zinc-400">Date</TableHead>
                        <TableHead className="text-zinc-400">Symbol</TableHead>
                        <TableHead className="text-zinc-400">Type</TableHead>
                        <TableHead className="text-zinc-400">Strike</TableHead>
                        <TableHead className="text-zinc-400">Qty</TableHead>
                        <TableHead className="text-zinc-400">Avg</TableHead>
                        <TableHead className="text-zinc-400">LTP</TableHead>
                        <TableHead className="text-zinc-400">P&L</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrades.slice(0, 100).map((trade, i) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-300">{trade.Date}</TableCell>
                          <TableCell className="font-medium text-zinc-100">{trade.Symbol}</TableCell>
                          <TableCell>
                            <Badge variant={trade.Option_Type === 'CE' ? 'default' : trade.Option_Type === 'PE' ? 'destructive' : 'secondary'}>
                              {trade.Option_Type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-zinc-400">{trade.Strike || '-'}</TableCell>
                          <TableCell className="text-zinc-300">{trade.Qty}</TableCell>
                          <TableCell className="text-zinc-400">{formatCurrency(trade.Avg_Price)}</TableCell>
                          <TableCell className="text-zinc-400">{formatCurrency(trade.LTP)}</TableCell>
                          <TableCell className={parseFloat(trade.P_L) >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatCurrency(trade.P_L)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                {filteredTrades.length > 100 && (
                  <p className="text-center text-zinc-500 mt-4">
                    Showing 100 of {filteredTrades.length} trades
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="daily" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Daily Performance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-zinc-800">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-zinc-800 hover:bg-zinc-900">
                        <TableHead className="text-zinc-400">Date</TableHead>
                        <TableHead className="text-zinc-400">Trades</TableHead>
                        <TableHead className="text-zinc-400">Total P&L</TableHead>
                        <TableHead className="text-zinc-400">Verification</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.dailySummaries.map((day, i) => (
                        <TableRow key={i} className="border-zinc-800 hover:bg-zinc-800/50">
                          <TableCell className="text-zinc-300">{day.date}</TableCell>
                          <TableCell className="text-zinc-300">{day.numTrades}</TableCell>
                          <TableCell className={parseFloat(day.totalPnL) >= 0 ? 'text-green-400' : 'text-red-400'}>
                            {formatCurrency(day.totalPnL)}
                          </TableCell>
                          <TableCell className="text-zinc-500 text-sm">{day.timestamp}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="symbols" className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-zinc-100">Most Traded Symbols</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.topSymbols.map(([symbol, count]) => (
                    <div key={symbol} className="flex items-center justify-between p-4 rounded-lg bg-zinc-950 border border-zinc-800">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-zinc-300">
                          {symbol[0]}
                        </div>
                        <div>
                          <p className="font-medium text-zinc-100">{symbol}</p>
                          <p className="text-sm text-zinc-500">{count} trades</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-zinc-100">
                          {((count / data.totalTrades) * 100).toFixed(1)}%
                        </p>
                        <p className="text-xs text-zinc-500">of total</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Separator className="bg-zinc-800" />

        <footer className="text-center text-zinc-500 text-sm pb-4">
          Extracted on {new Date(data.extractedAt).toLocaleString()} • 
          <a href="/data.json" className="text-blue-400 hover:underline ml-1" download>Download JSON</a>
        </footer>
      </div>
    </div>
  );
}

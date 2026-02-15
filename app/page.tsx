'use client';

import { useState, useMemo, useEffect } from 'react';
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
import { TrendingUp, TrendingDown, Calendar, DollarSign, BarChart3, Activity } from 'lucide-react';

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

export default function Dashboard() {
  const [data, setData] = useState<Data>({
    totalTrades: 0,
    totalDays: 0,
    extractedAt: '',
    trades: [],
    dailySummaries: []
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/data.json')
      .then(res => res.json())
      .then((jsonData: Data) => {
        setData(jsonData);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load data:', err);
        setLoading(false);
      });
  }, []);

  const stats = useMemo(() => {
    const totalPnL = data.trades.reduce((sum, trade) => {
      const pnl = parseFloat(trade.P_L || '0');
      return sum + (isNaN(pnl) ? 0 : pnl);
    }, 0);

    const winningTrades = data.trades.filter(t => parseFloat(t.P_L || '0') > 0).length;
    const losingTrades = data.trades.filter(t => parseFloat(t.P_L || '0') < 0).length;
    const winRate = data.trades.length > 0 ? (winningTrades / data.trades.length) * 100 : 0;

    const winningDays = data.dailySummaries.filter(d => parseFloat(d.totalPnL || '0') > 0).length;
    const losingDays = data.dailySummaries.filter(d => parseFloat(d.totalPnL || '0') < 0).length;

    return {
      totalPnL,
      winningTrades,
      losingTrades,
      winRate,
      winningDays,
      losingDays
    };
  }, [data]);

  const topSymbols = useMemo(() => {
    const symbolMap = new Map<string, { trades: number; pnl: number }>();
    data.trades.forEach(trade => {
      const existing = symbolMap.get(trade.Symbol) || { trades: 0, pnl: 0 };
      existing.trades++;
      existing.pnl += parseFloat(trade.P_L || '0');
      symbolMap.set(trade.Symbol, existing);
    });
    return Array.from(symbolMap.entries())
      .sort((a, b) => b[1].trades - a[1].trades)
      .slice(0, 10);
  }, [data.trades]);

  const filteredTrades = useMemo(() => {
    if (!searchQuery) return data.trades;
    const query = searchQuery.toLowerCase();
    return data.trades.filter(trade =>
      trade.Symbol.toLowerCase().includes(query) ||
      trade.Date.includes(query) ||
      trade.Option_Type.toLowerCase().includes(query)
    );
  }, [data.trades, searchQuery]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400">
          {data.totalDays} Days Verified P&L • {data.totalTrades} Total Trades
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total P&L</CardTitle>
            <DollarSign className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {formatCurrency(stats.totalPnL)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.totalPnL >= 0 ? <TrendingUp className="inline h-3 w-3" /> : <TrendingDown className="inline h-3 w-3" />}
              {' '}Overall Performance
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Trades</CardTitle>
            <Activity className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.totalTrades}</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.winningTrades} Wins • {stats.losingTrades} Losses
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Win Rate</CardTitle>
            <BarChart3 className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{stats.winRate.toFixed(1)}%</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.winningDays} winning days
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Trading Days</CardTitle>
            <Calendar className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{data.totalDays}</div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.winningDays} profit • {stats.losingDays} loss
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="trades" className="w-full">
        <TabsList className="bg-slate-900 border-slate-800">
          <TabsTrigger value="trades">All Trades</TabsTrigger>
          <TabsTrigger value="daily">Daily Summary</TabsTrigger>
          <TabsTrigger value="symbols">Top Symbols</TabsTrigger>
        </TabsList>

        <TabsContent value="trades" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Trade History</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Search by symbol, date, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4 bg-slate-800 border-slate-700 text-white"
              />
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">Symbol</TableHead>
                      <TableHead className="text-slate-400">Type</TableHead>
                      <TableHead className="text-slate-400">Strike</TableHead>
                      <TableHead className="text-slate-400">Qty</TableHead>
                      <TableHead className="text-slate-400">Avg</TableHead>
                      <TableHead className="text-slate-400">LTP</TableHead>
                      <TableHead className="text-slate-400">P&L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.slice(0, 50).map((trade, index) => (
                      <TableRow key={index} className="border-slate-800">
                        <TableCell className="text-slate-300">{trade.Date}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="bg-slate-800 text-emerald-400">
                            {trade.Symbol}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-300">{trade.Option_Type}</TableCell>
                        <TableCell className="text-slate-300">{trade.Strike}</TableCell>
                        <TableCell className="text-slate-300">{trade.Qty}</TableCell>
                        <TableCell className="text-slate-300">{trade.Avg_Price}</TableCell>
                        <TableCell className="text-slate-300">{trade.LTP}</TableCell>
                        <TableCell className={parseFloat(trade.P_L || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(parseFloat(trade.P_L || '0'))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="daily" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Daily Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-slate-800">
                      <TableHead className="text-slate-400">Date</TableHead>
                      <TableHead className="text-slate-400">Trades</TableHead>
                      <TableHead className="text-slate-400">Total P&L</TableHead>
                      <TableHead className="text-slate-400">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...data.dailySummaries].reverse().map((day, index) => (
                      <TableRow key={index} className="border-slate-800">
                        <TableCell className="text-slate-300">{day.date}</TableCell>
                        <TableCell className="text-slate-300">{day.numTrades}</TableCell>
                        <TableCell className={parseFloat(day.totalPnL || '0') >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          {formatCurrency(parseFloat(day.totalPnL || '0'))}
                        </TableCell>
                        <TableCell>
                          {parseFloat(day.totalPnL || '0') >= 0 ? (
                            <Badge className="bg-emerald-500/20 text-emerald-400">Profit</Badge>
                          ) : (
                            <Badge className="bg-red-500/20 text-red-400">Loss</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="symbols" className="space-y-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-white">Top Traded Symbols</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {topSymbols.map(([symbol, stats]) => (
                  <div key={symbol} className="flex items-center justify-between p-4 rounded-lg bg-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <span className="font-bold text-emerald-400">{symbol[0]}</span>
                      </div>
                      <div>
                        <p className="font-semibold text-white">{symbol}</p>
                        <p className="text-sm text-slate-400">{stats.trades} trades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${stats.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(stats.pnl)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Separator className="bg-slate-800" />

      <footer className="text-center text-slate-500 text-sm pb-4">
        {data.extractedAt ? `Extracted on ${new Date(data.extractedAt).toLocaleString()}` : ''} •
        <a href="/data.json" className="text-emerald-400 hover:underline ml-1" download>Download JSON</a>
      </footer>
    </div>
  );
}

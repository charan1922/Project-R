"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Zap,
  ShieldCheck,
  Activity,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  BarChart3,
  Flame,
  Globe
} from "lucide-react";
import { Input } from "@/components/ui/input";
import Link from "next/link";

interface MarketSignal {
  symbol: string;
  compositeRFactor: number;
  regime: "Elephant" | "Cheetah" | "Hybrid" | "Defensive";
  isBlastTrade: boolean;
  zScores: {
    fut_turnover: number;
    fut_volume: number;
    opt_volume: number;
    eq_trade_size: number;
    oi_change: number;
    spread: number;
    pcr: number;
  };
  timestamp: string;
}

const Z_SCORE_BARS: { key: keyof MarketSignal['zScores']; label: string; hotThreshold: number }[] = [
  { key: 'spread', label: 'Spread', hotThreshold: 1.5 },
  { key: 'fut_turnover', label: 'Fut Turn', hotThreshold: 2 },
  { key: 'pcr', label: 'PCR', hotThreshold: 1.5 },
  { key: 'oi_change', label: 'OI Chg', hotThreshold: 1.5 },
  { key: 'eq_trade_size', label: 'Trade Size', hotThreshold: 1.5 },
  { key: 'fut_volume', label: 'Fut Vol', hotThreshold: 2 },
  { key: 'opt_volume', label: 'Opt Vol', hotThreshold: 2 },
];

export default function IntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"R-Factor" | "Fut-Turn" | "Symbol">("R-Factor");
  const [regimeFilter, setRegimeFilter] = useState<"ALL" | "Elephant" | "Cheetah" | "Hybrid">("ALL");

  const fetchSignals = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/r-factor?limit=50");
      const result = await res.json();
      if (result.success) {
        setSignals(result.data);
      } else {
        setError(result.error || "Failed to fetch signals");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSignals();
  }, []);

  const filteredSignals = useMemo(() => {
    return signals
      .filter(s => {
        const matchesSearch = s.symbol.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesRegime = regimeFilter === "ALL" || s.regime === regimeFilter;
        return matchesSearch && matchesRegime;
      })
      .sort((a, b) => {
        if (sortBy === "R-Factor") return b.compositeRFactor - a.compositeRFactor;
        if (sortBy === "Fut-Turn") return b.zScores.fut_turnover - a.zScores.fut_turnover;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [signals, searchQuery, sortBy, regimeFilter]);

  const stats = useMemo(() => {
    const blastCount = signals.filter(s => s.isBlastTrade).length;
    const elephantCount = signals.filter(s => s.regime === "Elephant").length;
    const cheetahCount = signals.filter(s => s.regime === "Cheetah").length;
    const hybridCount = signals.filter(s => s.regime === "Hybrid").length;
    const avgRFactor = signals.length > 0
      ? signals.reduce((acc, s) => acc + s.compositeRFactor, 0) / signals.length
      : 0;

    return { blastCount, elephantCount, cheetahCount, hybridCount, avgRFactor };
  }, [signals]);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Brain className="w-8 h-8 text-sky-400" />
            Market Intelligence
          </h1>
          <p className="text-slate-400">
            7-Factor Institutional Activity Detection via NSE F&O Bhavcopy
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchSignals}
            disabled={loading}
            className="bg-sky-600 hover:bg-sky-500"
          >
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
            Refresh Intelligence
          </Button>
        </div>
      </div>

      {/* Intelligence Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Blast Trades</span>
              <Flame className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-bold text-emerald-400">{stats.blastCount}</div>
            <p className="text-xs text-slate-500 mt-1">Composite R &ge; 2.5</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-sky-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Elephants</span>
              <Globe className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-400">{stats.elephantCount}</div>
            <p className="text-xs text-slate-500 mt-1">Heavy OI accumulation + turnover</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Cheetahs</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.cheetahCount}</div>
            <p className="text-xs text-slate-500 mt-1">High spread + futures volume</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Avg R-Factor</span>
              <BarChart3 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.avgRFactor.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Market activity baseline</p>
          </CardContent>
        </Card>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-900/50 p-4 rounded-lg border border-slate-800">
        <div className="flex flex-1 items-center gap-3 w-full md:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <Input
              placeholder="Search symbol..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
              className="pl-9 bg-slate-950 border-slate-800 text-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <div className="flex gap-1">
              {["ALL", "Elephant", "Cheetah", "Hybrid"].map((r) => (
                <Button
                  key={r}
                  size="sm"
                  variant={regimeFilter === r ? "secondary" : "ghost"}
                  onClick={() => setRegimeFilter(r as any)}
                  className="text-xs px-3 h-8"
                >
                  {r}
                </Button>
              ))}
            </div>
          </div>
          <div className="h-6 w-px bg-slate-800 hidden md:block" />
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-sm text-slate-300 focus:outline-none"
            >
              <option value="R-Factor">Sort by R-Factor</option>
              <option value="Fut-Turn">Sort by Fut Turnover Z</option>
              <option value="Symbol">Sort by Symbol</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Grid */}
      {error && (
        <div className="p-6 text-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-400">
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSignals.map((signal) => (
            <Card key={signal.symbol} className="bg-slate-900 border-slate-800 hover:border-sky-500/30 transition-all group overflow-hidden">
              <div className={`h-1 w-full ${
                signal.compositeRFactor > 2 ? 'bg-emerald-500' :
                signal.compositeRFactor > 1 ? 'bg-sky-500' : 'bg-slate-700'
              }`} />
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-sky-400 transition-colors">
                      {signal.symbol}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="outline" className={`text-[10px] ${
                        signal.regime === 'Cheetah' ? 'border-amber-500/50 text-amber-500' :
                        signal.regime === 'Elephant' ? 'border-sky-500/50 text-sky-500' :
                        signal.regime === 'Hybrid' ? 'border-purple-500/50 text-purple-500' :
                        'border-slate-700 text-slate-500'
                      }`}>
                        {signal.regime}
                      </Badge>
                      {signal.isBlastTrade && (
                        <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] border border-emerald-500/50 animate-pulse">
                          BLAST
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${
                      signal.compositeRFactor > 1.5 ? 'text-emerald-400' : 'text-slate-300'
                    }`}>
                      {signal.compositeRFactor.toFixed(2)}
                    </div>
                    <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">R-Factor</div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 mt-2">
                  {Z_SCORE_BARS.map(({ key, label, hotThreshold }) => (
                    <div key={key} className="space-y-0.5">
                      <p className="text-[10px] text-slate-500 uppercase">{label} Z</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${signal.zScores[key] > hotThreshold ? 'bg-emerald-500' : signal.zScores[key] > 0 ? 'bg-sky-500' : 'bg-slate-600'}`}
                            style={{ width: `${Math.min(100, Math.max(0, (signal.zScores[key] / 4) * 100))}%` }}
                          />
                        </div>
                        <span className="text-xs font-mono text-slate-300 w-8 text-right">{signal.zScores[key].toFixed(1)}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-between items-center">
                  <span className="text-[10px] text-slate-600">
                    {new Date(signal.timestamp).toLocaleTimeString()}
                  </span>
                  <Link href={`/learning/r-factor-engine?symbol=${signal.symbol}`}>
                    <Button variant="ghost" size="sm" className="h-7 text-[10px] hover:text-sky-400">
                      Analyze Deeply
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && filteredSignals.length === 0 && (
        <div className="py-24 text-center border-2 border-dashed border-slate-800 rounded-xl">
          <Activity className="w-12 h-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-300">No signals detected</h3>
          <p className="text-slate-500 max-w-xs mx-auto mt-2">
            Try adjusting your filters or refresh to scan the market for institutional flow.
          </p>
        </div>
      )}

      {/* Logic Card */}
      <Card className="bg-sky-500/5 border-sky-500/20 mt-12">
        <CardContent className="p-4 flex gap-4 items-start">
          <ShieldCheck className="w-6 h-6 text-sky-400 flex-shrink-0 mt-1" />
          <div>
            <h4 className="font-bold text-sky-400">7-Factor Institutional Activity Model</h4>
            <p className="text-sm text-slate-400 mt-1">
              Compares today&apos;s F&amp;O activity vs 20-day average using a hybrid ratio+Z-score model across 7 factors:
              Spread Ratio (30%), Futures Turnover (20%), Put-Call Ratio (15%), OI Change (12%),
              Trade Size (10%), Futures Volume (8%), Options Volume (5%). Validated against 80 F&amp;O stocks.
              <strong> Elephants</strong> = heavy OI accumulation, <strong>Cheetahs</strong> = momentum breakouts,
              <strong> Hybrid</strong> = both. <strong>Blast Trade</strong> fires when composite R &ge; 2.0.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

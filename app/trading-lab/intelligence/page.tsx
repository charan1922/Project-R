"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  TrendingUp, 
  TrendingDown, 
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
  regime: "Elephant" | "Cheetah" | "Normal";
  isBlastTrade: boolean;
  zScores: {
    volume: number;
    oi: number;
    turnover: number;
    spread: number;
  };
  timestamp: string;
}

export default function IntelligenceDashboard() {
  const [loading, setLoading] = useState(true);
  const [signals, setSignals] = useState<MarketSignal[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"R-Factor" | "Z-Vol" | "Symbol">("R-Factor");
  const [regimeFilter, setRegimeFilter] = useState<"ALL" | "Elephant" | "Cheetah">("ALL");

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
        if (sortBy === "Z-Vol") return b.zScores.volume - a.zScores.volume;
        return a.symbol.localeCompare(b.symbol);
      });
  }, [signals, searchQuery, sortBy, regimeFilter]);

  const stats = useMemo(() => {
    const blastCount = signals.filter(s => s.isBlastTrade).length;
    const elephantCount = signals.filter(s => s.regime === "Elephant").length;
    const cheetahCount = signals.filter(s => s.regime === "Cheetah").length;
    const avgRFactor = signals.length > 0 
      ? signals.reduce((acc, s) => acc + s.compositeRFactor, 0) / signals.length 
      : 0;

    return { blastCount, elephantCount, cheetahCount, avgRFactor };
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
            Advanced R-Factor Analysis & Institutional Flow Tracking
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
            <p className="text-xs text-slate-500 mt-1">Institutional conviction signals</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-sky-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Elephants</span>
              <Globe className="w-4 h-4 text-sky-400" />
            </div>
            <div className="text-2xl font-bold text-sky-400">{stats.elephantCount}</div>
            <p className="text-xs text-slate-500 mt-1">Heavy liquidity participation</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Cheetahs</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-amber-400">{stats.cheetahCount}</div>
            <p className="text-xs text-slate-500 mt-1">High urgency breakouts</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-400">Avg R-Factor</span>
              <BarChart3 className="w-4 h-4 text-slate-500" />
            </div>
            <div className="text-2xl font-bold text-white">{stats.avgRFactor.toFixed(2)}</div>
            <p className="text-xs text-slate-500 mt-1">Market participation baseline</p>
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
              {["ALL", "Elephant", "Cheetah"].map((r) => (
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
              <option value="Z-Vol">Sort by Volume Z</option>
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
            <div key={i} className="h-48 rounded-lg bg-slate-900 border border-slate-800 animate-pulse" />
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
                        signal.regime === 'Elephant' ? 'border-sky-500/50 text-sky-500' : 'border-slate-700 text-slate-500'
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
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase">Volume Z</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${signal.zScores.volume > 2 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${Math.min(100, (signal.zScores.volume / 4) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-300">{signal.zScores.volume.toFixed(1)}σ</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase">OI Z</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${signal.zScores.oi > 1.5 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${Math.min(100, (signal.zScores.oi / 4) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-300">{signal.zScores.oi.toFixed(1)}σ</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase">Turnover Z</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${signal.zScores.turnover > 2 ? 'bg-emerald-500' : 'bg-sky-500'}`} 
                          style={{ width: `${Math.min(100, (signal.zScores.turnover / 4) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-300">{signal.zScores.turnover.toFixed(1)}σ</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-slate-500 uppercase">Spread Z</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${signal.zScores.spread > 1.5 ? 'bg-amber-500' : 'bg-sky-500'}`} 
                          style={{ width: `${Math.min(100, (signal.zScores.spread / 4) * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-300">{signal.zScores.spread.toFixed(1)}σ</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-800/50 flex justify-between items-center">
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
            <h4 className="font-bold text-sky-400">R-Factor Intelligence Logic</h4>
            <p className="text-sm text-slate-400 mt-1">
              The dashboard utilizes the **4-Factor Z-Score model** to normalize market participation. 
              **Elephants** indicate massive institutional accumulation, while **Cheetahs** represent 
              high-beta momentum breakouts. A **Blast Trade** is triggered when the Composite Score 
              exceeds 2.5 with supporting Volume and OI Z-scores.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

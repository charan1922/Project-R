"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RefreshCw, Play, TrendingUp, AlertCircle, Filter, ArrowUpDown, Trash2 } from "lucide-react";

export function MarketScanner() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [error, setError] = useState("");
  
  // Filter states
  const [blastOnly, setBlastOnly] = useState(false);
  const [selectedRegime, setSelectedRegime] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"R-Factor" | "Z-Vol" | "Symbol">("R-Factor");

  const runScan = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/r-factor?limit=30`);
      const result = await res.json();
      if (result.success) {
        setResults(result.data);
      } else {
        setError(result.error || "Scan failed");
      }
    } catch (err) {
      setError("Network error during scan");
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    let filtered = results.filter(sig => {
      const matchesBlast = blastOnly ? sig.isBlastTrade : true;
      const matchesRegime = selectedRegime === "ALL" ? true : sig.regime === selectedRegime;
      return matchesBlast && matchesRegime;
    });

    return filtered.sort((a, b) => {
      if (sortBy === "R-Factor") return b.compositeRFactor - a.compositeRFactor;
      if (sortBy === "Z-Vol") return b.zScores.volume - a.zScores.volume;
      return a.symbol.localeCompare(b.symbol);
    });
  }, [results, blastOnly, selectedRegime, sortBy]);

  return (
    <Card className="bg-slate-900 border-emerald-500/30">
      <CardHeader className="flex flex-col space-y-4">
        <div className="flex flex-row items-center justify-between">
          <CardTitle className="text-emerald-400 flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            F&O Market Scanner
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              size="sm"
              onClick={async () => {
                const res = await fetch('/api/cache', { method: 'DELETE' });
                const result = await res.json();
                if (result.success) alert('Cache cleared!');
              }}
              className="border-slate-700 text-slate-400 hover:text-red-400 hover:border-red-500/50 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Clear Cache
            </Button>
            <Button 
              onClick={runScan} 
              disabled={loading}
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-500 text-xs gap-2"
            >
              {loading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
              Run Scan
            </Button>
          </div>
        </div>

        {/* Filters & Sorting */}
        <div className="flex flex-wrap items-center gap-4 p-2 rounded-lg bg-slate-950 border border-slate-800">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-4">
            <Filter className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Filters</span>
          </div>
          
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="blast-only" 
              checked={blastOnly} 
              onCheckedChange={(checked) => setBlastOnly(!!checked)}
            />
            <label htmlFor="blast-only" className="text-xs text-slate-300 cursor-pointer">
              Blast Only
            </label>
          </div>

          <div className="flex gap-1">
            {["ALL", "Elephant", "Cheetah"].map((r) => (
              <button
                key={r}
                onClick={() => setSelectedRegime(r)}
                className={`px-2 py-1 rounded text-[10px] transition-colors ${
                  selectedRegime === r 
                    ? 'bg-sky-500/20 text-sky-400 border border-sky-500/50' 
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2 ml-auto pl-4 border-l border-slate-800">
            <ArrowUpDown className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] text-slate-500 uppercase font-bold">Sort:</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-900 text-xs text-slate-300 border border-slate-800 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="R-Factor">R-Factor</option>
              <option value="Z-Vol">Z-Vol</option>
              <option value="Symbol">Symbol</option>
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="p-3 mb-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {filteredResults.length > 0 ? (
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredResults.map((sig) => (
              <div 
                key={sig.symbol} 
                className="flex items-center justify-between p-3 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-bold text-slate-100">{sig.symbol}</p>
                    <span className="text-[10px] text-slate-600">|</span>
                    <span className={`text-xs font-mono font-bold ${sig.compositeRFactor > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      R: {sig.compositeRFactor.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono mt-1">
                    Vol: <span className={sig.zScores.volume > 2 ? 'text-emerald-400' : ''}>{sig.zScores.volume.toFixed(2)}σ</span> • 
                    Spr: <span className={sig.zScores.spread > 1.5 ? 'text-amber-400' : ''}>{sig.zScores.spread.toFixed(2)}σ</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                    sig.regime === 'Cheetah' ? 'border-amber-500/30 text-amber-500' : 'border-sky-500/30 text-sky-500'
                  }`}>
                    {sig.regime}
                  </Badge>
                  {sig.isBlastTrade && (
                    <Badge className="bg-emerald-500/20 text-emerald-400 text-[10px] px-1.5 py-0 border border-emerald-500/30 animate-pulse">BLAST</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : !loading && (
          <div className="py-12 text-center border-2 border-dashed border-slate-800 rounded-lg">
            <p className="text-slate-500 text-sm italic">
              {results.length > 0 ? "No stocks match your filters" : "Click 'Run Scan' to analyze top F&O symbols"}
            </p>
          </div>
        )}

        {loading && (
          <div className="py-12 text-center">
            <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto mb-2" />
            <p className="text-slate-400 text-sm animate-pulse">Analyzing NSE Order Flow...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

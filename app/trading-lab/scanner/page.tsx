"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Cpu, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Activity,
  Bell,
  RefreshCw,
  Target,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2
} from "lucide-react";

interface ScanResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  volume: number;
  totalCallOI: number;
  totalPutOI: number;
  putCallRatio: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: "STRONG" | "MODERATE" | "WEAK";
  timestamp: string;
}

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [lastScan, setLastScan] = useState<string>("");

  const scan = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/oi-data");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setResults(data.stocks);
      setLastScan(data.scannedAt);
    } catch (err) {
      setError("Failed to fetch live data. Please try again.");
      console.error("Scan error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scan();
    
    if (autoRefresh) {
      const interval = setInterval(scan, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const buySignals = results.filter(r => r.signal === "BUY");
  const sellSignals = results.filter(r => r.signal === "SELL");
  const strongSignals = results.filter(r => r.strength === "STRONG");

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Cpu className="w-8 h-8 text-emerald-400" />
            Live Scanner
          </h1>
          <p className="text-slate-400">
            Real-time OI + Breakout detection using live NSE data
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setAlertsEnabled(!alertsEnabled)}
            className={alertsEnabled ? "border-emerald-500 text-emerald-400" : ""}
          >
            <Bell className={`w-4 h-4 mr-2 ${alertsEnabled ? "fill-current" : ""}`} />
            Alerts {alertsEnabled ? "ON" : "OFF"}
          </Button>
          <Button
            variant="outline"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "border-blue-500 text-blue-400" : ""}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${autoRefresh ? "animate-spin" : ""}`} />
            Auto {autoRefresh ? "ON" : "OFF"}
          </Button>
          <Button onClick={scan} disabled={loading} className="bg-emerald-500 hover:bg-emerald-600">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Scan Now
          </Button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/30">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <p className="text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Signal Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-400">{buySignals.length}</div>
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Buy Signals
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{sellSignals.length}</div>
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" /> Sell Signals
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-400">{strongSignals.length}</div>
            <div className="text-sm text-slate-400">Strong Signals</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{results.length}</div>
            <div className="text-sm text-slate-400">Scanned</div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Logic Info */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Real-Time Scanner Criteria (Live NSE Data)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Price change &gt; 1.5%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Put/Call ratio analysis</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">OI data from option chain</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Live volume tracking</span>
            </div>
          </div>
          {lastScan && (
            <p className="mt-3 text-xs text-slate-500">
              Last updated: {new Date(lastScan).toLocaleString()}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Scan Results */}
      <div className="grid grid-cols-1 gap-4">
        {loading && results.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <Loader2 className="w-12 h-12 text-slate-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Fetching live NSE data...</p>
            </CardContent>
          </Card>
        ) : results.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <p className="text-slate-400">No data available. Please try scanning again.</p>
            </CardContent>
          </Card>
        ) : (
          results.map((result) => (
            <Card 
              key={result.symbol} 
              className={`bg-slate-900 border-slate-800 hover:border-slate-700 transition-colors ${
                result.signal !== "NEUTRAL" ? "border-l-4" : ""
              } ${result.signal === "BUY" ? "border-l-emerald-500" : result.signal === "SELL" ? "border-l-red-500" : ""}`}
            >
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  {/* Symbol & Name */}
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                      result.signal === "BUY" ? "bg-emerald-500/20" : 
                      result.signal === "SELL" ? "bg-red-500/20" : "bg-slate-800"
                    }`}>
                      <span className={`font-bold ${
                        result.signal === "BUY" ? "text-emerald-400" : 
                        result.signal === "SELL" ? "text-red-400" : "text-slate-400"
                      }`}>
                        {result.signal === "NEUTRAL" ? "-" : result.signal[0]}
                      </span>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{result.symbol}</h3>
                      <p className="text-sm text-slate-400">{result.name}</p>
                    </div>
                  </div>

                  {/* Price & Change */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="text-xl font-bold text-white">₹{result.price.toFixed(2)}</div>
                      <div className={`text-sm flex items-center gap-1 ${result.changePercent >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {result.changePercent >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {result.changePercent > 0 ? "+" : ""}{result.changePercent}%
                      </div>
                    </div>
                  </div>

                  {/* OI Data */}
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm text-slate-400">P/C Ratio</div>
                      <div className={`font-semibold ${result.putCallRatio > 1.2 ? "text-emerald-400" : result.putCallRatio < 0.8 ? "text-red-400" : "text-slate-300"}`}>
                        {result.putCallRatio.toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right text-xs">
                      <div className="text-slate-500">Call OI</div>
                      <div className="text-slate-400">{(result.totalCallOI / 1000000).toFixed(1)}M</div>
                      <div className="text-slate-500 mt-1">Put OI</div>
                      <div className="text-slate-400">{(result.totalPutOI / 1000000).toFixed(1)}M</div>
                    </div>
                  </div>

                  {/* Signal Badge */}
                  <div className="flex items-center gap-2">
                    {result.signal !== "NEUTRAL" && (
                      <Badge className={result.signal === "BUY" ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"}>
                        {result.signal}
                      </Badge>
                    )}
                    {result.strength === "STRONG" && (
                      <Badge className="bg-purple-500/20 text-purple-400">
                        Strong
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500">
                      <Clock className="w-3 h-3 inline mr-1" />
                      {new Date(result.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Legend */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-400">Signal Legend (Based on Live OI Data)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-300"><strong>BUY:</strong> Price up + P/C Ratio &gt; 1.2 (Put OI high)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-300"><strong>SELL:</strong> Price down + P/C Ratio &lt; 0.8 (Call OI high)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span className="text-slate-300"><strong>NEUTRAL:</strong> No clear OI signal</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

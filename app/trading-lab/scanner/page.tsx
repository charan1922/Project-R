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
  Clock
} from "lucide-react";

interface ScanResult {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  volumeAvg: number;
  putOiChange: number;
  callOiChange: number;
  signal: "BUY" | "SELL" | "NEUTRAL";
  strength: "STRONG" | "MODERATE" | "WEAK";
  breakoutLevel: number;
  timestamp: string;
}

// Mock scanner data
const generateMockScanResults = (): ScanResult[] => {
  const stocks = [
    { symbol: "RELIANCE", name: "Reliance Industries" },
    { symbol: "TCS", name: "Tata Consultancy" },
    { symbol: "INFY", name: "Infosys" },
    { symbol: "HDFCBANK", name: "HDFC Bank" },
    { symbol: "ICICIBANK", name: "ICICI Bank" },
    { symbol: "SBIN", name: "State Bank of India" },
    { symbol: "LT", name: "Larsen & Toubro" },
    { symbol: "ADANIENT", name: "Adani Enterprises" },
    { symbol: "AXISBANK", name: "Axis Bank" },
    { symbol: "MARUTI", name: "Maruti Suzuki" },
  ];
  
  return stocks.map(stock => {
    const changePercent = (Math.random() - 0.4) * 8; // -3.2% to +4.8%
    const putOiChange = Math.random() * 25;
    const callOiChange = Math.random() * 25;
    
    let signal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    let strength: "STRONG" | "MODERATE" | "WEAK" = "MODERATE";
    
    if (changePercent > 2 && putOiChange > 15) {
      signal = "BUY";
      strength = putOiChange > 20 ? "STRONG" : "MODERATE";
    } else if (changePercent < -2 && callOiChange > 15) {
      signal = "SELL";
      strength = callOiChange > 20 ? "STRONG" : "MODERATE";
    }
    
    return {
      symbol: stock.symbol,
      name: stock.name,
      price: 1000 + Math.random() * 3000,
      change: changePercent * 10,
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(1000000 + Math.random() * 5000000),
      volumeAvg: Math.floor(2000000 + Math.random() * 3000000),
      putOiChange: parseFloat(putOiChange.toFixed(1)),
      callOiChange: parseFloat(callOiChange.toFixed(1)),
      signal,
      strength,
      breakoutLevel: parseFloat((Math.random() * 5 + 2).toFixed(1)),
      timestamp: new Date().toLocaleTimeString(),
    };
  }).sort((a, b) => {
    // Sort by signal strength
    const signalOrder = { BUY: 0, SELL: 1, NEUTRAL: 2 };
    return signalOrder[a.signal] - signalOrder[b.signal];
  });
};

export default function ScannerPage() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alertsEnabled, setAlertsEnabled] = useState(false);

  const scan = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));
    setResults(generateMockScanResults());
    setLoading(false);
  };

  useEffect(() => {
    scan();
    
    if (autoRefresh) {
      const interval = setInterval(scan, 30000); // Refresh every 30 seconds
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
            Real-time detection of OI + Breakout opportunities
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
            {loading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Zap className="w-4 h-4 mr-2" />}
            Scan Now
          </Button>
        </div>
      </div>

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
            Scanner Criteria
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Price change &gt; 2%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">OI Change &gt; 15%</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Volume &gt; 1.5x average</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span className="text-slate-300">Breaks key level</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scan Results */}
      <div className="grid grid-cols-1 gap-4">
        {loading && results.length === 0 ? (
          <Card className="bg-slate-900 border-slate-800">
            <CardContent className="p-12 text-center">
              <RefreshCw className="w-12 h-12 text-slate-600 animate-spin mx-auto mb-4" />
              <p className="text-slate-400">Scanning market for OI + Breakout signals...</p>
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
                      <div className="text-sm text-slate-400">Put OI</div>
                      <div className={`font-semibold ${result.putOiChange > 15 ? "text-emerald-400" : "text-slate-300"}`}>
                        +{result.putOiChange}%
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-400">Call OI</div>
                      <div className={`font-semibold ${result.callOiChange > 15 ? "text-red-400" : "text-slate-300"}`}>
                        +{result.callOiChange}%
                      </div>
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
                      {result.timestamp}
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
          <CardTitle className="text-sm text-slate-400">Signal Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-emerald-500" />
              <span className="text-slate-300"><strong>BUY:</strong> Price up + Put OI up (Sellers bearish = Bullish)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-slate-300"><strong>SELL:</strong> Price down + Call OI up (Sellers bullish = Bearish)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-slate-600" />
              <span className="text-slate-300"><strong>NEUTRAL:</strong> No clear OI confirmation</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

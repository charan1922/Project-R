"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw, 
  Activity,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3
} from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  percentChange: number;
  open: number;
  high: number;
  low: number;
  close: number;
  sector: string;
  volume: number;
}

interface SectorInfo {
  stocks: Stock[];
  totalChange: number;
  upCount: number;
  downCount: number;
  avgChange: number;
}

interface MarketData {
  stocks: Stock[];
  sectorData: Record<string, SectorInfo>;
  totalFnOStocks: number;
  lastUpdated: string;
}

export default function SectorScopePage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/stocks");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-white text-xl flex items-center gap-3">
          <RefreshCw className="w-6 h-6 animate-spin" />
          Loading NSE F&O market data...
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-white text-xl">Failed to load market data</div>
      </div>
    );
  }

  const { sectorData, totalFnOStocks } = data;
  const sectors = Object.keys(sectorData).sort((a, b) => {
    // Sort by absolute performance (most volatile first)
    return Math.abs(sectorData[b].avgChange) - Math.abs(sectorData[a].avgChange);
  });

  // Filter sectors based on search
  const filteredSectors = sectors.filter((sector) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    if (sector.toLowerCase().includes(term)) return true;
    return sectorData[sector].stocks.some(
      (s) =>
        s.symbol.toLowerCase().includes(term) ||
        s.name.toLowerCase().includes(term)
    );
  });

  // Calculate market overview
  const totalStocks = data.stocks.length;
  const stocksUp = data.stocks.filter((s) => s.percentChange > 0).length;
  const stocksDown = data.stocks.filter((s) => s.percentChange < 0).length;
  const stocksUnchanged = totalStocks - stocksUp - stocksDown;

  // Get top movers
  const topGainers = [...data.stocks]
    .filter(s => s.percentChange > 0)
    .sort((a, b) => b.percentChange - a.percentChange)
    .slice(0, 5);
    
  const topLosers = [...data.stocks]
    .filter(s => s.percentChange < 0)
    .sort((a, b) => a.percentChange - b.percentChange)
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <PieChart className="w-8 h-8 text-emerald-400" />
            F&O Sector Scope
          </h1>
          <p className="text-slate-400">
            Live NSE Futures & Options market • {totalFnOStocks}+ F&O stocks
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </div>
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-400">{stocksUp}</div>
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-4 h-4" /> Advancing
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-400">{stocksDown}</div>
            <div className="text-sm text-slate-400 flex items-center gap-1">
              <TrendingDown className="w-4 h-4" /> Declining
            </div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-slate-400">{stocksUnchanged}</div>
            <div className="text-sm text-slate-400">Unchanged</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">{sectors.length}</div>
            <div className="text-sm text-slate-400">Sectors</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-400">{totalFnOStocks}+</div>
            <div className="text-sm text-slate-400">F&O Stocks</div>
          </CardContent>
        </Card>
      </div>

      {/* Top Movers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top Gainers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topGainers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                  <div>
                    <span className="font-semibold text-white">{stock.symbol}</span>
                    <span className="text-xs text-slate-400 ml-2">{stock.sector}</span>
                  </div>
                  <span className="text-emerald-400 font-medium">+{stock.percentChange.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-400 flex items-center gap-2">
              <TrendingDown className="w-4 h-4" />
              Top Losers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topLosers.map((stock) => (
                <div key={stock.symbol} className="flex items-center justify-between p-2 rounded bg-slate-800/50">
                  <div>
                    <span className="font-semibold text-white">{stock.symbol}</span>
                    <span className="text-xs text-slate-400 ml-2">{stock.sector}</span>
                  </div>
                  <span className="text-red-400 font-medium">{stock.percentChange.toFixed(2)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search F&O stocks or sectors..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 bg-slate-800 border-slate-700 text-white"
        />
      </div>

      {/* Sector Heatmap */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            Sector Performance Heatmap
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {filteredSectors.map((sector) => {
              const info = sectorData[sector];
              const isPositive = info.avgChange >= 0;
              const intensity = Math.min(Math.abs(info.avgChange) / 2, 1);
              
              return (
                <button
                  key={sector}
                  onClick={() => setSelectedSector(selectedSector === sector ? null : sector)}
                  className={`p-3 rounded-lg border transition-all text-left ${
                    selectedSector === sector
                      ? "border-emerald-500 ring-1 ring-emerald-500"
                      : "border-slate-700 hover:border-slate-600"
                  }`}
                  style={{
                    backgroundColor: isPositive
                      ? `rgba(16, 185, 129, ${0.1 + intensity * 0.3})`
                      : `rgba(239, 68, 68, ${0.1 + intensity * 0.3})`,
                  }}
                >
                  <div className="text-xs font-medium text-slate-300 uppercase truncate">
                    {sector}
                  </div>
                  <div className={`text-lg font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                    {info.avgChange >= 0 ? "+" : ""}
                    {info.avgChange.toFixed(2)}%
                  </div>
                  <div className="text-xs text-slate-500">
                    {info.stocks.length} stocks
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Sector Details */}
      {(selectedSector ? [selectedSector] : filteredSectors).map((sector) => {
        const info = sectorData[sector];
        const filteredStocks = info.stocks.filter(
          (stock) =>
            !searchTerm ||
            stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            stock.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        if (filteredStocks.length === 0) return null;

        return (
          <Card key={sector} className="bg-slate-900 border-slate-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg text-white flex items-center gap-3">
                  {sector}
                  <Badge
                    variant="secondary"
                    className={`${
                      info.avgChange >= 0
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {info.avgChange >= 0 ? "+" : ""}
                    {info.avgChange.toFixed(2)}%
                  </Badge>
                </CardTitle>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ArrowUpRight className="w-4 h-4" />
                    {info.upCount} Up
                  </span>
                  <span className="text-red-400 flex items-center gap-1">
                    <ArrowDownRight className="w-4 h-4" />
                    {info.downCount} Down
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {filteredStocks
                  .sort((a, b) => b.percentChange - a.percentChange)
                  .map((stock) => (
                    <div
                      key={stock.symbol}
                      className="p-3 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-white">{stock.symbol}</span>
                        <span
                          className={`text-sm font-medium ${
                            stock.percentChange >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {stock.percentChange >= 0 ? "+" : ""}
                          {stock.percentChange.toFixed(2)}%
                        </span>
                      </div>
                      <div className="text-xs text-slate-400 truncate mb-2">
                        {stock.name}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-300">₹{stock.price.toFixed(2)}</span>
                        <span
                          className={`text-xs ${
                            stock.change >= 0 ? "text-emerald-400" : "text-red-400"
                          }`}
                        >
                          {stock.change >= 0 ? "+" : ""}₹{stock.change.toFixed(2)}
                        </span>
                      </div>
                      <div className="mt-2 h-1 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${stock.percentChange >= 0 ? "bg-emerald-500" : "bg-red-500"}`}
                          style={{
                            width: `${Math.min(Math.abs(stock.percentChange) * 5, 100)}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Last Updated */}
      <div className="text-center text-slate-500 text-sm pb-4">
        Last updated: {new Date(data.lastUpdated).toLocaleString()}
        <span className="mx-2">•</span>
        Auto-refreshes every 60 seconds
        <span className="mx-2">•</span>
        Data source: NSE India
      </div>
    </div>
  );
}

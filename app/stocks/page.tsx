"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, TrendingUp, Search, ArrowUpRight, ArrowDownRight } from "lucide-react";

interface Stock {
  symbol: string;
  name: string;
  sector: string;
  exchange: string;
  tradeCount: number;
  totalPnL: number;
  firstTrade: string | null;
  lastTrade: string | null;
}

interface StocksData {
  stocks: Stock[];
  metadata: {
    totalStocks: number;
    totalTrades: number;
    stocksWithTrades: number;
    lastUpdated: string;
    source: string;
    pages: number;
  };
}

export default function StocksPage() {
  const [stocksData, setStocksData] = useState<StocksData | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSector, setSelectedSector] = useState<string>("all");

  useEffect(() => {
    fetch("/unified_stocks.json")
      .then((res) => res.json())
      .then((data) => setStocksData(data))
      .catch((err) => console.error("Failed to load stocks:", err));
  }, []);

  if (!stocksData) {
    return (
      <div className="p-6 flex items-center justify-center h-screen">
        <div className="text-white text-xl">Loading stocks...</div>
      </div>
    );
  }

  const { stocks, metadata } = stocksData;

  const sectors = [...new Set(stocks.map((s) => s.sector))].sort();

  const filteredStocks = stocks.filter((stock) => {
    const matchesSearch =
      searchTerm === "" ||
      stock.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
      stock.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSector =
      selectedSector === "all" || stock.sector === selectedSector;
    return matchesSearch && matchesSector;
  });

  const totalPnL = stocks.reduce((sum, s) => sum + s.totalPnL, 0);
  const profitableStocks = stocks.filter(s => s.totalPnL > 0).length;
  const lossStocks = stocks.filter(s => s.totalPnL < 0).length;

  const groupedBySector = filteredStocks.reduce((acc, stock) => {
    if (!acc[stock.sector]) acc[stock.sector] = [];
    acc[stock.sector].push(stock);
    return acc;
  }, {} as Record<string, Stock[]>);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Building2 className="w-8 h-8 text-emerald-400" />
          Stocks Universe
        </h1>
        <p className="text-slate-400">
          {metadata.stocksWithTrades} stocks traded across {metadata.totalTrades} trades
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-emerald-400">
              {metadata.totalStocks}
            </div>
            <div className="text-sm text-slate-400">Total Stocks</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-400">
              {metadata.totalTrades}
            </div>
            <div className="text-sm text-slate-400">Total Trades</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              ₹{(totalPnL / 100000).toFixed(1)}L
            </div>
            <div className="text-sm text-slate-400">Total P&L</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-400">
              {sectors.length}
            </div>
            <div className="text-sm text-slate-400">Sectors</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="p-4">
            <div className="text-lg font-bold text-amber-400">
              {profitableStocks}/{lossStocks}
            </div>
            <div className="text-sm text-slate-400">Profit/Loss</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search stocks by symbol or name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <select
              value={selectedSector}
              onChange={(e) => setSelectedSector(e.target.value)}
              className="px-4 py-2 rounded-md bg-slate-800 border border-slate-700 text-white"
            >
              <option value="all">All Sectors</option>
              {sectors.map((sector) => (
                <option key={sector} value={sector}>
                  {sector}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Top Traded Stocks */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Most Traded Stocks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {stocks.slice(0, 10).map((stock) => (
              <div
                key={stock.symbol}
                className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-emerald-400">{stock.symbol}</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400">
                    {stock.tradeCount}
                  </Badge>
                </div>
                <div className="text-xs text-slate-400 mt-1 truncate">{stock.name}</div>
                <div className={`text-sm font-medium mt-1 ${stock.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  ₹{stock.totalPnL.toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stocks by Sector */}
      <div className="space-y-6">
        {Object.entries(groupedBySector)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([sector, sectorStocks]) => (
            <Card key={sector} className="bg-slate-900 border-slate-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  {sector}
                  <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                    {sectorStocks.length} stocks
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {sectorStocks.map((stock) => (
                    <div
                      key={stock.symbol}
                      className="p-3 rounded-lg bg-slate-800 border border-slate-700 hover:border-emerald-500/50 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-emerald-400">{stock.symbol}</span>
                        {stock.tradeCount > 0 && (
                          <Badge className="bg-slate-700 text-xs">
                            {stock.tradeCount}
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-slate-300 truncate">{stock.name}</div>
                      {stock.tradeCount > 0 && (
                        <div className={`text-xs font-medium mt-1 flex items-center gap-1 ${
                          stock.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'
                        }`}>
                          {stock.totalPnL >= 0 ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          ₹{Math.abs(stock.totalPnL).toLocaleString()}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Complete Stock List Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white">Complete Stock List ({filteredStocks.length} stocks)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="pb-3 text-slate-400 font-medium">#</th>
                  <th className="pb-3 text-slate-400 font-medium">Symbol</th>
                  <th className="pb-3 text-slate-400 font-medium">Company Name</th>
                  <th className="pb-3 text-slate-400 font-medium">Sector</th>
                  <th className="pb-3 text-slate-400 font-medium text-right">Trades</th>
                  <th className="pb-3 text-slate-400 font-medium text-right">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock, index) => (
                  <tr
                    key={stock.symbol}
                    className="border-b border-slate-800/50 hover:bg-slate-800/30"
                  >
                    <td className="py-3 text-slate-500">{index + 1}</td>
                    <td className="py-3">
                      <span className="font-semibold text-emerald-400">
                        {stock.symbol}
                      </span>
                    </td>
                    <td className="py-3 text-white">{stock.name}</td>
                    <td className="py-3">
                      <Badge variant="secondary" className="bg-slate-800 text-slate-300">
                        {stock.sector}
                      </Badge>
                    </td>
                    <td className="py-3 text-right">
                      {stock.tradeCount > 0 ? (
                        <span className="text-emerald-400">{stock.tradeCount}</span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                    <td className="py-3 text-right">
                      {stock.tradeCount > 0 ? (
                        <span className={stock.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                          ₹{stock.totalPnL.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

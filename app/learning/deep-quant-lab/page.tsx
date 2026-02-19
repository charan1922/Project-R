"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Zap, TrendingUp, TrendingDown, AlertTriangle, Minus } from "lucide-react";

const stockCards = [
  {
    symbol: "PNB",
    name: "Punjab National Bank",
    subtitle: "Mega Cap - High Liquidity",
    regime: "Elephant",
    rFactor: 1.88,
    price: "+2.97%",
    priceDirection: "up" as const,
    zScores: { vol: 1.9, turn: 2.1, oi: 1.5, spread: 1.2 },
    signal: "Bull Blast",
    signalColor: "bg-emerald-500 text-emerald-50",
    badge: "High Conviction",
    badgeColor: "bg-sky-500/20 text-sky-400",
    narrative:
      'The Elephant Move. High liquidity stock moving at 1.88x Volume Velocity. Requires ~264 Cr Net Inflow. The price trend (+2.97%) perfectly matches volume accumulation.',
  },
  {
    symbol: "DIXON",
    name: "Dixon Technologies",
    subtitle: "Low Float - Volatile",
    regime: "Cheetah",
    rFactor: 1.42,
    price: "-2.12%",
    priceDirection: "down" as const,
    zScores: { vol: 1.2, turn: 2.8, oi: 1.1, spread: 2.5 },
    signal: "Bear Blast",
    signalColor: "bg-red-500 text-red-50",
    badge: "Alpha Signal",
    badgeColor: "bg-amber-500/20 text-amber-400",
    narrative:
      'Liquidity Paradox. R-Factor 1.42 is massive for low float. Implies 68 Cr dump in 45 mins. Price dropping faster than volume indicates limit order pulling (Panic).',
  },
  {
    symbol: "AUROPHARMA",
    name: "Aurobindo Pharma",
    subtitle: "Mid Cap - F&O",
    regime: "Normal",
    rFactor: 2.78,
    price: "-2.64%",
    priceDirection: "down" as const,
    zScores: { vol: 2.9, turn: 2.5, oi: 3.5, spread: 2.0 },
    signal: "Crash",
    signalColor: "bg-red-600 text-red-50",
    badge: "3-Sigma Event",
    badgeColor: "bg-indigo-500/20 text-indigo-400",
    narrative:
      'Total Liquidation. Volume Z-Score approaching 3-Sigma. Massive short buildup (OI Z-Score 3.5). The flatline at the end while price recovered slightly suggests short covering.',
  },
  {
    symbol: "HCLTECH",
    name: "HCL Technologies",
    subtitle: "Large Cap - Tech",
    regime: "Normal",
    rFactor: 0.88,
    price: "+0.12%",
    priceDirection: "neutral" as const,
    zScores: { vol: 0.8, turn: 0.9, oi: 0.5, spread: 1.0 },
    signal: "Sleeping",
    signalColor: "bg-slate-600 text-slate-200",
    badge: "Trap Zone",
    badgeColor: "bg-slate-600/20 text-slate-400",
    narrative:
      'The Static Trap. R-Factor stuck at 0.88 for 30 mins. This indicates HFT algorithms maintaining VWAP with no new institutional money entering. Avoid.',
  },
];

const summaryCards = [
  { label: "Top Blast (Bull)", value: "HDFCLIFE", rFactor: "R: 3.15", change: "+2.93%", changeColor: "text-emerald-400" },
  { label: "Top Blast (Bear)", value: "AUROPHARMA", rFactor: "R: 2.78", change: "-2.64%", changeColor: "text-red-400" },
  { label: "Elephant Signal", value: "PNB", rFactor: "R: 1.88", change: "+2.97%", changeColor: "text-emerald-400" },
  { label: "Market Phase", value: "Phase 3", rFactor: "Liquidation/Close", change: "2:37 PM", changeColor: "text-slate-400" },
];

export default function DeepQuantLabPage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Deep Quant Forensic Lab</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Zap className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-100">Forensic Market Lab</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
              4-Factor Z-Score Strategy - Feb 2026 Data
            </p>
          </div>
        </div>
        <p className="text-slate-400 max-w-2xl">
          Real-time analysis of specific tickers from February 2026 data. Detecting institutional
          footprints using the 4-Factor Z-Score Model.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <Card key={card.label} className="bg-slate-900 border-slate-800">
            <CardContent className="p-4">
              <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">
                {card.label}
              </div>
              <div className="text-2xl font-bold text-slate-100 mt-1">{card.value}</div>
              <div className="flex justify-between items-end mt-2">
                <span className="text-sm font-mono text-sky-400 bg-sky-500/10 px-1.5 rounded">
                  {card.rFactor}
                </span>
                <span className={`text-sm font-bold ${card.changeColor}`}>{card.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {stockCards.map((stock) => (
          <Card
            key={stock.symbol}
            className={`bg-slate-900 border-slate-800 hover:border-slate-700 transition-all ${
              stock.rFactor < 1.0 ? "opacity-70" : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                      stock.priceDirection === "up"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : stock.priceDirection === "down"
                        ? "bg-red-500/10 text-red-400"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    {stock.symbol[0]}
                  </div>
                  <div>
                    <CardTitle className="text-slate-100">{stock.symbol}</CardTitle>
                    <span className="text-xs text-slate-500 font-mono">{stock.subtitle}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      stock.priceDirection === "up"
                        ? "text-emerald-400"
                        : stock.priceDirection === "down"
                        ? "text-red-400"
                        : "text-slate-400"
                    }`}
                  >
                    {stock.price}
                  </div>
                  <div className="text-xs font-mono text-slate-500">
                    R-Factor: {stock.rFactor}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${stock.signalColor}`}
                >
                  {stock.signal}
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-1 rounded uppercase tracking-wide ${stock.badgeColor}`}
                >
                  {stock.badge}
                </span>
              </div>
              <p className="text-sm text-slate-400 leading-relaxed">{stock.narrative}</p>

              {/* Z-Score Breakdown */}
              <div className="mt-4 grid grid-cols-4 gap-2">
                {Object.entries(stock.zScores).map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-slate-800 rounded-lg p-2 text-center"
                  >
                    <div className="text-xs text-slate-500 uppercase">
                      {key === "vol"
                        ? "Vol"
                        : key === "turn"
                        ? "Turn"
                        : key === "oi"
                        ? "OI"
                        : "Spread"}
                    </div>
                    <div
                      className={`text-sm font-mono font-bold ${
                        value >= 2.0
                          ? "text-red-400"
                          : value >= 1.5
                          ? "text-amber-400"
                          : "text-slate-300"
                      }`}
                    >
                      {value.toFixed(1)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Strategy Logic */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Strategy Logic: The 4-Factor Engine</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-sky-500/5 border border-sky-500/10 p-4 rounded-lg">
              <div className="font-bold text-sky-400 text-sm">1. Volume Velocity (40%)</div>
              <p className="text-xs text-slate-400 mt-1">
                Normalized quantity of shares compared to historic time-bucket median.
              </p>
            </div>
            <div className="bg-indigo-500/5 border border-indigo-500/10 p-4 rounded-lg">
              <div className="font-bold text-indigo-400 text-sm">2. Turnover Intensity (30%)</div>
              <p className="text-xs text-slate-400 mt-1">
                {'Capital flow (P x V). Equalizes "Heavy" vs "Light" stocks like Dixon.'}
              </p>
            </div>
            <div className="bg-violet-500/5 border border-violet-500/10 p-4 rounded-lg">
              <div className="font-bold text-violet-400 text-sm">3. OI Aggression (20%)</div>
              <p className="text-xs text-slate-400 mt-1">
                {'Creation of new positions. Filters retail scalping noise.'}
              </p>
            </div>
            <div className="bg-amber-500/5 border border-amber-500/10 p-4 rounded-lg">
              <div className="font-bold text-amber-400 text-sm">4. Spread Efficiency (10%)</div>
              <p className="text-xs text-slate-400 mt-1">
                Urgency metric. Panic buying widens spreads.
              </p>
            </div>
          </div>

          <div className="mt-6 bg-slate-800/50 rounded-lg p-4">
            <h4 className="text-sm font-bold text-slate-300 mb-2">R-Factor Formula</h4>
            <code className="text-sm text-emerald-400 font-mono">
              {'R = 0.40 * Z(Vol) + 0.30 * Z(Turn) + 0.20 * Z(OI) + 0.10 * Z(Spread)'}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Market Phases */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">Market Phases & Thresholds</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Minus className="w-4 h-4 text-slate-500" />
                <span className="font-mono text-xs font-bold text-slate-500">PHASE 1</span>
                <span className="text-sm font-bold text-slate-300">The Lull (Trap)</span>
              </div>
              <Badge className="bg-slate-700 text-slate-300">{'R < 1.0'}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-sky-500/5 border border-sky-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span className="font-mono text-xs font-bold text-sky-400">PHASE 2</span>
                <span className="text-sm font-bold text-sky-300">The Blast</span>
              </div>
              <Badge className="bg-sky-500/20 text-sky-400">{'R > 2.0'}</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-red-500/5 border border-red-500/10 rounded-lg">
              <div className="flex items-center gap-3">
                <TrendingDown className="w-4 h-4 text-red-400" />
                <span className="font-mono text-xs font-bold text-red-400">PHASE 3</span>
                <span className="text-sm font-bold text-red-300">The Crash</span>
              </div>
              <Badge className="bg-red-500/20 text-red-400">{'R > 2.5 + Price Drop'}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Back */}
      <Link
        href="/learning"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Learning
      </Link>
    </div>
  );
}

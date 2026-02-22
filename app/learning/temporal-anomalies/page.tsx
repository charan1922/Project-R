"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Clock, 
  Globe2, 
  Zap, 
  BarChart3,
  TrendingUp,
  LineChart
} from "lucide-react";

export default function TemporalAnomaliesPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Temporal Anomalies</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-amber-500/20 text-amber-400 border border-amber-500/30">Module 9 (Microstructure)</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <Clock className="w-8 h-8 text-amber-400" />
          The 12:40 PM Pivot
        </h1>
        <p className="text-lg text-slate-400">
          Why the market behavior changes at noon. Understanding global flow overlaps and the "Intraday Boost".
        </p>
      </div>

      {/* The Lunch Pivot */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Globe2 className="w-6 h-6 text-sky-400" />
          1. The European Overlap
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              In the Indian market (NSE), 12:40 PM is a critical structural timestamp. This is when European markets (London, Frankfurt) open.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center gap-6">
              <div className="space-y-1">
                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Global Correlation</p>
                <p className="text-sm text-slate-200">
                  FII (Foreign Institutional Investor) desks adjust their algorithms at this time to align with global risk sentiment. A trend that survives the 12:40 PM pivot is statistically more likely to continue to the close.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Intraday Boost */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Zap className="w-6 h-6 text-amber-400" />
          2. The "Intraday Boost" Logic
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              The R-Factor model uses a dual-layer lookback to detect this boost:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <Badge variant="outline" className="mb-2">Macro Z-Score</Badge>
                <p className="text-[11px] text-slate-500">Uses 20-day trailing data. Detects if *today* is unusual compared to last month.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-amber-500/20">
                <Badge className="bg-amber-500/20 text-amber-400 mb-2">Fast Z-Score</Badge>
                <p className="text-[11px] text-slate-500">Uses a 60-minute rolling window. Detects if *now* is unusual compared to the morning noise.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Volume Profiles */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          3. Typical Volume Completion
        </h2>
        <p className="text-sm text-slate-400">
          By 12:40 PM, the "Elephant" stocks have usually completed a predictable percentage of their daily volume:
        </p>
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-500 uppercase">
              <tr>
                <th className="p-3">Stock Archetype</th>
                <th className="p-3">Vol % by 12:40 PM</th>
                <th className="p-3">Driver</th>
              </tr>
            </thead>
            <tbody className="bg-slate-900 divide-y divide-slate-800">
              <tr>
                <td className="p-3 font-bold text-slate-200">Super-Elephant (Airtel)</td>
                <td className="p-3 text-emerald-400 font-mono">60-62%</td>
                <td className="p-3 text-slate-400">High institutional VWAP usage.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-200">Elephant (M&M)</td>
                <td className="p-3 text-emerald-400 font-mono">58-60%</td>
                <td className="p-3 text-slate-400">Consistent institutional accumulation.</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-slate-200">Cheetah (Persistent)</td>
                <td className="p-3 text-amber-400 font-mono">40-70%</td>
                <td className="p-3 text-slate-400">Bi-modal: Explosive or Dead.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/openclaw-arch">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: OpenClaw Arch
          </Button>
        </Link>
        <Button variant="ghost" disabled className="text-slate-600 italic text-xs">
          More Advanced Modules Coming Soon...
        </Button>
      </div>
    </div>
  );
}

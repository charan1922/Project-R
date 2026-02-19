"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Activity, BarChart2 } from "lucide-react";

const caseStudies = [
  {
    ticker: "PNB",
    regime: "Elephant",
    febVol: "37.05M",
    avgVol: "~14.0M",
    zScore: "+4.6",
    signal: "Blast (Long)",
    signalColor: "bg-emerald-500/20 text-emerald-400",
    context: "Clean break > 125 with massive institutional participation.",
  },
  {
    ticker: "DIXON",
    regime: "Cheetah",
    febVol: "0.28M (Feb 17)",
    avgVol: "~0.60M",
    zScore: "-1.5",
    signal: "Consolidation",
    signalColor: "bg-slate-600/20 text-slate-400",
    context: "Pullback on low volume after Feb 16 breakout.",
  },
  {
    ticker: "AUROPHARMA",
    regime: "Cheetah",
    febVol: "3.29M",
    avgVol: "~1.6M",
    zScore: "+2.5",
    signal: "Breakdown (Short)",
    signalColor: "bg-red-500/20 text-red-400",
    context: "News-driven panic; high volume reversal.",
  },
  {
    ticker: "HDFCLIFE",
    regime: "Elephant",
    febVol: "4.97M",
    avgVol: "~1.5M",
    zScore: "+5.2",
    signal: "Blast (Long)",
    signalColor: "bg-emerald-500/20 text-emerald-400",
    context: "Sector rotation; highest relative volume spike.",
  },
];

const volumeProfiles = [
  { ticker: "Bharti Airtel", regime: "Super-Elephant", volBy1240: "60-62%", driver: "High institutional VWAP usage; steady flow." },
  { ticker: "M&M", regime: "Elephant", volBy1240: "58-60%", driver: "Consistent institutional accumulation." },
  { ticker: "HCL Tech", regime: "Elephant", volBy1240: "58-60%", driver: "Passive index/dividend flows." },
  { ticker: "Bajaj Auto", regime: "Hybrid", volBy1240: "54-57%", driver: "High price deters retail; waits for FII flow." },
  { ticker: "Hero MotoCorp", regime: "Cheetah", volBy1240: "50-55%", driver: "Morning burst, then lull until rural news." },
  { ticker: "Persistent Sys", regime: "Cheetah", volBy1240: "40-70%", driver: "Bi-modal: Either huge morning breakout or dead." },
  { ticker: "Marico", regime: "Defensive", volBy1240: "45-50%", driver: "U-Shaped profile; dead midday liquidity." },
  { ticker: "Colgate", regime: "Defensive", volBy1240: "45-50%", driver: "U-Shaped profile; low midday speculation." },
];

const factorTable = [
  { factor: "Volume", metric: "Z(Vol)", role: "Activation Gate: Wake up algo if Z > 3.0." },
  { factor: "Open Interest", metric: "Z(OI)", role: "Directional Compass: Put Writing = Bullish." },
  { factor: "Turnover", metric: "Z(Turn)", role: "Quality Filter: Filters penny stock noise." },
  { factor: "Spread", metric: "Z(Spread)", role: "Regime Detector: Elephant vs. Cheetah classification." },
];

export default function RFactorEnginePage() {
  return (
    <div className="p-6 space-y-6 max-w-6xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">R-Factor Engine</span>
      </div>

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
            <Activity className="w-5 h-5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-100">R-Factor Engine & Analysis</h1>
            <p className="text-xs text-slate-500 font-mono uppercase tracking-wider">
              Institutional Flow Algorithm v2.5
            </p>
          </div>
        </div>
        <p className="text-slate-400 max-w-2xl">
          Comprehensive R-Factor model documentation with real case studies from February 2026 data,
          12:40 PM volume profiles, and the complete 4-Factor component breakdown.
        </p>
      </div>

      {/* Case Studies Table */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-sky-400" />
            Forensic Case Studies (Feb 17-18, 2026)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Ticker</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Regime</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Feb Vol</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Avg Vol</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Z-Score</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Signal</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Context</th>
                </tr>
              </thead>
              <tbody>
                {caseStudies.map((cs) => (
                  <tr key={cs.ticker} className="border-b border-slate-800/50">
                    <td className="py-3 px-2 font-bold text-slate-100">{cs.ticker}</td>
                    <td className="py-3 px-2 text-slate-300">{cs.regime}</td>
                    <td className="py-3 px-2 font-mono text-slate-300">{cs.febVol}</td>
                    <td className="py-3 px-2 font-mono text-slate-400">{cs.avgVol}</td>
                    <td className="py-3 px-2 font-mono font-bold text-sky-400">{cs.zScore}</td>
                    <td className="py-3 px-2">
                      <Badge className={cs.signalColor}>{cs.signal}</Badge>
                    </td>
                    <td className="py-3 px-2 text-slate-400 text-xs max-w-xs">{cs.context}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 12:40 PM Volume Profiles */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">12:40 PM Cumulative Volume Profiles</CardTitle>
          <p className="text-sm text-slate-400">
            The 12:40 PM timestamp is a structural pivot in the Indian market due to the European
            market overlap. Volume completion varies by regime classification.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Ticker</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Regime</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Vol % by 12:40</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Primary Driver</th>
                </tr>
              </thead>
              <tbody>
                {volumeProfiles.map((vp) => (
                  <tr key={vp.ticker} className="border-b border-slate-800/50">
                    <td className="py-3 px-2 font-bold text-slate-100">{vp.ticker}</td>
                    <td className="py-3 px-2">
                      <Badge
                        className={
                          vp.regime.includes("Elephant")
                            ? "bg-sky-500/20 text-sky-400"
                            : vp.regime.includes("Cheetah")
                            ? "bg-amber-500/20 text-amber-400"
                            : vp.regime.includes("Defensive")
                            ? "bg-slate-600/20 text-slate-400"
                            : "bg-indigo-500/20 text-indigo-400"
                        }
                      >
                        {vp.regime}
                      </Badge>
                    </td>
                    <td className="py-3 px-2 font-mono font-bold text-emerald-400">{vp.volBy1240}</td>
                    <td className="py-3 px-2 text-slate-400 text-xs">{vp.driver}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 4-Factor Component Breakdown */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-slate-100">4-Factor Model Component Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Factor</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Metric</th>
                  <th className="text-left py-3 px-2 text-slate-400 font-medium">Role in Algorithm</th>
                </tr>
              </thead>
              <tbody>
                {factorTable.map((f) => (
                  <tr key={f.factor} className="border-b border-slate-800/50">
                    <td className="py-3 px-2 font-bold text-slate-100">{f.factor}</td>
                    <td className="py-3 px-2 font-mono text-sky-400">{f.metric}</td>
                    <td className="py-3 px-2 text-slate-300">{f.role}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Execution Protocols */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-emerald-400 text-base">Elephant Protocol</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400 space-y-2">
            <p><strong className="text-slate-200">Trigger:</strong> Z(Vol) {'>'} 2.0 (Higher threshold to filter noise)</p>
            <p><strong className="text-slate-200">Confirmation:</strong> Cumulative Turnover shows convex slope over 15-30 minutes</p>
            <p><strong className="text-slate-200">Execution:</strong> Limit Orders pegged to Bid</p>
            <p><strong className="text-slate-200">12:40 Rule:</strong> If trend persists past 12:40 PM, pyramid the position</p>
          </CardContent>
        </Card>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-amber-400 text-base">Cheetah Protocol</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-slate-400 space-y-2">
            <p><strong className="text-slate-200">Trigger:</strong> Z(Vol) {'>'} 1.5 + Price {'>'} Opening Range High</p>
            <p><strong className="text-slate-200">Confirmation:</strong> Spread expansion (panic buying/selling detected)</p>
            <p><strong className="text-slate-200">Execution:</strong> Market Orders for urgency</p>
            <p><strong className="text-slate-200">Stop Loss:</strong> Volatility-adjusted (wider) to avoid noise</p>
          </CardContent>
        </Card>
      </div>

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

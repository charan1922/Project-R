"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Activity, BarChart2, Search, RefreshCw, AlertCircle } from "lucide-react";
import { MarketScanner } from "./MarketScanner";

const caseStudies = [
  // ... existing case studies ...
];

const volumeProfiles = [
  // ... existing volume profiles ...
];

const factorTable = [
  // ... existing factor table ...
];

export default function RFactorEnginePage() {
  const [symbol, setSymbol] = useState("");
  const [loading, setLoading] = useState(false);
  const [signal, setSignal] = useState<any>(null);
  const [error, setError] = useState("");

  const fetchSignal = async () => {
    if (!symbol) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/r-factor?symbol=${symbol}`);
      const result = await res.json();
      if (result.success) {
        setSignal(result.data);
      } else {
        setError(result.error || "Failed to fetch signal");
      }
    } catch (err) {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  };

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

      {/* Live Signal Scanner */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-slate-900 border-sky-500/30">
          <CardHeader>
            <CardTitle className="text-sky-400 flex items-center gap-2">
              <Search className="w-5 h-5" />
              Single Symbol Lookup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Enter Symbol (e.g. PNB, RELIANCE)" 
                value={symbol}
                onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                className="bg-slate-950 border-slate-800"
                onKeyDown={(e) => e.key === 'Enter' && fetchSignal()}
              />
              <Button 
                onClick={fetchSignal} 
                disabled={loading || !symbol}
                className="bg-sky-600 hover:bg-sky-500"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Scan"}
              </Button>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            {signal && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                <Card className="bg-slate-950 border-slate-800">
                  <CardContent className="pt-6">
                    <p className="text-xs text-slate-500 uppercase">Composite R-Factor</p>
                    <p className={`text-2xl font-bold ${signal.compositeRFactor > 2 ? 'text-emerald-400' : 'text-slate-300'}`}>
                      {signal.compositeRFactor.toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-950 border-slate-800">
                  <CardContent className="pt-6">
                    <p className="text-xs text-slate-500 uppercase">Regime</p>
                    <p className={`text-2xl font-bold ${signal.regime === 'Cheetah' ? 'text-amber-400' : 'text-sky-400'}`}>
                      {signal.regime}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-slate-950 border-slate-800">
                  <CardContent className="pt-6">
                    <p className="text-xs text-slate-500 uppercase">Signal</p>
                    {signal.isBlastTrade ? (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/50">BLAST TRADE</Badge>
                    ) : (
                      <p className="text-slate-500">Normal Activity</p>
                    )}
                  </CardContent>
                </Card>
                <div className="md:col-span-3">
                  <p className="text-xs text-slate-500 mb-2">Individual Z-Scores</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {[
                      { label: 'Volume', val: signal.zScores.volume },
                      { label: 'OI', val: signal.zScores.oi },
                      { label: 'Turnover', val: signal.zScores.turnover },
                      { label: 'Spread', val: signal.zScores.spread },
                    ].map(z => (
                      <div key={z.label} className="p-2 rounded bg-slate-950 border border-slate-800">
                        <p className="text-[10px] text-slate-500">{z.label}</p>
                        <p className={`text-sm font-mono font-bold ${z.val > 2 ? 'text-emerald-400' : 'text-slate-300'}`}>
                          {z.val.toFixed(2)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <MarketScanner />
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

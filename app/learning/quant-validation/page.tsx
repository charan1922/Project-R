"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Target, 
  RefreshCw, 
  LineChart, 
  ShieldAlert,
  Dna,
  PieChart
} from "lucide-react";

export default function QuantValidationPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Quantitative Validation</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-rose-500/20 text-rose-400 border border-rose-500/30">Module 7 (Advanced)</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <Target className="w-8 h-8 text-rose-400" />
          Quantitative Validation
        </h1>
        <p className="text-lg text-slate-400">
          Avoiding the trap of "backtest luck". How we ensure our R-Factor model works across different years and markets.
        </p>
      </div>

      {/* Walk-Forward Analysis */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <RefreshCw className="w-6 h-6 text-rose-400" />
          1. Walk-Forward Analysis
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              The biggest mistake in quant trading is <strong>Overfitting</strong>—tuning parameters so perfectly to the past that they fail in the future.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <h3 className="text-rose-400 font-bold text-xs uppercase mb-3">The Sliding Window Method</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-20 h-2 bg-rose-500/40 rounded" />
                  <div className="w-8 h-2 bg-rose-500 rounded" />
                  <span className="text-[10px] text-slate-500 font-mono">Train 6mo | Test 1mo</span>
                </div>
                <div className="flex items-center gap-3 translate-x-4">
                  <div className="w-20 h-2 bg-rose-500/40 rounded" />
                  <div className="w-8 h-2 bg-rose-500 rounded" />
                  <span className="text-[10px] text-slate-500 font-mono">Slide forward 1mo</span>
                </div>
              </div>
              <p className="text-[11px] text-slate-400 mt-4 italic">
                "By only testing on 'Out-of-Sample' data that the algorithm hasn't seen during training, we simulate real future trading."
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Sensitivity Analysis */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Dna className="w-6 h-6 text-sky-400" />
          2. Parameter Sensitivity
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              Our model uses a <strong>20-day lookback</strong>. But what if 19 days or 21 days work better?
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded bg-slate-950 border border-slate-800 flex flex-col items-center justify-center text-center">
                <ShieldAlert className="w-8 h-8 text-rose-500/40 mb-2" />
                <p className="text-xs font-bold text-slate-200 uppercase">Fragile Strategy</p>
                <p className="text-[10px] text-slate-500">Only works at exactly 20 days. Fails if the market shifts slightly.</p>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-emerald-500/20 flex flex-col items-center justify-center text-center">
                <PieChart className="w-8 h-8 text-emerald-500/40 mb-2" />
                <p className="text-xs font-bold text-slate-200 uppercase">Robust Strategy</p>
                <p className="text-[10px] text-slate-500">Works well across a cluster (15-25 days). This is what we look for.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Risk Optimization */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <LineChart className="w-6 h-6 text-emerald-400" />
          3. Volatility-Adjusted Optimization
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4 text-sm text-slate-400">
            <p>
              The final validation step is <strong>Position Sizing</strong>. We adjust capital based on the "Cheetah vs Elephant" regime detection.
            </p>
            <ul className="list-disc list-inside space-y-2 marker:text-emerald-500">
              <li><strong>Kelly Criterion:</strong> Calculating the optimal fraction of capital to risk per trade.</li>
              <li><strong>Max Drawdown Control:</strong> Ensuring no single "Cheetah" sprint wipes out 10% of the portfolio.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Graduation */}
      <div className="py-8 text-center">
        <div className="inline-block p-1 rounded-full bg-gradient-to-r from-rose-500 via-purple-500 to-sky-500 mb-4">
          <div className="bg-slate-950 rounded-full px-6 py-2">
            <span className="text-sm font-bold text-slate-100 uppercase tracking-widest">Master Quant Certification</span>
          </div>
        </div>
        <p className="text-slate-500 text-sm italic mb-6">
          "You have moved from trading patterns to trading probabilities."
        </p>
        <Link href="/learning/r-factor-engine">
          <Button className="bg-slate-100 hover:bg-white text-slate-950 font-bold px-10 py-6 h-auto">
            ENTER THE ARENA: OPEN LIVE ENGINE
          </Button>
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/advanced-factors">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Advanced Engineering
          </Button>
        </Link>
      </div>
    </div>
  );
}

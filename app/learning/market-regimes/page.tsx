"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Dna, 
  MousePointer2, 
  Zap, 
  CircleDollarSign,
  TrendingUp
} from "lucide-react";

export default function MarketRegimesPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Market Regimes</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Module 3</Badge>
        <h1 className="text-4xl font-bold text-slate-100">Market Regimes</h1>
        <p className="text-lg text-slate-400">
          Not all stocks move the same way. We categorize them into two "personalities" so we know exactly how to trade them.
        </p>
      </div>

      {/* The Two Personalities */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Elephant */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-sky-500/10 flex items-center justify-center border border-sky-500/20">
              <span className="text-2xl">🐘</span>
            </div>
            <h2 className="text-2xl font-bold text-sky-400">The Elephant</h2>
          </div>
          <Card className="bg-slate-900 border-sky-500/20">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-slate-300">
                These are giant, heavy stocks like <strong>Reliance</strong> or <strong>HDFC Bank</strong>. They move slowly but with massive force.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <TrendingUp className="w-3 h-3 text-sky-500" />
                  <span>Low Volatility (Smooth moves)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <CircleDollarSign className="w-3 h-3 text-sky-500" />
                  <span>High Liquidity (Easy to buy/sell)</span>
                </div>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-sky-500/10">
                <p className="text-xs font-bold text-sky-400 uppercase mb-1">How to Trade:</p>
                <p className="text-[11px] text-slate-400 italic">"Be patient. Use Limit Orders. Wait for the big guy to finish his meal."</p>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Cheetah */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <span className="text-2xl">🐆</span>
            </div>
            <h2 className="text-2xl font-bold text-amber-400">The Cheetah</h2>
          </div>
          <Card className="bg-slate-900 border-amber-500/20">
            <CardContent className="pt-6 space-y-4">
              <p className="text-sm text-slate-300">
                These are fast, explosive stocks like <strong>Dixon Tech</strong>. They can sprint 5% in minutes and then vanish.
              </p>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Zap className="w-3 h-3 text-amber-500" />
                  <span>High Volatility (Violent moves)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <MousePointer2 className="w-3 h-3 text-amber-500" />
                  <span>Lower Liquidity (Spreads widen)</span>
                </div>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-amber-500/10">
                <p className="text-xs font-bold text-amber-400 uppercase mb-1">How to Trade:</p>
                <p className="text-[11px] text-slate-400 italic">"Be fast. Use Market Orders. Catch the sprint before it's over."</p>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>

      {/* The Spread Secret */}
      <section className="space-y-4 pt-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Dna className="w-6 h-6 text-indigo-400" />
          The "DNA" Test: Spread Z-Score
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 text-slate-300 space-y-4">
            <p>
              How does the algorithm know which animal it's looking at? It looks at the <strong>Spread</strong>.
            </p>
            <ul className="space-y-4">
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-500 mt-2 shrink-0" />
                <p className="text-sm text-slate-400">
                  <strong>Low Spread Z-Score:</strong> The market is calm and liquid. Everyone is happy to trade at the same price. <strong>Regime: Elephant.</strong>
                </p>
              </li>
              <li className="flex gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-2 shrink-0" />
                <p className="text-sm text-slate-400">
                  <strong>High Spread Z-Score (&gt; 1.5):</strong> The gap between buyers and sellers is widening. People are panicking or rushing. <strong>Regime: Cheetah.</strong>
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/4-factor-model">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: 4-Factor Model
          </Button>
        </Link>
        <Link href="/learning/blast-protocol">
          <Button className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-6">
            Next: The Blast Protocol <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

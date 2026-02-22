"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Target, 
  Timer, 
  ShieldCheck, 
  LogOut,
  Rocket
} from "lucide-react";

export default function BlastProtocolPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">The Blast Protocol</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Module 4</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <Rocket className="w-8 h-8 text-sky-400" />
          The Blast Protocol
        </h1>
        <p className="text-lg text-slate-400">
          This is the master recipe. We combine everything we've learned into a single execution strategy.
        </p>
      </div>

      {/* Step 1: The Setup */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Timer className="w-6 h-6 text-sky-400" />
          Step 1: The Opening Wait
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 text-slate-300 space-y-4">
            <p className="text-sm">
              We never jump in blindly. We wait for the <strong>Opening Range Breakout (ORB)</strong>.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
              <p className="text-xs text-slate-400 mb-2 font-mono">Setup Condition:</p>
              <p className="text-sm font-medium text-slate-200">
                Wait for the first 15 minutes of the market. Draw a line at the High and the Low. This is the "zone".
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Step 2: The Trigger */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Target className="w-6 h-6 text-emerald-400" />
          Step 2: The Triple Confirmation
        </h2>
        <p className="text-sm text-slate-400">
          We pull the trigger ONLY if these three things happen together:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Price</p>
            <p className="text-sm text-slate-200">Breaks above the 15-min High</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">Volume</p>
            <p className="text-sm text-slate-200">Z-Score is &gt; 3.0 (Boom!)</p>
          </div>
          <div className="p-4 rounded-lg bg-slate-900 border border-slate-800 text-center">
            <p className="text-xs text-slate-500 uppercase font-bold mb-2">OI</p>
            <p className="text-sm text-slate-200">Direction matches the move</p>
          </div>
        </div>
      </section>

      {/* Step 3: Risk & Sizing */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-400" />
          Step 3: Size According to Regime
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐘</span>
                  <span className="font-bold text-sky-400">Elephant Trade</span>
                </div>
                <p className="text-xs text-slate-400">Go with <strong>Full Size</strong>. These moves are stable and reliable.</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🐆</span>
                  <span className="font-bold text-amber-400">Cheetah Trade</span>
                </div>
                <p className="text-xs text-slate-400">Use <strong>50% Size</strong>. These are fast but can reverse violently. Be careful!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Step 4: The Exit */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <LogOut className="w-6 h-6 text-rose-400" />
          Step 4: Know When to Leave
        </h2>
        <Card className="bg-slate-950 border-slate-800 border-dashed">
          <CardContent className="pt-6 text-sm text-slate-400 space-y-3">
            <p>We don't wait for hope. We leave if:</p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>OI Reversal:</strong> Big players are closing their bets.</li>
              <li><strong>Volume Dry-up:</strong> The "fuel" is gone for 30 minutes straight.</li>
              <li><strong>Target Hit:</strong> We hit our 1:2 Risk-to-Reward ratio.</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/market-regimes">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Market Regimes
          </Button>
        </Link>
        <Link href="/learning/algo-implementation">
          <Button className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-6">
            Next: Implementation <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

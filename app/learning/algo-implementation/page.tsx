"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  Terminal, 
  Code2, 
  LineChart, 
  Search,
  Activity,
  Sparkles
} from "lucide-react";

export default function AlgoImplementationPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Algo Implementation</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Module 5</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <Terminal className="w-8 h-8 text-sky-400" />
          Algo Implementation
        </h1>
        <p className="text-lg text-slate-400">
          You've mastered the theory. Now, let's see how the engine turns these concepts into code and live data.
        </p>
      </div>

      {/* The Engine Logic */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Code2 className="w-6 h-6 text-sky-400" />
          The R-Factor Engine
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">How it calculates Z-Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              The engine doesn't just guess. It performs a 3-step calculation for every stock in the NSE F&O universe:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 py-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-sky-400 font-bold text-xs uppercase mb-2">Step 1: History</p>
                <p className="text-xs text-slate-500 italic">Fetches the last 20-30 days of volume and spread data.</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-sky-400 font-bold text-xs uppercase mb-2">Step 2: Stats</p>
                <p className="text-xs text-slate-500 italic">Calculates the Mean (average) and Standard Deviation (normal range).</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <p className="text-sky-400 font-bold text-xs uppercase mb-2">Step 3: Z-Score</p>
                <p className="text-xs text-slate-500 italic">Compares today's value to the history. If it's a huge outlier, it pings!</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Your Tools */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          Putting it into Practice
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-slate-900 border-sky-500/20">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <Search className="w-5 h-5 text-sky-400" />
                Live Scanner
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                The most important tool in your arsenal. It scans the top F&O stocks every minute to find active "Blast" trades.
              </p>
              <Link href="/learning/r-factor-engine">
                <Button variant="outline" className="w-full border-sky-500/30 text-sky-400 hover:bg-sky-500/10">
                  Open Scanner
                </Button>
              </Link>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-slate-100 flex items-center gap-2">
                <LineChart className="w-5 h-5 text-emerald-400" />
                Strategy Lab
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-400">
                Backtest your ideas using historical data to see how the "Blast Protocol" would have performed in the past.
              </p>
              <Link href="/backtesting/playground">
                <Button variant="outline" className="w-full border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10">
                  Enter Lab
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Graduation Card */}
      <Card className="bg-indigo-500/10 border-indigo-500/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 p-4">
          <Activity className="w-24 h-24 text-indigo-500/10" />
        </div>
        <CardContent className="pt-8 space-y-4 relative z-10">
          <h3 className="text-xl font-bold text-indigo-300">Congratulations, Trader!</h3>
          <p className="text-sm text-slate-400 max-w-lg">
            You've completed the Deep Quant Curriculum. You are no longer just guessing at charts; you are reading the literal flow of money.
          </p>
          <div className="pt-2">
            <Link href="/learning/r-factor-engine">
              <Button className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-6 h-auto text-lg">
                GO LIVE: START SCANNING
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/blast-protocol">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Blast Protocol
          </Button>
        </Link>
      </div>
    </div>
  );
}

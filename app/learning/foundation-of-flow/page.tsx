"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Activity, Waves, TrendingUp, Info } from "lucide-react";

export default function FoundationOfFlowPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Foundation of Flow</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Module 1</Badge>
        <h1 className="text-4xl font-bold text-slate-100">The Foundation of Flow</h1>
        <p className="text-lg text-slate-400">
          Forget complex charts for a moment. Imagine the stock market not as a math problem, but as a river.
        </p>
      </div>

      {/* Concept 1: The River Analogy */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Waves className="w-6 h-6 text-sky-400" />
          1. The River of Money
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 text-slate-300 space-y-4">
            <p>
              Think of a stock's price as a boat floating on a river.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="font-bold text-emerald-400 mb-2">The Current (Institutional Flow)</h3>
                <p className="text-sm text-slate-400">
                  This is the deep, powerful water moving underneath. It represents the big banks and funds ("Smart Money"). When they decide to move, the boat <em>will</em> move, no matter how much you paddle against it.
                </p>
              </div>
              <div className="bg-slate-950 p-4 rounded-lg border border-slate-800">
                <h3 className="font-bold text-amber-400 mb-2">The Ripples (Retail Noise)</h3>
                <p className="text-sm text-slate-400">
                  These are the tiny splashes on the surface—you, me, and small traders. We make noise, but we don't change the river's direction.
                </p>
              </div>
            </div>
            <p className="font-medium text-slate-200">
              <strong>Key Lesson:</strong> We don't try to predict where the boat goes. We just measure the current. If the current is strong (High Volume), we jump in.
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Concept 2: Volume & OI */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Activity className="w-6 h-6 text-sky-400" />
          2. Measuring the Current
        </h2>
        <p className="text-slate-400">
          How do we see this invisible current? We have two main tools:
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 text-lg">Volume (The Gas)</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-400 text-sm">
              <p className="mb-4">
                Volume is the amount of fuel in the tank. 
              </p>
              <ul className="list-disc list-inside space-y-2 marker:text-sky-500">
                <li><strong>High Volume:</strong> Lots of fuel. The move is real.</li>
                <li><strong>Low Volume:</strong> Running on fumes. The move might be a fake-out.</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-slate-900 border-slate-800">
            <CardHeader>
              <CardTitle className="text-slate-100 text-lg">Open Interest (The Bet)</CardTitle>
            </CardHeader>
            <CardContent className="text-slate-400 text-sm">
              <p className="mb-4">
                Open Interest (OI) tells us where the big players are placing their bets.
              </p>
              <ul className="list-disc list-inside space-y-2 marker:text-sky-500">
                <li>It takes <strong>huge money</strong> to sell options.</li>
                <li>Therefore, <strong>Option Sellers = Smart Money</strong>.</li>
                <li>If they sell Puts, they are betting the market won't fall (Bullish).</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Concept 3: The "Normal" Problem */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-sky-400" />
          3. Why "Big" isn't always Big
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 text-slate-300 space-y-4">
            <div className="flex items-start gap-4">
              <Info className="w-6 h-6 text-sky-400 mt-1 shrink-0" />
              <div>
                <p className="mb-2">
                  Imagine 1 million shares traded for <strong>Reliance</strong> vs. 1 million shares for a small <strong>Penny Stock</strong>.
                </p>
                <p className="mb-4">
                  For the penny stock, that's a tsunami! For Reliance, it's just a Tuesday morning.
                </p>
                <p>
                  <strong>The Problem:</strong> We can't just use raw numbers. We need context.
                </p>
                <p className="mt-2">
                  <strong>The Solution:</strong> This is where <strong>Z-Scores</strong> (The R-Factor) come in. They tell us if today's activity is <em>unusually</em> high compared to normal for <em>that specific stock</em>.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8">
        <Button variant="ghost" disabled className="text-slate-500">
          <ArrowLeft className="w-4 h-4 mr-2" /> Previous
        </Button>
        <Link href="/learning/4-factor-model">
          <Button className="bg-sky-600 hover:bg-sky-500 text-white">
            Next: The 4-Factor Model <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  MousePointer2, 
  Search,
  Activity,
  Maximize2,
  Minimize2
} from "lucide-react";

export default function ExecutionMicrostructurePage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Execution Microstructure</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Module 10 (Advanced)</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <Activity className="w-8 h-8 text-emerald-400" />
          Execution Microstructure
        </h1>
        <p className="text-lg text-slate-400">
          The art of entry. How to use specialized protocols to minimize slippage and catch hidden smart money flow.
        </p>
      </div>

      {/* Elephant Protocol */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Minimize2 className="w-6 h-6 text-sky-400" />
          1. Passive Execution (Elephant)
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              For deep-liquidity stocks (Airtel, Reliance, M&M), aggressive buying moves the price against you. We use <strong>Passive Protocols</strong>.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <h3 className="text-sky-400 font-bold text-xs uppercase mb-2">Limit Pegging</h3>
                <p className="text-[11px] text-slate-500 italic">"Orders are pegged to the Best Bid. We wait for the sellers to come to us, absorbing their volume without signaling our intent."</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-950 border border-slate-800">
                <h3 className="text-sky-400 font-bold text-xs uppercase mb-2">Iceberg Logic</h3>
                <p className="text-[11px] text-slate-500 italic">"Displaying only 100 shares while buying 10,000. This hides the true size of the institutional footprint from other algorithms."</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Cheetah Protocol */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Maximize2 className="w-6 h-6 text-amber-400" />
          2. Aggressive Execution (Cheetah)
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              For high-beta stocks (Dixon, Persistent), waiting is expensive. The price moves faster than your limit order.
            </p>
            <div className="p-4 rounded-lg bg-slate-950 border border-amber-500/10">
              <h3 className="text-amber-400 font-bold text-xs uppercase mb-2">Market Urgency Trigger</h3>
              <p className="text-[11px] text-slate-400">
                When Spread Z-Score &gt; 1.5 and the price breaks the 15-min High, we switch to <strong>Market Orders</strong>. We accept higher slippage to ensure 100% fill before the Cheetah completes its sprint.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Hidden Accumulation */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Search className="w-6 h-6 text-emerald-400" />
          3. Hidden Accumulation
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-slate-100 text-lg">The "Volume Spike, Price Flat" Anomaly</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400 leading-relaxed">
              This is the "Holy Grail" of microstructure. If Volume Z-score is &gt; 2.0 but price has moved less than 0.5%, it means an institution is <strong>absorbing</strong> all available supply. They are building a massive "floor" before the blast.
            </p>
            <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase text-center">
              Target: Accumulate slowly during the Midday Lull (11:30 AM - 1:30 PM)
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/temporal-anomalies">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Temporal Anomalies
          </Button>
        </Link>
        <Link href="/learning/system-sovereignty">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6">
            Next: System Sovereignty <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

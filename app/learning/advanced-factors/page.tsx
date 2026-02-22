"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  FlaskConical, 
  Binary, 
  Waves, 
  TrendingUp,
  Microscope,
  Box
} from "lucide-react";

export default function AdvancedFactorsPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">Advanced Factor Engineering</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-purple-500/20 text-purple-400 border border-purple-500/30">Module 6 (Advanced)</Badge>
        <h1 className="text-4xl font-bold text-slate-100 flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-purple-400" />
          Advanced Factor Engineering
        </h1>
        <p className="text-lg text-slate-400">
          Moving beyond simple averages. How to use higher-order mathematics to filter noise and detect institutional footprints.
        </p>
      </div>

      {/* PCA Concept */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Binary className="w-6 h-6 text-purple-400" />
          1. OI Vector PCA
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              The "20 parameters" mentioned in our strategy refer to tracking Open Interest changes across 10 ITM and 10 OTM strikes for both Puts and Calls.
            </p>
            <div className="p-4 rounded-lg bg-slate-950 border border-purple-500/20">
              <h3 className="text-purple-400 font-bold text-xs uppercase mb-2">The Quant Method: Principal Component Analysis</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Instead of looking at 20 different numbers, we use <strong>PCA</strong> to compress this data into a single "Sentiment Factor". This reduces dimensionality and highlights the primary direction where the most capital is being deployed.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Volatility Filtering */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Waves className="w-6 h-6 text-rose-400" />
          2. India VIX Regime Filtering
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              High market volatility (Panic) makes Z-scores less reliable. Our advanced engine uses the <strong>India VIX</strong> percentile to adjust thresholds.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 rounded bg-slate-950 border border-slate-800">
                <p className="text-emerald-400 font-bold text-xs uppercase">VIX &lt; 70th Percentile</p>
                <p className="text-[11px] text-slate-500">Standard thresholds (Volume Z-Score &gt; 3.0). Market is behaving normally.</p>
              </div>
              <div className="p-3 rounded bg-slate-950 border border-rose-500/20">
                <p className="text-rose-400 font-bold text-xs uppercase">VIX &gt; 90th Percentile</p>
                <p className="text-[11px] text-slate-500">Widened thresholds (Volume Z-Score &gt; 4.5). Market is too noisy; higher conviction required.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Turnover Integral */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <Microscope className="w-6 h-6 text-amber-400" />
          3. Cumulative Turnover Integrals
        </h2>
        <Card className="bg-slate-900 border-slate-800">
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-slate-300">
              We don't just look at the <em>total</em> volume. we look at the <strong>second derivative</strong> of the Cumulative Turnover curve.
            </p>
            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex items-center gap-4">
              <Box className="w-10 h-10 text-amber-500/40 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 italic">
                  "Accelerating capital inflow is shown by a steepening slope. If the second derivative is positive and rising, it confirms institutional conviction before the price fully breaks out."
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/algo-implementation">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Implementation
          </Button>
        </Link>
        <Link href="/learning/quant-validation">
          <Button className="bg-purple-600 hover:bg-purple-500 text-white font-semibold px-6">
            Next: Quant Validation <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

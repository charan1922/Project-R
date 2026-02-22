"use client";

import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowLeft, 
  ArrowRight, 
  Zap, 
  Compass, 
  Filter, 
  Thermometer,
  Layers,
  CheckCircle2
} from "lucide-react";

export default function FourFactorModelPage() {
  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/learning" className="hover:text-slate-300 transition-colors">
          Learning
        </Link>
        <span>/</span>
        <span className="text-slate-300">The 4-Factor Model</span>
      </div>

      {/* Hero Section */}
      <div className="space-y-4">
        <Badge className="bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30">Module 2</Badge>
        <h1 className="text-4xl font-bold text-slate-100">The 4-Factor Model</h1>
        <p className="text-lg text-slate-400">
          Our algorithm doesn't just look at one number. It looks at four "vital signs" to confirm if a trade is worth taking.
        </p>
      </div>

      {/* Intro Summary */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="pt-6 text-slate-300 space-y-4">
          <p>
            Think of the 4-Factor model as a <strong>Security Gate</strong> at a high-end club. To get in (take the trade), you need to pass four different checks.
          </p>
        </CardContent>
      </Card>

      {/* The 4 Factors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Factor 1 */}
        <Card className="bg-slate-900 border-emerald-500/20 hover:border-emerald-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <Zap className="w-6 h-6 text-emerald-400" />
            </div>
            <CardTitle className="text-slate-100">1. Volume Z-Score</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">THE ACTIVATION GATE</Badge>
            <p className="text-sm text-slate-400">
              Is anyone even at the party? If Volume is high, it means institutions are active. We look for a score of <strong>+3.0</strong> or more.
            </p>
            <p className="text-xs text-slate-500 italic">"If the volume isn't there, the move isn't real."</p>
          </CardContent>
        </Card>

        {/* Factor 2 */}
        <Card className="bg-slate-900 border-sky-500/20 hover:border-sky-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-500/10">
              <Compass className="w-6 h-6 text-sky-400" />
            </div>
            <CardTitle className="text-slate-100">2. OI Delta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30">THE DIRECTIONAL COMPASS</Badge>
            <p className="text-sm text-slate-400">
              Are they betting on 'UP' or 'DOWN'? Open Interest tells us if big players are adding new positions or leaving.
            </p>
            <p className="text-xs text-slate-500 italic">"Follow the sellers; they have the most to lose."</p>
          </CardContent>
        </Card>

        {/* Factor 3 */}
        <Card className="bg-slate-900 border-amber-500/20 hover:border-amber-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Filter className="w-6 h-6 text-amber-400" />
            </div>
            <CardTitle className="text-slate-100">3. Turnover Integral</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">THE QUALITY FILTER</Badge>
            <p className="text-sm text-slate-400">
              Is this "Smart Money" or "Small Money"? Turnover measures the actual value (Rupees) moving. It filters out noise from cheap stocks.
            </p>
            <p className="text-xs text-slate-500 italic">"High volume in a 10 rupee stock isn't the same as high volume in a 10,000 rupee stock."</p>
          </CardContent>
        </Card>

        {/* Factor 4 */}
        <Card className="bg-slate-900 border-rose-500/20 hover:border-rose-500/40 transition-colors">
          <CardHeader className="flex flex-row items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <Thermometer className="w-6 h-6 text-rose-400" />
            </div>
            <CardTitle className="text-slate-100">4. Spread Urgency</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Badge className="bg-rose-500/20 text-rose-400 border-rose-500/30">THE REGIME DETECTOR</Badge>
            <p className="text-sm text-slate-400">
              Are they panicking? Wide spreads mean people are scrambling to get in or out. This tells us if we're in an "Elephant" or "Cheetah" market.
            </p>
            <p className="text-xs text-slate-500 italic">"When the door is small and everyone is running, the spread widens."</p>
          </CardContent>
        </Card>
      </div>

      {/* Summary Logic */}
      <section className="space-y-4">
        <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
          Putting it All Together
        </h2>
        <Card className="bg-slate-950 border-slate-800 border-dashed">
          <CardContent className="pt-6">
            <p className="text-slate-300 mb-4">
              A <strong>"Blast Trade"</strong> only happens when all 4 factors align:
            </p>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-100">1</div>
                <span>Volume is booming (Z-Score &gt; 3)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-100">2</div>
                <span>OI confirms the direction (Smart Money bets)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-100">3</div>
                <span>Actual money value is high (Turnover)</span>
              </div>
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px] text-slate-100">4</div>
                <span>The execution style is chosen (Spread)</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Navigation */}
      <div className="flex justify-between pt-8 border-t border-slate-800">
        <Link href="/learning/foundation-of-flow">
          <Button variant="ghost" className="text-slate-400 hover:text-slate-200">
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous: Foundation
          </Button>
        </Link>
        <Link href="/learning/market-regimes">
          <Button className="bg-sky-600 hover:bg-sky-500 text-white font-semibold px-6">
            Next: Market Regimes <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </div>
    </div>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FlaskConical, 
  LineChart, 
  Cpu, 
  Play, 
  TrendingUp, 
  Eye,
  Target,
  Shield,
  ArrowRight,
  Youtube,
  ExternalLink,
  BookOpen
} from "lucide-react";
import Link from "next/link";

export default function TradingLabPage() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-purple-400" />
          Trading Lab
        </h1>
        <p className="text-slate-400">
          Algorithmic trading strategies based on Open Interest + Breakout analysis
        </p>
      </div>

      {/* Video Resources */}
      <Card className="bg-red-500/10 border-red-500/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-white flex items-center gap-2">
            <Youtube className="w-5 h-5 text-red-400" />
            Strategy Videos (Learn the Method)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <a 
              href="https://www.youtube.com/watch?v=rdcV5u5cKmg&t=11s" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  Understanding Open Interest (OI)
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </h4>
                <p className="text-sm text-slate-400 mt-1">
                  Learn how to read OI from the seller's perspective. Understand Put/Call 
                  OI and how large players build positions.
                </p>
              </div>
            </a>
            
            <a 
              href="https://www.youtube.com/watch?v=RfIg4D4C_Q0" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-start gap-3 p-3 rounded-lg bg-slate-800/50 hover:bg-slate-800 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center flex-shrink-0">
                <Play className="w-5 h-5 text-red-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white flex items-center gap-2">
                  The "Blasting Stock" Strategy
                  <ExternalLink className="w-3 h-3 text-slate-500" />
                </h4>
                <p className="text-sm text-slate-400 mt-1">
                  Complete breakdown of the OI + Breakout strategy. How to identify 
                  stocks with large-scale participation.
                </p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Strategy Overview */}
      <Card className="bg-slate-900 border-slate-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-purple-400" />
            The Strategy: OI + Breakout
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                1. Breakout Detection
              </h3>
              <p className="text-sm text-slate-400">
                Identify stocks breaking important resistance/support levels with 
                significant price movement (2%+ in a day).
              </p>
            </div>
            <div className="p-4 rounded-lg bg-slate-800/50">
              <h3 className="text-lg font-semibold text-white mb-2 flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-400" />
                2. Open Interest Analysis
              </h3>
              <p className="text-sm text-slate-400">
                Analyze OI from the seller's perspective. Increasing Put OI suggests 
                large players are bullish (selling puts). Increasing Call OI suggests bearish.
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
            <h3 className="text-lg font-semibold text-purple-400 mb-2">
              🎯 The Edge: Seller's Perspective
            </h3>
            <p className="text-sm text-slate-300">
              Options sellers deploy more capital and conduct deeper research. When Put OI 
              increases significantly while price breaks out, it indicates institutional 
              players are building bullish positions. This combination has high probability 
              of sustained momentum.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-emerald-400 mb-1">Put OI ↑</div>
              <div className="text-sm text-slate-400">+ Breakout = BUY</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-red-400 mb-1">Call OI ↑</div>
              <div className="text-sm text-slate-400">+ Breakdown = SELL</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-blue-400 mb-1">Volume + OI ↑</div>
              <div className="text-sm text-slate-400">= New Positions</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-slate-900 border-slate-800 hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <LineChart className="w-5 h-5 text-blue-400" />
              Strategy Backtest
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Test the OI + Breakout strategy on historical data. 
              See win rate, profit factor, and drawdown analysis.
            </p>
            <Link href="/trading-lab/backtest">
              <Button className="w-full bg-blue-500 hover:bg-blue-600">
                Backtest Strategy
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-emerald-400" />
              Live Scanner
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Real-time scanner for breakout stocks with OI confirmation. 
              Auto-identifies high-probability setups.
            </p>
            <Link href="/trading-lab/scanner">
              <Button className="w-full bg-emerald-500 hover:bg-emerald-600">
                Open Scanner
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800 hover:border-purple-500/50 transition-colors">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Play className="w-5 h-5 text-purple-400" />
              Algo Execute
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-400">
              Deploy the algorithm with auto-execution. 
              Set risk parameters and let it trade.
            </p>
            <Link href="/trading-lab/execute">
              <Button className="w-full bg-purple-500 hover:bg-purple-600">
                Deploy Algo
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Risk Disclaimer */}
      <Card className="bg-amber-500/10 border-amber-500/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-400 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-400 mb-1">Risk Disclaimer</h4>
            <p className="text-sm text-slate-400">
              Algorithmic trading involves significant risk. Past performance does not guarantee 
              future results. Always use proper risk management and position sizing. 
              Start with paper trading before deploying real capital.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

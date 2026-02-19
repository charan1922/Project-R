"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { FlaskConical, LineChart, Cpu, Play, ArrowRight } from "lucide-react";

const sections = [
  {
    title: "Strategy Backtest Playground",
    description:
      "Test the OI + Breakout strategy on 50 real NSE F&O stocks. Adjust parameters, run simulations, and analyze results.",
    href: "/backtesting/playground",
    icon: <LineChart className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
  },
  {
    title: "Live Scanner",
    description:
      "Scan 50 NSE F&O stocks in real-time for OI-based signals using the R-Factor model.",
    href: "/trading-lab/scanner",
    icon: <Cpu className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
  },
  {
    title: "Algo Execute",
    description:
      "View execution protocols for Elephant and Cheetah regime trades.",
    href: "/trading-lab/execute",
    icon: <Play className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
  },
];

export default function BacktestingPage() {
  return (
    <div className="p-6 space-y-8">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <FlaskConical className="w-8 h-8 text-sky-400" />
          <h1 className="text-3xl font-bold text-slate-100">Backtesting Lab</h1>
        </div>
        <p className="text-slate-400 max-w-2xl">
          Test, analyze, and refine your trading strategies using real NSE stock and options data.
          This lab is designed for educational purposes to help you understand how quantitative
          strategies perform in real market conditions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((sec) => (
          <Link key={sec.href} href={sec.href}>
            <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group h-full">
              <CardContent className="p-6">
                <div className={`w-12 h-12 rounded-lg ${sec.bg} flex items-center justify-center mb-4`}>
                  <span className={sec.color}>{sec.icon}</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                  {sec.title}
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{sec.description}</p>
                <div className="flex items-center gap-1 mt-4 text-sm text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                  Open <ArrowRight className="w-4 h-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

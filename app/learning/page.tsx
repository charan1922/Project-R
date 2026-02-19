"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Layers,
  BarChart2,
  Calculator,
  Brain,
  Target,
  Lightbulb,
  ArrowRight,
  GraduationCap,
  ExternalLink,
  FileText,
} from "lucide-react";

const modules = [
  {
    id: 1,
    title: "Stock Market Basics",
    description:
      "Understand how stock markets work, what drives prices, and the role of exchanges like NSE and BSE in India.",
    href: "/learning/stock-basics",
    icon: <BookOpen className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    topics: ["Market Structure", "Order Types", "Price Discovery", "NSE/BSE"],
  },
  {
    id: 2,
    title: "Options Trading 101",
    description:
      "Learn calls, puts, strike prices, expiry dates, and the fundamentals of options contracts in the Indian F&O segment.",
    href: "/learning/options-101",
    icon: <Layers className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    topics: ["Calls & Puts", "Strike Price", "Expiry Cycles", "Option Greeks"],
  },
  {
    id: 3,
    title: "Volume & Open Interest",
    description:
      "Discover how volume and open interest data reveal the true conviction behind price movements.",
    href: "/learning/volume-oi",
    icon: <BarChart2 className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    topics: ["Volume Analysis", "OI Interpretation", "Put/Call Ratio", "Seller's Perspective"],
  },
  {
    id: 4,
    title: "Z-Score & R-Factor Model",
    description:
      "Master the 4-Factor Z-Score R-Factor Model that normalizes market data to detect institutional anomalies.",
    href: "/learning/z-score-r-factor",
    icon: <Calculator className="w-6 h-6" />,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    topics: ["Z-Score Math", "4-Factor Weights", "R-Factor Formula", "Sigma Events"],
  },
  {
    id: 5,
    title: "Smart Money Detection",
    description:
      'Learn to identify "Elephant" and "Cheetah" stock regimes and detect institutional footprints in market microstructure.',
    href: "/learning/smart-money",
    icon: <Brain className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    topics: ["Elephant vs Cheetah", "Institutional Flow", "Bid-Ask Spreads", "Turnover Integral"],
  },
  {
    id: 6,
    title: "Breakout Strategies",
    description:
      'The "Blast Protocol" - combining Breakout Beacons with Intraday Boost for high-momentum trade entries.',
    href: "/learning/breakout-strategies",
    icon: <Target className="w-6 h-6" />,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    topics: ["Breakout Beacon", "Intraday Boost", "Blast Protocol", "Risk Management"],
  },
  {
    id: 7,
    title: "Backtesting Fundamentals",
    description:
      "Understand walk-forward analysis, parameter optimization, and how to validate trading strategies before going live.",
    href: "/learning/backtesting-fundamentals",
    icon: <Lightbulb className="w-6 h-6" />,
    color: "text-teal-400",
    bg: "bg-teal-500/10 border-teal-500/20",
    topics: ["Walk-Forward", "Overfitting", "Parameter Sensitivity", "Risk Metrics"],
  },
];

const referenceSites = [
  {
    title: "Deep Quant Forensic Lab",
    description: "Interactive 4-Factor Z-Score strategy dashboard with forensic stock analysis, AI assistant, and signal simulator.",
    href: "/learning/deep-quant-lab",
    icon: <FileText className="w-5 h-5" />,
  },
  {
    title: "R-Factor Engine & Analysis",
    description: "Comprehensive R-Factor model documentation, case studies (PNB, Dixon, Aurobindo Pharma), and interactive tools.",
    href: "/learning/r-factor-engine",
    icon: <FileText className="w-5 h-5" />,
  },
];

const videoResources = [
  {
    title: "This Indicator Changed My Trading Forever",
    url: "https://www.youtube.com/watch?v=rdcV5u5cKmg",
    description: "Volume and OI-based breakout detection methodology (Breakout Beacon).",
  },
  {
    title: "Intraday Boost Strategy Explained",
    url: "https://www.youtube.com/watch?v=RfIg4D4C_Q0",
    description: "The 20-parameter intraday boost strategy for live trading signals.",
  },
];

export default function LearningPage() {
  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <GraduationCap className="w-8 h-8 text-sky-400" />
          <h1 className="text-3xl font-bold text-slate-100">Learning Curriculum</h1>
        </div>
        <p className="text-slate-400 max-w-2xl">
          A structured, progressive curriculum covering stock trading, options, institutional
          flow detection, and algorithmic backtesting. Follow the modules in order for
          the best learning experience.
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Your Progress</span>
            <span className="text-sm text-slate-500">0 / 7 modules completed</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: "0%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Module Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {modules.map((mod) => (
          <Link key={mod.id} href={mod.href}>
            <Card
              className={`bg-slate-900 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group h-full`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div
                    className={`w-12 h-12 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}
                  >
                    <span className={mod.color}>{mod.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge
                        variant="secondary"
                        className="bg-slate-800 text-slate-400 text-xs"
                      >
                        Module {mod.id}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {mod.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1 leading-relaxed">
                      {mod.description}
                    </p>
                    <div className="flex flex-wrap gap-2 mt-3">
                      {mod.topics.map((topic) => (
                        <span
                          key={topic}
                          className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                    <div className="flex items-center gap-1 mt-3 text-sm text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      Start Learning <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Reference Sites */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Reference Sites</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {referenceSites.map((site) => (
            <Link key={site.href} href={site.href}>
              <Card className="bg-slate-900 border-slate-800 hover:border-sky-500/30 transition-all cursor-pointer group h-full">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center shrink-0">
                    <span className="text-sky-400">{site.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                      {site.title}
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{site.description}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Video Resources */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold text-slate-100">Video Resources</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {videoResources.map((video) => (
            <a
              key={video.url}
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Card className="bg-slate-900 border-slate-800 hover:border-red-500/30 transition-all cursor-pointer group h-full">
                <CardContent className="p-5 flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <ExternalLink className="w-5 h-5 text-red-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-100 group-hover:text-red-400 transition-colors flex items-center gap-2">
                      {video.title}
                      <ExternalLink className="w-3 h-3" />
                    </h3>
                    <p className="text-sm text-slate-400 mt-1">{video.description}</p>
                  </div>
                </CardContent>
              </Card>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

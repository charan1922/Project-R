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
  Cpu,
  FlaskConical,
  Clock,
  Activity,
  ShieldCheck
} from "lucide-react";

const foundations = [
  {
    id: 1,
    title: "The Foundation of Flow",
    description: "Understand the river of money and institutional flow through analogies.",
    href: "/learning/foundation-of-flow",
    icon: <BookOpen className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    topics: ["River Analogy", "Volume vs Noise", "Z-Score Intro"],
  },
  {
    id: 2,
    title: "The 4-Factor Model",
    description: "Master the security gate: Volume, OI, Turnover, and Spread Z-Scores.",
    href: "/learning/4-factor-model",
    icon: <Layers className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    topics: ["Activation Gate", "Directional Compass", "Quality Filter", "Regime Detector"],
  },
  {
    id: 3,
    title: "Market Regimes",
    description: "Identify stock personalities: Elephant (High Liquidity) vs. Cheetah (High Beta).",
    href: "/learning/market-regimes",
    icon: <Brain className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    topics: ["Regime DNA", "Spread Z-Score", "Order Execution"],
  },
  {
    id: 4,
    title: "The Blast Protocol",
    description: "The execution blueprint for high-momentum institutional breakouts.",
    href: "/learning/blast-protocol",
    icon: <Target className="w-6 h-6" />,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/20",
    topics: ["ORB Setup", "Triple Confirmation", "Dynamic Exits"],
  },
];

const advancedLab = [
  {
    id: 5,
    title: "Algo Implementation",
    description: "From theory to code: Building the R-Factor engine and connecting to NSE.",
    href: "/learning/algo-implementation",
    icon: <Cpu className="w-6 h-6" />,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    topics: ["Node.js/Python", "API Integration", "Historical Processing"],
  },
  {
    id: 6,
    title: "Advanced Factor Eng.",
    description: "Higher-order math: PCA for OI Vectors and india VIX regime filtering.",
    href: "/learning/advanced-factors",
    icon: <FlaskConical className="w-6 h-6" />,
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    topics: ["Principal Component Analysis", "Volatility Normalization", "Second Derivatives"],
  },
  {
    id: 7,
    title: "Quantitative Validation",
    description: "Ensuring robustness: Walk-forward analysis and parameter sensitivity.",
    href: "/learning/quant-validation",
    icon: <Calculator className="w-6 h-6" />,
    color: "text-rose-400",
    bg: "bg-rose-500/10 border-rose-500/20",
    topics: ["Overfitting Prevention", "Sliding Windows", "Risk Optimization"],
  },
  {
    id: 8,
    title: "OpenClaw Architecture",
    description: "Modern 6-layer topography for deterministic document and trading systems.",
    href: "/learning/openclaw-arch",
    icon: <Layers className="w-6 h-6" />,
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    topics: ["Control Planes", "Protocol Mechanics", "Local-First Persistence"],
  },
  {
    id: 9,
    title: "Temporal Anomalies",
    description: "Understanding the 12:40 PM Intraday Pivot and global flow overlaps.",
    href: "/learning/temporal-anomalies",
    icon: <Clock className="w-6 h-6" />,
    color: "text-sky-400",
    bg: "bg-sky-500/10 border-sky-500/20",
    topics: ["European Overlap", "Intraday Boost", "Volume Completion"],
  },
  {
    id: 10,
    title: "Execution Microstructure",
    description: "Deep dive into Elephant vs. Cheetah protocols and hidden accumulation.",
    href: "/learning/execution-microstructure",
    icon: <Activity className="w-6 h-6" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10 border-emerald-500/20",
    topics: ["Passive Orders", "Market Urgency", "Absorption Logic"],
  },
  {
    id: 11,
    title: "System Sovereignty",
    description: "Protecting your alpha: Docker isolation, RPC mechanics, and eBPF tracing.",
    href: "/learning/system-sovereignty",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "text-indigo-400",
    bg: "bg-indigo-500/10 border-indigo-500/20",
    topics: ["Sandboxing", "Idempotency", "Kernel-Level Security"],
  },
];

const liveTools = [
  {
    title: "R-Factor Engine & Analysis",
    description: "Real-time 4-Factor Z-Score scanner with regime detection and live signal visualization.",
    href: "/learning/r-factor-engine",
    icon: <Activity className="w-5 h-5" />,
  },
];

export default function LearningPage() {
  return (
    <div className="p-6 space-y-12 max-w-6xl mx-auto">
      {/* Header */}
      <div className="space-y-4 text-center">
        <div className="inline-flex items-center justify-center p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 mb-2">
          <GraduationCap className="w-10 h-10 text-sky-400" />
        </div>
        <h1 className="text-4xl font-bold text-slate-100">Deep Quant Curriculum</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          A progressive, institutional-grade curriculum designed to move you from technical analysis 
          to statistical market microstructure.
        </p>
      </div>

      {/* Progress Bar */}
      <Card className="bg-slate-900 border-slate-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-300">Curriculum Completion</span>
            <span className="text-sm text-slate-500">0 / 9 modules</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2">
            <div
              className="bg-emerald-500 h-2 rounded-full transition-all"
              style={{ width: "0%" }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 1: Foundations */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <BookOpen className="w-5 h-5 text-sky-400" />
          <h2 className="text-2xl font-bold text-slate-100">Quant Foundations</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {foundations.map((mod) => (
            <Link key={mod.id} href={mod.href}>
              <Card className="bg-slate-900 border-slate-800 hover:border-slate-700 transition-all cursor-pointer group h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}>
                      <span className={mod.color}>{mod.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-100 group-hover:text-sky-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {mod.topics.map((topic) => (
                          <span key={topic} className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700/50 uppercase font-bold">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 2: Advanced Lab */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <FlaskConical className="w-5 h-5 text-purple-400" />
          <h2 className="text-2xl font-bold text-slate-100">Advanced Lab</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {advancedLab.map((mod) => (
            <Link key={mod.id} href={mod.href}>
              <Card className="bg-slate-900 border-slate-800 hover:border-purple-500/20 transition-all cursor-pointer group h-full">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-lg ${mod.bg} flex items-center justify-center shrink-0`}>
                      <span className={mod.color}>{mod.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold text-slate-100 group-hover:text-purple-400 transition-colors">
                        {mod.title}
                      </h3>
                      <p className="text-sm text-slate-400 mt-1 leading-relaxed line-clamp-2">
                        {mod.description}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        {mod.topics.map((topic) => (
                          <span key={topic} className="text-[10px] bg-slate-800 text-slate-500 px-2 py-0.5 rounded border border-slate-700/50 uppercase font-bold">
                            {topic}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Section 3: Live Tools */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-2">
          <Activity className="w-5 h-5 text-emerald-400" />
          <h2 className="text-2xl font-bold text-slate-100">Execution Tools</h2>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {liveTools.map((site) => (
            <Link key={site.href} href={site.href}>
              <Card className="bg-slate-900 border-emerald-500/20 hover:border-emerald-500/40 transition-all cursor-pointer group h-full">
                <CardContent className="p-6 flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <span className="text-emerald-400">{site.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {site.title}
                    </h3>
                    <p className="text-slate-400 mt-1">{site.description}</p>
                    <div className="flex items-center gap-2 mt-4 text-emerald-400 text-sm font-bold uppercase tracking-wider">
                      Launch Tool <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

import {
  BookOpen,
  Layers,
  Brain,
  Target,
  Cpu,
  FlaskConical,
  Calculator,
  Clock,
  Activity,
  ShieldCheck,
} from "lucide-react";
import React from "react";

export interface Module {
  id: number;
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  topics: string[];
}

export const foundations: Module[] = [
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

export const advancedLab: Module[] = [
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

export const liveTools = [
  {
    title: "R-Factor Engine & Analysis",
    description: "Real-time 4-Factor Z-Score scanner with regime detection and live signal visualization.",
    href: "/learning/r-factor-engine",
    icon: <Activity className="w-5 h-5" />,
  },
];

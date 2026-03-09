import React from "react";
import {
  GraduationCap,
  BookOpen,
  Layers,
  Brain,
  Target,
  FlaskConical,
  Cpu,
  Activity,
  Calculator,
  LineChart,
  Zap,
  ShieldCheck,
  Play,
  Database,
  List,
  BarChart2,
  CalendarDays,
  Download,
  Upload,
  HardDrive,
  Clock,
  Settings,
  Compass,
  TestTube2,
} from "lucide-react";

export interface NavItemType {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: NavItemType[];
}

export const learningItems: NavItemType[] = [
  {
    label: "Quant Foundations",
    href: "/learning/foundations",
    icon: <GraduationCap className="w-4 h-4" />,
    children: [
      {
        label: "Foundation of Flow",
        href: "/learning/foundation-of-flow",
        icon: <BookOpen className="w-3.5 h-3.5" />,
      },
      {
        label: "The 4-Factor Model",
        href: "/learning/4-factor-model",
        icon: <Layers className="w-3.5 h-3.5" />,
      },
      {
        label: "Market Regimes",
        href: "/learning/market-regimes",
        icon: <Brain className="w-3.5 h-3.5" />,
      },
      {
        label: "The Blast Protocol",
        href: "/learning/blast-protocol",
        icon: <Target className="w-3.5 h-3.5" />,
      },
    ],
  },
  {
    label: "Advanced Lab",
    href: "/learning/advanced",
    icon: <FlaskConical className="w-4 h-4" />,
    badge: "PRO",
    children: [
      {
        label: "Algo Implementation",
        href: "/learning/algo-implementation",
        icon: <Cpu className="w-3.5 h-3.5" />,
      },
      {
        label: "Advanced Factor Eng.",
        href: "/learning/advanced-factors",
        icon: <Activity className="w-3.5 h-3.5" />,
      },
      {
        label: "Quant Validation",
        href: "/learning/quant-validation",
        icon: <Calculator className="w-3.5 h-3.5" />,
      },
      {
        label: "OpenClaw Architecture",
        href: "/learning/openclaw-arch",
        icon: <Layers className="w-3.5 h-3.5" />,
      },
      {
        label: "Temporal Anomalies",
        href: "/learning/temporal-anomalies",
        icon: <LineChart className="w-3.5 h-3.5" />,
      },
      {
        label: "Execution Micro.",
        href: "/learning/execution-microstructure",
        icon: <Zap className="w-3.5 h-3.5" />,
      },
      {
        label: "System Sovereignty",
        href: "/learning/system-sovereignty",
        icon: <ShieldCheck className="w-3.5 h-3.5" />,
      },
    ],
  },
];

export const liveTools: NavItemType[] = [
  {
    label: "R-Factor Engine",
    href: "/learning/r-factor-engine",
    icon: <Activity className="w-4 h-4" />,
    badge: "LIVE",
  },
];

export const backtestingItems: NavItemType[] = [
  {
    label: "Backtesting",
    href: "/backtesting",
    icon: <FlaskConical className="w-4 h-4" />,
    badge: "LAB",
    children: [
      {
        label: "Strategy Backtest",
        href: "/backtesting/playground",
        icon: <LineChart className="w-3.5 h-3.5" />,
      },
      {
        label: "Live Scanner",
        href: "/trading-lab/scanner",
        icon: <Cpu className="w-3.5 h-3.5" />,
      },
      {
        label: "Algo Execute",
        href: "/trading-lab/execute",
        icon: <Play className="w-3.5 h-3.5" />,
      },
    ],
  },
];

export const v1Items: NavItemType[] = [
  {
    label: "v1.0 (Current)",
    href: "/v1",
    icon: <Zap className="w-4 h-4" />,
    children: [
      {
        label: "Market Intelligence",
        href: "/trading-lab/intelligence",
        icon: <Brain className="w-4 h-4" />,
        badge: "NEW",
      },
      {
        label: "Trade Journal",
        href: "/trading-lab/tradefinder",
        icon: <LineChart className="w-4 h-4" />,
        badge: "ANALYTICS",
      },
      {
        label: "F&O Universe",
        href: "/trading-lab/fno-universe",
        icon: <Layers className="w-4 h-4" />,
        badge: "NEW",
      },
    ],
  },
];

export const historifyItems: NavItemType[] = [
  {
    label: "Historify",
    href: "/historify",
    icon: <Database className="w-4 h-4" />,
    badge: "DATA",
    children: [
      {
        label: "Live Trading",
        href: "/historify/live",
        icon: <Activity className="w-4 h-4" />,
        badge: "LIVE",
      },
      {
        label: "Dashboard",
        href: "/historify",
        icon: <Activity className="w-4 h-4" />,
      },
      {
        label: "Watchlist",
        href: "/historify/watchlist",
        icon: <List className="w-4 h-4" />,
      },
      {
        label: "Charts",
        href: "/historify/charts",
        icon: <BarChart2 className="w-4 h-4" />,
      },
      {
        label: "Day Chart",
        href: "/historify/day-chart",
        icon: <CalendarDays className="w-4 h-4" />,
        badge: "NEW",
      },
      {
        label: "Download",
        href: "/historify/download",
        icon: <Download className="w-4 h-4" />,
      },
      {
        label: "Import",
        href: "/historify/import",
        icon: <Upload className="w-4 h-4" />,
      },
      {
        label: "Export",
        href: "/historify/export",
        icon: <HardDrive className="w-4 h-4" />,
      },
      {
        label: "Scheduler",
        href: "/historify/scheduler",
        icon: <Clock className="w-4 h-4" />,
      },
      {
        label: "Settings",
        href: "/historify/settings",
        icon: <Settings className="w-4 h-4" />,
      },
    ],
  },
];

export const quantLabItems: NavItemType[] = [
  {
    label: "Quant Lab",
    href: "/quant",
    icon: <TestTube2 className="w-4 h-4" />,
    badge: "NEW",
    children: [
      {
        label: "Sector Rotation",
        href: "/quant/sector-rotation",
        icon: <Compass className="w-4 h-4" />,
        badge: "NEW",
      },
      {
        label: "Backtester",
        href: "/quant/backtester",
        icon: <FlaskConical className="w-4 h-4" />,
        badge: "NEW",
      },
    ],
  },
];

export const v01Items: NavItemType[] = [
  {
    label: "v0.1 (Legacy)",
    href: "/v0.1",
    icon: <Layers className="w-4 h-4" />,
    children: [
      {
        label: "Learning Modules",
        href: "/learning-group",
        icon: <GraduationCap className="w-4 h-4" />,
        children: learningItems,
      },
      {
        label: "Live Intelligence",
        href: "/live-group",
        icon: <Activity className="w-4 h-4" />,
        children: liveTools,
      },
      {
        label: "Lab Environments",
        href: "/lab-group",
        icon: <FlaskConical className="w-4 h-4" />,
        children: backtestingItems,
      },
    ],
  },
];

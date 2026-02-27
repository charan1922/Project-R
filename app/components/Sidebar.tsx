"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Activity,
  FlaskConical,
  Cpu,
  LineChart,
  Play,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  BookOpen,
  Layers,
  Brain,
  Target,
  Calculator,
  Zap,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: NavItem[];
}

const learningItems: NavItem[] = [
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

const liveTools: NavItem[] = [
  {
    label: "Market Intelligence",
    href: "/trading-lab/intelligence",
    icon: <Brain className="w-4 h-4" />,
    badge: "NEW",
  },
  {
    label: "R-Factor Engine",
    href: "/learning/r-factor-engine",
    icon: <Activity className="w-4 h-4" />,
    badge: "LIVE",
  },
];

const backtestingItems: NavItem[] = [
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

const v01Items: NavItem[] = [
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

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["/v0.1"]);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const toggleExpand = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href)
        ? prev.filter((h) => h !== href)
        : [...prev, href]
    );
  };

  const renderNavItem = (item: NavItem, depth = 0) => {
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.includes(item.href);
    const active = isActive(item.href);

    return (
      <div key={item.href}>
        <div className="flex items-center">
          <Link
            href={hasChildren ? "#" : item.href}
            onClick={(e) => {
              if (hasChildren) {
                e.preventDefault();
                toggleExpand(item.href);
              }
              setIsMobileMenuOpen(false);
            }}
            className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ease-in-out flex-1 ${
              active
                ? "bg-slate-800/80 text-slate-100 shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
            } ${depth > 0 ? `ml-${depth * 4} text-sm` : "text-sm font-medium"}`}
          >
            <div className={`flex-shrink-0 transition-colors ${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`}>
              {item.icon}
            </div>
            <span className="flex-1 tracking-tight">{item.label}</span>
            {item.badge && (
              <span
                className={`px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded-sm ${
                  item.badge === "LIVE"
                    ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                    : item.badge === "NEW"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : item.badge === "PRO"
                    ? "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20"
                    : "bg-slate-800 text-slate-400 border border-slate-700"
                }`}
              >
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <span className="p-0.5 text-slate-500 group-hover:text-slate-300 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="w-3.5 h-3.5" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </span>
            )}
          </Link>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1 mb-2 space-y-0.5 border-l border-slate-800 ml-5 pl-2">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-slate-950 border-b border-slate-800/60 z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded border border-sky-500/30 bg-sky-500/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-sky-400" />
          </div>
          <span className="text-base font-semibold tracking-tight text-slate-100">DeepQuant</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
        >
          {isMobileMenuOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar - Enterprise Style */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-950 border-r border-slate-800/60 z-50 transform transition-transform duration-300 ease-out
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          lg:static lg:transform-none flex flex-col`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center px-5 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group w-full">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-sm flex items-center justify-center group-hover:border-sky-500/50 transition-colors">
              <Activity className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-100 leading-tight">DeepQuant</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Enterprise Analytics</span>
            </div>
          </Link>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-6 px-3.5 space-y-6 overflow-y-auto custom-scrollbar">
          
          <div className="space-y-1.5">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>System Version</span>
              <div className="h-px bg-slate-800/60 flex-1"></div>
            </div>
            {v01Items.map((item) => renderNavItem(item))}
          </div>

        </nav>
        
        {/* Subdued footer watermark */}
        <div className="p-4 border-t border-slate-800/60 text-center">
           <span className="text-[10px] text-slate-600 font-mono tracking-widest">SYSTEM V2.5.0</span>
        </div>
      </aside>

      {/* Main content spacer for mobile */}
      <div className="lg:hidden h-14" />
    </>
  );
}
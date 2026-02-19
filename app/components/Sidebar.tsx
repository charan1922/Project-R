"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  TrendingUp,
  Calendar,
  BarChart3,
  Settings,
  Menu,
  X,
  PieChart,
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
  BarChart2,
  Brain,
  Target,
  Lightbulb,
  ExternalLink,
  FileText,
  Calculator,
} from "lucide-react";
import { useState } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
  children?: NavItem[];
  external?: boolean;
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: <LayoutDashboard className="w-5 h-5" />,
  },
  {
    label: "Sector Scope",
    href: "/sector-scope",
    icon: <PieChart className="w-5 h-5" />,
    badge: "LIVE",
  },
  {
    label: "Stocks Universe",
    href: "/stocks",
    icon: <Building2 className="w-5 h-5" />,
    badge: "88",
  },
  {
    label: "Trade History",
    href: "/trades",
    icon: <TrendingUp className="w-5 h-5" />,
    badge: "255",
  },
  {
    label: "Daily P&L",
    href: "/daily",
    icon: <Calendar className="w-5 h-5" />,
  },
];

const learningItems: NavItem[] = [
  {
    label: "Learning",
    href: "/learning",
    icon: <GraduationCap className="w-5 h-5" />,
    badge: "NEW",
    children: [
      {
        label: "1. Stock Market Basics",
        href: "/learning/stock-basics",
        icon: <BookOpen className="w-4 h-4" />,
      },
      {
        label: "2. Options Trading 101",
        href: "/learning/options-101",
        icon: <Layers className="w-4 h-4" />,
      },
      {
        label: "3. Volume & OI Analysis",
        href: "/learning/volume-oi",
        icon: <BarChart2 className="w-4 h-4" />,
      },
      {
        label: "4. Z-Score & R-Factor",
        href: "/learning/z-score-r-factor",
        icon: <Calculator className="w-4 h-4" />,
      },
      {
        label: "5. Smart Money Detection",
        href: "/learning/smart-money",
        icon: <Brain className="w-4 h-4" />,
      },
      {
        label: "6. Breakout Strategies",
        href: "/learning/breakout-strategies",
        icon: <Target className="w-4 h-4" />,
      },
      {
        label: "7. Backtesting Fundamentals",
        href: "/learning/backtesting-fundamentals",
        icon: <Lightbulb className="w-4 h-4" />,
      },
    ],
  },
];

const websiteItems: NavItem[] = [
  {
    label: "Deep Quant Lab",
    href: "/learning/deep-quant-lab",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    label: "R-Factor Engine",
    href: "/learning/r-factor-engine",
    icon: <FileText className="w-4 h-4" />,
  },
];

const backtestingItems: NavItem[] = [
  {
    label: "Backtesting",
    href: "/backtesting",
    icon: <FlaskConical className="w-5 h-5" />,
    badge: "LAB",
    children: [
      {
        label: "Strategy Backtest",
        href: "/backtesting/playground",
        icon: <LineChart className="w-4 h-4" />,
      },
      {
        label: "Live Scanner",
        href: "/trading-lab/scanner",
        icon: <Cpu className="w-4 h-4" />,
      },
      {
        label: "Algo Execute",
        href: "/trading-lab/execute",
        icon: <Play className="w-4 h-4" />,
      },
    ],
  },
];

const systemItems: NavItem[] = [
  {
    label: "Analytics",
    href: "/analytics",
    icon: <BarChart3 className="w-5 h-5" />,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: <Settings className="w-5 h-5" />,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["/learning", "/backtesting"]);

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
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors flex-1 ${
              active
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            } ${depth > 0 ? "ml-4 text-sm" : ""}`}
          >
            {item.icon}
            <span className="flex-1">{item.label}</span>
            {item.badge && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  item.badge === "LIVE"
                    ? "bg-red-500/20 text-red-400 animate-pulse"
                    : item.badge === "NEW"
                    ? "bg-sky-500/20 text-sky-400"
                    : item.badge === "LAB"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-slate-800 text-slate-400"
                }`}
              >
                {item.badge}
              </span>
            )}
            {hasChildren && (
              <span className="p-1">
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </span>
            )}
          </Link>
        </div>
        {hasChildren && isExpanded && (
          <div className="mt-1 space-y-1">
            {item.children!.map((child) => renderNavItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-slate-900 border-b border-slate-800 z-50 flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
            <Activity className="w-5 h-5 text-slate-950" />
          </div>
          <span className="text-lg font-bold text-slate-100">DeepQuant</span>
        </Link>
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
        >
          {isMobileMenuOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <Menu className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-slate-950/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 border-r border-slate-800 z-50 transform transition-transform duration-300 ease-in-out
          ${
            isMobileMenuOpen
              ? "translate-x-0"
              : "-translate-x-full lg:translate-x-0"
          }
          lg:static lg:transform-none flex flex-col`}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center">
              <Activity className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <span className="text-lg font-bold text-slate-100">DeepQuant</span>
              <p className="text-xs text-slate-500">Trading Analytics</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-2">
            Main
          </div>
          {navItems.map((item) => renderNavItem(item))}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mt-6 mb-2">
            Learning
          </div>
          {learningItems.map((item) => renderNavItem(item))}
          {/* Website sub-items under Learning section */}
          <div className="text-xs font-semibold text-slate-600 uppercase tracking-wider px-3 ml-4 mt-3 mb-1">
            Reference Sites
          </div>
          {websiteItems.map((item) => renderNavItem(item, 1))}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mt-6 mb-2">
            Backtesting
          </div>
          {backtestingItems.map((item) => renderNavItem(item))}

          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mt-6 mb-2">
            System
          </div>
          {systemItems.map((item) => renderNavItem(item))}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-800/50">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="text-sm font-semibold text-emerald-400">P</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-200 truncate">Portfolio</p>
              <p className="text-xs text-slate-500">255 trades</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content spacer for mobile */}
      <div className="lg:hidden h-16" />
    </>
  );
}

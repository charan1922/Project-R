"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  Activity,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { v1Items, historifyItems, quantLabItems, v01Items } from "./_sidebar/nav-data";
import { NavItem } from "./_sidebar/NavItem";

export default function Sidebar() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>(["/v1", "/historify"]);

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

  const commonProps = {
    isActive,
    expandedItems,
    toggleExpand,
    onMobileClick: () => setIsMobileMenuOpen(false),
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
          ${isMobileMenuOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
          }
          lg:static lg:transform-none flex flex-col`}
      >
        {/* Logo Section */}
        <div className="h-16 flex items-center justify-between px-5 border-b border-slate-800/60">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 shadow-sm flex items-center justify-center group-hover:border-sky-500/50 transition-colors">
              <Activity className="w-4 h-4 text-slate-300 group-hover:text-sky-400 transition-colors" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-semibold tracking-tight text-slate-100 leading-tight">DeepQuant</span>
              <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium">Enterprise Analytics</span>
            </div>
          </Link>
          <ThemeToggle />
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 py-6 px-3.5 space-y-6 overflow-y-auto custom-scrollbar">

          <div className="space-y-1.5">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Current System</span>
              <div className="h-px bg-slate-800/60 flex-1"></div>
            </div>
            {v1Items.map((item) => (
              <NavItem key={item.href} item={item} {...commonProps} />
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="px-2 text-[10px] font-bold text-teal-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Data Platform</span>
              <div className="h-px bg-teal-800/40 flex-1"></div>
            </div>
            {historifyItems.map((item) => (
              <NavItem key={item.href} item={item} {...commonProps} />
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="px-2 text-[10px] font-bold text-violet-600 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Quant Lab</span>
              <div className="h-px bg-violet-800/40 flex-1"></div>
            </div>
            {quantLabItems.map((item) => (
              <NavItem key={item.href} item={item} {...commonProps} />
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="px-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
              <span>Legacy Features</span>
              <div className="h-px bg-slate-800/60 flex-1"></div>
            </div>
            {v01Items.map((item) => (
              <NavItem key={item.href} item={item} {...commonProps} />
            ))}
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
"use client";

import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { NavItemType } from "./nav-data";

interface NavItemProps {
  item: NavItemType;
  depth?: number;
  isActive: (href: string) => boolean;
  expandedItems: string[];
  toggleExpand: (href: string) => void;
  onMobileClick: () => void;
}

export function NavItem({
  item,
  depth = 0,
  isActive,
  expandedItems,
  toggleExpand,
  onMobileClick,
}: NavItemProps) {
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
            onMobileClick();
          }}
          className={`group flex items-center gap-3 px-3 py-2 rounded-md transition-all duration-200 ease-in-out flex-1 ${
            active
              ? "bg-slate-800/80 text-slate-100 shadow-sm"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
          } ${depth > 0 ? `ml-${depth * 4} text-sm` : "text-sm font-medium"}`}
        >
          <div
            className={`flex-shrink-0 transition-colors ${
              active ? "text-sky-400" : "text-slate-500 group-hover:text-slate-300"
            }`}
          >
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
                  : item.badge === "ANALYTICS"
                  ? "bg-violet-500/10 text-violet-400 border border-violet-500/20"
                  : item.badge === "DATA"
                  ? "bg-teal-500/10 text-teal-400 border border-teal-500/20"
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
          {item.children!.map((child) => (
            <NavItem
              key={child.href}
              item={child}
              depth={depth + 1}
              isActive={isActive}
              expandedItems={expandedItems}
              toggleExpand={toggleExpand}
              onMobileClick={onMobileClick}
            />
          ))}
        </div>
      )}
    </div>
  );
}

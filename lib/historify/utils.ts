/**
 * Formats a number for display (e.g., 1.2M, 50K)
 */
export const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
};

/**
 * Formats a timestamp to a human-readable time string (IST)
 */
export const formatTimestamp = (ts: number | null) => {
  if (!ts) return "Never";
  return (
    new Date(ts * 1000).toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }) + " IST"
  );
};

/**
 * Calculates a 'from' date string based on a preset (e.g., '30d', '1y')
 */
export function computeFromDate(preset: string): string {
  const d = new Date();
  if (preset === "today") return d.toISOString().split("T")[0];
  
  const map: Record<string, number> = {
    "5d": 5,
    "30d": 30,
    "90d": 90,
    "1y": 365,
    "2y": 730,
    "5y": 1825,
  };
  
  d.setDate(d.getDate() - (map[preset] ?? 30));
  return d.toISOString().split("T")[0];
}

/**
 * Activity icon configuration
 */
import { Download, Upload, Clock, AlertCircle, Activity } from "lucide-react";

export const ACTIVITY_CONFIG: Record<string, { icon: any; bg: string; ic: string }> = {
  download: { icon: Download, bg: "bg-sky-500/10 border-sky-500/20", ic: "text-sky-400" },
  import: { icon: Upload, bg: "bg-teal-500/10 border-teal-500/20", ic: "text-teal-400" },
  scheduled_sync: { icon: Clock, bg: "bg-emerald-500/10 border-emerald-500/20", ic: "text-emerald-400" },
  error: { icon: AlertCircle, bg: "bg-red-500/10 border-red-500/20", ic: "text-red-400" },
};

export const DEFAULT_ACTIVITY_CONFIG = {
  icon: Activity,
  bg: "bg-slate-700/30 border-slate-600/20",
  ic: "text-slate-400",
};

export const DATE_PRESETS: [string, string][] = [
  ["5d", "Last 5 Days"],
  ["30d", "Last 30 Days"],
  ["90d", "Last 90 Days"],
  ["1y", "Last 1 Year"],
  ["2y", "Last 2 Years"],
  ["5y", "Last 5 Years"],
  ["today", "Today"],
];

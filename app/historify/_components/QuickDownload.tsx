"use client";

import { useState } from "react";
import { Download, ChevronDown, ChevronUp, Loader2, Play } from "lucide-react";
import { DATE_PRESETS, computeFromDate } from "@/lib/historify/utils";
import { WatchlistItem } from "@/lib/historify/types";

interface QuickDownloadProps {
  watchlist: WatchlistItem[];
  onRefresh: () => Promise<void>;
}

export function QuickDownload({ watchlist, onRefresh }: QuickDownloadProps) {
  const [showQuickDl, setShowQuickDl] = useState(false);
  const [dlChecked, setDlChecked] = useState<Set<string>>(new Set());
  const [dlInterval, setDlInterval] = useState("Daily");
  const [dlPreset, setDlPreset] = useState("30d");
  const [dlMode, setDlMode] = useState<"fresh" | "continue">("continue");
  const [dlRunning, setDlRunning] = useState(false);

  const startQuickDownload = async () => {
    if (dlChecked.size === 0) return;
    setDlRunning(true);
    const fromDate = computeFromDate(dlPreset);
    const toDate = new Date().toISOString().split("T")[0];
    
    for (const sym of dlChecked) {
      const wItem = watchlist.find((w) => w.symbol === sym);
      try {
        await fetch("/api/historify/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            symbol: sym,
            exchange: wItem?.exchange ?? "NSE",
            interval: dlInterval,
            fromDate,
            toDate,
          }),
        });
      } catch (err) {
        console.error(`Failed to sync ${sym}:`, err);
      }
    }
    
    setDlRunning(false);
    await onRefresh();
  };

  const toggleAll = () => {
    if (dlChecked.size === watchlist.length) {
      setDlChecked(new Set());
    } else {
      setDlChecked(new Set(watchlist.map((w) => w.symbol)));
    }
  };

  const toggleSymbol = (symbol: string) => {
    setDlChecked((prev) => {
      const next = new Set(prev);
      if (next.has(symbol)) {
        next.delete(symbol);
      } else {
        next.add(symbol);
      }
      return next;
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setShowQuickDl((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest">
            Quick Data Download
          </span>
        </div>
        {showQuickDl ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      
      {showQuickDl && (
        <div className="border-t border-slate-800 p-5 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-slate-500 uppercase tracking-wider">
                  Select Symbols
                </span>
                <button
                  onClick={toggleAll}
                  className="text-xs text-teal-400 hover:text-teal-300"
                >
                  {dlChecked.size === watchlist.length ? "Deselect All" : "Select All"}
                </button>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 max-h-40 overflow-y-auto space-y-1">
                {watchlist.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">No symbols in watchlist</p>
                ) : (
                  watchlist.map((w) => (
                    <label
                      key={w.symbol}
                      className="flex items-center gap-2 cursor-pointer hover:bg-slate-700/30 rounded px-1 py-0.5"
                    >
                      <input
                        type="checkbox"
                        checked={dlChecked.has(w.symbol)}
                        onChange={() => toggleSymbol(w.symbol)}
                        className="rounded border-slate-600 accent-teal-500"
                      />
                      <span className="text-sm font-mono text-white">{w.symbol}</span>
                      <span className="text-xs text-slate-500">{w.exchange}</span>
                    </label>
                  ))
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                  Interval
                </label>
                <select
                  value={dlInterval}
                  onChange={(e) => setDlInterval(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {["1min", "5min", "15min", "30min", "1hour", "Daily"].map((i) => (
                    <option key={i}>{i}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-500 uppercase tracking-wider mb-1 block">
                  Date Range
                </label>
                <select
                  value={dlPreset}
                  onChange={(e) => setDlPreset(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500"
                >
                  {DATE_PRESETS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg">
                {(["continue", "fresh"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setDlMode(m)}
                    className={`flex-1 py-1.5 rounded-md text-xs font-medium capitalize transition-all ${
                      dlMode === m ? "bg-slate-700 text-white" : "text-slate-400"
                    }`}
                  >
                    {m === "continue" ? "Incremental" : "Fresh"}
                  </button>
                ))}
              </div>
              <button
                onClick={startQuickDownload}
                disabled={dlChecked.size === 0 || dlRunning}
                className="w-full flex items-center justify-center gap-2 py-2.5 text-sm bg-sky-600 hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg text-white font-medium"
              >
                {dlRunning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                {dlRunning ? "Downloading…" : `Start Download (${dlChecked.size} symbols)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

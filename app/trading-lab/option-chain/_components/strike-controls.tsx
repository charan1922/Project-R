'use client';

import { Search } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { StrikeCount } from '../_hooks/use-option-chain';

const STRIKE_OPTIONS: StrikeCount[] = ['all', 5, 10, 15, 20, 25];

// F&O stocks for dropdown — loaded once
let fnoStocksCache: string[] | null = null;
async function getFnoStocks(): Promise<string[]> {
  if (fnoStocksCache) return fnoStocksCache;
  try {
    const res = await fetch('/api/r-factor?limit=206');
    const data = await res.json();
    if (data.success && data.data) {
      fnoStocksCache = data.data.map((s: { symbol: string }) => s.symbol).sort();
      return fnoStocksCache!;
    }
  } catch {
    /* ignore */
  }
  return [];
}

interface StrikeControlsProps {
  symbol: string;
  onSymbolChange: (s: string) => void;
  price: number;
  changePct: number;
  expiries: string[];
  selectedExpiry: string;
  onExpiryChange: (e: string) => void;
  strikesAround: StrikeCount;
  onStrikesChange: (n: StrikeCount) => void;
  loading: boolean;
}

export function StrikeControls({
  symbol,
  onSymbolChange,
  price,
  changePct,
  expiries,
  selectedExpiry,
  onExpiryChange,
  strikesAround,
  onStrikesChange,
  loading,
}: StrikeControlsProps) {
  const [query, setQuery] = useState(symbol);
  const [open, setOpen] = useState(false);
  const [allStocks, setAllStocks] = useState<string[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getFnoStocks().then(setAllStocks);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const filtered = useMemo(() => {
    if (!query) return allStocks.slice(0, 20);
    const q = query.toUpperCase();
    return allStocks.filter((s) => s.includes(q)).slice(0, 20);
  }, [query, allStocks]);

  const selectSymbol = (s: string) => {
    setQuery(s);
    setOpen(false);
    onSymbolChange(s);
  };

  return (
    <div className="w-72 shrink-0 space-y-4">
      {/* Symbol search dropdown */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setOpen(true);
                }}
                onFocus={() => setOpen(true)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && query) selectSymbol(query);
                  if (e.key === 'Escape') setOpen(false);
                }}
                placeholder="Search stock..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-none focus:border-sky-500"
              />
            </div>
            {loading && (
              <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
          {open && filtered.length > 0 && (
            <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl max-h-60 overflow-y-auto">
              {filtered.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => selectSymbol(s)}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-slate-700 transition-colors ${
                    s === symbol ? 'text-sky-400 font-medium' : 'text-slate-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
        {price > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-white font-mono">{price.toFixed(1)}</span>
            <span className={`text-sm font-medium ${changePct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {changePct >= 0 ? '+' : ''}
              {changePct.toFixed(2)}%
            </span>
          </div>
        )}
      </div>

      {/* Expiries */}
      {expiries.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Expiries Included</p>
          <div className="space-y-1.5">
            {expiries.map((exp) => {
              const days = Math.ceil((new Date(exp).getTime() - Date.now()) / 86400000);
              return (
                <label key={exp} className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedExpiry === exp}
                    onChange={() => onExpiryChange(exp)}
                    className="w-3.5 h-3.5 rounded accent-sky-500"
                  />
                  <span className="text-white">
                    {new Date(`${exp}T00:00:00`).toLocaleDateString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                  <span className="text-slate-500 text-xs">({days} days)</span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      {/* Strikes around ATM */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Strikes above and below ATM</p>
        <div className="flex flex-wrap gap-1.5">
          {STRIKE_OPTIONS.map((n) => (
            <button
              key={String(n)}
              type="button"
              onClick={() => onStrikesChange(n)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                strikesAround === n
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
              }`}
            >
              {n === 'all' ? 'Show All' : n}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

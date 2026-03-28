'use client';

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  BarChart2,
  CalendarIcon,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  RefreshCw,
  Search,
  Upload,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface TfRow {
  symbol: string;
  rFactor: number;
  ltp: number;
  prevClose: number;
  pctChange: number;
}

interface DateSummary {
  date: string;
  stocks: number;
}

type SortField = 'symbol' | 'rFactor' | 'ltp' | 'pctChange' | 'absChange';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function rfColor(r: number) {
  if (r >= 3) return 'text-emerald-300';
  if (r >= 2) return 'text-emerald-400';
  if (r >= 1.5) return 'text-sky-400';
  if (r >= 1) return 'text-slate-300';
  return 'text-slate-500';
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TfSnapshotPage() {
  const [dates, setDates] = useState<DateSummary[]>([]);
  const [selectedDate, setSelectedDate] = useState('');
  const [rows, setRows] = useState<TfRow[]>([]);
  const [loadingDates, setLoadingDates] = useState(true);
  const [loadingRows, setLoadingRows] = useState(false);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('rFactor');
  const [sortAsc, setSortAsc] = useState(false);

  // Import panel
  const [importDate, setImportDate] = useState('');
  const [importText, setImportText] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<string | null>(null);
  const [showImport, setShowImport] = useState(false);

  const abortRef = useRef<AbortController | null>(null);

  // Load available dates
  const loadDates = useCallback(async () => {
    setLoadingDates(true);
    try {
      const res = await fetch('/api/tf-snapshot?dates=true');
      const d = await res.json();
      if (d.success) {
        setDates(d.dates ?? []);
        if (d.dates?.length && !selectedDate) {
          setSelectedDate(d.dates[0].date);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingDates(false);
    }
  }, [selectedDate]);

  // Load rows for selected date
  const loadRows = useCallback(async (date: string) => {
    if (!date) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoadingRows(true);
    setRows([]);
    try {
      const res = await fetch(`/api/tf-snapshot?date=${date}`, { signal: ctrl.signal });
      const d = await res.json();
      if (d.success) setRows(d.stocks ?? []);
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
    } finally {
      setLoadingRows(false);
    }
  }, []);

  useEffect(() => {
    loadDates();
  }, [loadDates]);

  useEffect(() => {
    if (selectedDate) loadRows(selectedDate);
  }, [selectedDate, loadRows]);

  // Sort + filter
  const filtered = rows
    .filter((r) => r.symbol.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      let diff = 0;
      if (sortField === 'symbol') diff = a.symbol.localeCompare(b.symbol);
      else if (sortField === 'rFactor') diff = a.rFactor - b.rFactor;
      else if (sortField === 'ltp') diff = a.ltp - b.ltp;
      else if (sortField === 'pctChange') diff = a.pctChange - b.pctChange;
      else if (sortField === 'absChange') diff = a.ltp - a.prevClose - (b.ltp - b.prevClose);
      return sortAsc ? diff : -diff;
    });

  const handleSort = (f: SortField) => {
    if (sortField === f) setSortAsc((v) => !v);
    else {
      setSortField(f);
      setSortAsc(false);
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 opacity-40" />;
    return sortAsc ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  // Stats
  const avgR = rows.length ? (rows.reduce((s, r) => s + r.rFactor, 0) / rows.length).toFixed(2) : '—';
  const maxR = rows.length ? Math.max(...rows.map((r) => r.rFactor)).toFixed(2) : '—';
  const upCount = rows.filter((r) => r.pctChange > 0).length;
  const downCount = rows.filter((r) => r.pctChange < 0).length;

  // Import handler
  const handleImport = async () => {
    if (!importText.trim() || !importDate) return;
    setImporting(true);
    setImportResult(null);
    try {
      let parsed: unknown;
      try {
        parsed = JSON.parse(importText.trim());
      } catch {
        setImportResult('❌ Invalid JSON — paste the raw intraday_boost array or full JSON object');
        return;
      }

      // Support pasting: raw array, { intraday_boost: [] }, or full ground-truth object
      let body: Record<string, unknown> = { date: importDate, replaceDate: importDate };
      if (Array.isArray(parsed)) {
        body.intraday_boost = parsed;
      } else if ((parsed as any)?.intraday_boost) {
        body.intraday_boost = (parsed as any).intraday_boost;
      } else if ((parsed as any)?.data?.intraday_boost) {
        body = { ...body, data: (parsed as any).data };
      } else {
        setImportResult('❌ Could not find intraday_boost array in pasted content');
        return;
      }

      const res = await fetch('/api/tf-snapshot/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (d.success) {
        setImportResult(`✅ Imported ${d.imported} stocks for ${d.date}`);
        setImportText('');
        await loadDates();
        setSelectedDate(importDate);
      } else {
        setImportResult(`❌ ${d.error}`);
      }
    } catch (e) {
      setImportResult(`❌ ${(e as Error).message}`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 max-w-[1300px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <BarChart2 className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">TF R-Factor Snapshots</h1>
            <p className="text-xs text-slate-500">Real TradeFinder R-Factor data · {dates.length} dates available</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowImport((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-violet-500/30 bg-violet-500/10 text-violet-300 text-xs hover:bg-violet-500/20 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
            Import
          </button>
          <button
            type="button"
            onClick={loadDates}
            className="p-2 rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingDates ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Import Panel */}
      {showImport && (
        <div className="mb-5 rounded-xl border border-violet-500/20 bg-slate-950/80 p-4">
          <h2 className="text-sm font-semibold text-violet-300 mb-3 flex items-center gap-2">
            <Upload className="w-4 h-4" />
            Import TF Snapshot
          </h2>
          <p className="text-xs text-slate-500 mb-3">
            Paste the <code className="text-violet-300">intraday_boost</code> JSON array (or the full TF API response).
            Select the date it was captured.
          </p>
          <div className="flex gap-3 mb-3">
            <div className="flex flex-col gap-1">
              <label htmlFor="importDate" className="text-[10px] uppercase tracking-wider text-slate-600">
                Capture date
              </label>
              <input
                id="importDate"
                type="date"
                value={importDate}
                onChange={(e) => setImportDate(e.target.value)}
                className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-white focus:outline-none focus:border-violet-500/50"
              />
            </div>
          </div>
          <textarea
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
            placeholder={
              'Paste JSON here — either:\n  [ {"Symbol":"RELIANCE", "param_0": ..., "param_3": ...}, ... ]\nor the full API response with intraday_boost key'
            }
            rows={6}
            className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono placeholder:text-slate-700 focus:outline-none focus:border-violet-500/50 resize-none mb-3"
          />
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={importing || !importDate || !importText.trim()}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {importing ? 'Importing...' : 'Import'}
            </button>
            {importResult && (
              <span className={`text-sm ${importResult.startsWith('✅') ? 'text-emerald-400' : 'text-red-400'}`}>
                {importResult}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Main layout: date sidebar + table */}
      <div className="flex gap-4">
        {/* Date sidebar */}
        <div className="w-44 flex-shrink-0">
          <div className="rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-800 flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-slate-500" />
              <span className="text-[10px] uppercase tracking-wider text-slate-500">Dates</span>
            </div>
            {loadingDates ? (
              <div className="p-4 text-center">
                <Loader2 className="w-4 h-4 animate-spin mx-auto text-slate-600" />
              </div>
            ) : dates.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-600">No data yet</div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto">
                {dates.map((d) => (
                  <button
                    key={d.date}
                    type="button"
                    onClick={() => setSelectedDate(d.date)}
                    className={`w-full text-left px-3 py-2.5 border-b border-slate-800/40 transition-colors ${
                      selectedDate === d.date
                        ? 'bg-violet-500/15 border-l-2 border-l-violet-500 text-violet-200'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                    }`}
                  >
                    <div className="text-xs font-medium">
                      {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                    <div className="text-[10px] text-slate-600">
                      {new Date(`${d.date}T00:00:00`).toLocaleDateString('en-IN', {
                        weekday: 'short',
                        year: '2-digit',
                      })}
                    </div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{d.stocks} stocks</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {/* Date header + stats */}
          {selectedDate && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="text-base font-semibold text-white">{fmtDate(selectedDate)}</h2>
                  <p className="text-xs text-slate-500">{rows.length} stocks · TradeFinder R-Factor</p>
                </div>
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[
                  { label: 'Stocks', value: rows.length, color: 'text-white' },
                  { label: 'Avg R', value: avgR, color: 'text-sky-400' },
                  { label: 'Max R', value: maxR, color: 'text-violet-400' },
                  {
                    label: 'Up / Down',
                    value: `${upCount} / ${downCount}`,
                    color: 'text-emerald-400',
                  },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg bg-slate-900 border border-slate-800 px-3 py-2">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wide">{s.label}</div>
                    <div className={`text-sm font-semibold mt-0.5 ${s.color}`}>{s.value}</div>
                  </div>
                ))}
              </div>

              {/* Search */}
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value.toUpperCase())}
                  placeholder="Search symbol..."
                  className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
                />
              </div>
            </div>
          )}

          {/* Table */}
          <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 bg-slate-800/50 text-[10px] text-slate-500 uppercase tracking-wider font-medium">
              <SortBtn field="symbol" onSort={handleSort}>
                Symbol <SortIcon field="symbol" />
              </SortBtn>
              <SortBtn field="rFactor" onSort={handleSort}>
                TF R-Factor <SortIcon field="rFactor" />
              </SortBtn>
              <SortBtn field="pctChange" onSort={handleSort}>
                % Change <SortIcon field="pctChange" />
              </SortBtn>
              <SortBtn field="absChange" onSort={handleSort}>
                ₹ Change <SortIcon field="absChange" />
              </SortBtn>
              <SortBtn field="ltp" onSort={handleSort}>
                LTP <SortIcon field="ltp" />
              </SortBtn>
              <span>Prev Close</span>
              <span>Signal</span>
            </div>

            {/* Loading */}
            {loadingRows && (
              <div className="py-16 text-center">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
                <p className="text-sm text-slate-500">Loading {fmtDate(selectedDate)}...</p>
              </div>
            )}

            {/* Empty state */}
            {!loadingRows && !selectedDate && (
              <div className="py-16 text-center">
                <CalendarIcon className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">Select a date to view TF data</p>
                <p className="text-xs text-slate-600 mt-1">Or import data using the Import button above</p>
              </div>
            )}

            {!loadingRows && selectedDate && filtered.length === 0 && (
              <div className="py-16 text-center">
                <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-500">
                  {rows.length === 0 ? 'No data for this date' : 'No symbols match your search'}
                </p>
              </div>
            )}

            {!loadingRows &&
              filtered.map((r, i) => {
                const isUp = r.pctChange > 0;
                const isDown = r.pctChange < 0;
                const isHighR = r.rFactor >= 2.5;
                const absChange = r.prevClose > 0 ? r.ltp - r.prevClose : null;
                return (
                  <div
                    key={r.symbol}
                    className={`grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr_1fr] gap-2 px-4 py-2.5 items-center transition-colors hover:bg-slate-800/40 ${
                      i < filtered.length - 1 ? 'border-b border-slate-800/50' : ''
                    } ${isHighR ? 'bg-violet-500/5 border-l-2 border-l-violet-500/50' : ''}`}
                  >
                    {/* Symbol */}
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${isHighR ? 'text-violet-200' : 'text-white'}`}>
                        {r.symbol}
                      </span>
                      {isHighR && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-violet-500/20 text-violet-400 border border-violet-500/30 rounded">
                          HIGH R
                        </span>
                      )}
                    </div>

                    {/* R-Factor */}
                    <div className={`text-sm font-bold font-mono ${rfColor(r.rFactor)}`}>{r.rFactor.toFixed(4)}</div>

                    {/* % Change (Pill Badge) */}
                    <div>
                      <span
                        className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                          isUp
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : isDown
                              ? 'bg-red-500/20 text-red-400'
                              : 'bg-slate-500/20 text-slate-400'
                        }`}
                      >
                        {r.pctChange > 0 ? '+' : ''}
                        {r.pctChange.toFixed(2)}%
                      </span>
                    </div>

                    {/* ₹ Change */}
                    <div
                      className={`text-sm font-mono font-medium ${
                        absChange === null
                          ? 'text-slate-600'
                          : absChange > 0
                            ? 'text-emerald-400'
                            : absChange < 0
                              ? 'text-red-400'
                              : 'text-slate-500'
                      }`}
                    >
                      {absChange === null ? '—' : `${absChange > 0 ? '+' : ''}${absChange.toFixed(2)}`}
                    </div>

                    {/* LTP */}
                    <div className="text-sm font-mono text-slate-300">
                      {r.ltp > 0 ? r.ltp.toLocaleString('en-IN') : '—'}
                    </div>

                    {/* Prev Close */}
                    <div className="text-sm font-mono text-slate-500">
                      {r.prevClose > 0 ? r.prevClose.toLocaleString('en-IN') : '—'}
                    </div>

                    {/* Signal */}
                    <div className="flex items-center px-2">
                      {isUp ? (
                        <ArrowUp className="w-5 h-5 text-emerald-500" strokeWidth={3} />
                      ) : isDown ? (
                        <ArrowDown className="w-5 h-5 text-red-500" strokeWidth={3} />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>

          {/* Footer count */}
          {!loadingRows && filtered.length > 0 && (
            <div className="mt-2 text-right text-xs text-slate-600">
              {filtered.length} of {rows.length} stocks
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tiny sort button component ───────────────────────────────────────────────

function SortBtn({
  field,
  onSort,
  children,
}: {
  field: SortField;
  onSort: (f: SortField) => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="flex items-center gap-1 hover:text-slate-300 text-left transition-colors"
    >
      {children}
    </button>
  );
}

'use client';

import { format } from 'date-fns';
import { BarChart2, CalendarIcon, Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import DatePicker from 'react-datepicker';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import 'react-datepicker/dist/react-datepicker.css';

const PRESETS = [
  { label: '1W', count: 5 },
  { label: '1M', count: 20 },
  { label: '3M', count: 60 },
];

function formatTradingDate(date: string): string {
  if (!date) return 'Select date';
  return format(new Date(`${date}T00:00:00`), 'MMM dd, yyyy');
}

function toDateValue(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function toDateKey(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function formatSyncError(payload: Record<string, unknown>): string {
  if (payload.code === 'DHAN_DATE_UNAVAILABLE') {
    const requestedDate = typeof payload.requestedDate === 'string' ? payload.requestedDate : null;
    const latestAvailableDate = typeof payload.latestAvailableDate === 'string' ? payload.latestAvailableDate : null;
    return requestedDate && latestAvailableDate
      ? `Dhan does not have ${requestedDate} yet. Latest available date is ${latestAvailableDate}.`
      : 'Dhan data for the selected date is not available yet.';
  }

  return typeof payload.error === 'string' ? payload.error : 'Request failed';
}

function getRangeCount(dates: string[], fromDate: string, toDate: string): number {
  const fromIndex = dates.indexOf(fromDate);
  const toIndex = dates.indexOf(toDate);
  if (fromIndex === -1 || toIndex === -1) return 0;
  return Math.abs(fromIndex - toIndex) + 1;
}

function normalizeRange(dates: string[], fromDate: string, toDate: string) {
  const fromIndex = dates.indexOf(fromDate);
  const toIndex = dates.indexOf(toDate);
  if (fromIndex === -1 || toIndex === -1) return { fromDate, toDate };
  if (fromIndex > toIndex) return { fromDate, toDate };
  return { fromDate: toDate, toDate: fromDate };
}

function getPresetRange(dates: string[], count: number) {
  if (dates.length === 0) return { fromDate: '', toDate: '' };
  return {
    fromDate: dates[Math.min(count - 1, dates.length - 1)] ?? dates[dates.length - 1] ?? '',
    toDate: dates[0] ?? '',
  };
}

function snapTradingDate(datesAsc: string[], date: Date, strategy: 'onOrAfter' | 'onOrBefore'): string {
  const key = toDateKey(date);

  if (strategy === 'onOrAfter') {
    return datesAsc.find((candidate) => candidate >= key) ?? datesAsc[datesAsc.length - 1] ?? '';
  }

  for (let i = datesAsc.length - 1; i >= 0; i -= 1) {
    if (datesAsc[i] <= key) return datesAsc[i];
  }

  return datesAsc[0] ?? '';
}

function fmtCompact(v: number) {
  if (Math.abs(v) >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`;
  if (Math.abs(v) >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
  if (Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(1)}L`;
  if (Math.abs(v) >= 1e3) return `${(v / 1e3).toFixed(0)}K`;
  return v.toFixed(0);
}

interface DhancopyRow {
  id: number;
  date: string;
  symbol: string;
  eqHigh: number;
  eqLow: number;
  eqClose: number;
  eqVolume: number;
  eqTurnover: number;
  futVolume: number;
  futOi: number;
  futOiChange: number;
  futTurnover: number;
  optVolume: number;
  optOi: number;
  optTurnover: number;
  ceVolume: number;
  peVolume: number;
  rFactor: number;
}

export default function DhancopyPage() {
  const [rows, setRows] = useState<DhancopyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [dates, setDates] = useState<string[]>([]);
  const [syncDates, setSyncDates] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ from: string; to: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [offset, setOffset] = useState(0);
  const [computing, setComputing] = useState(false);
  const [computeDate, setComputeDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [computeResult, setComputeResult] = useState<string | null>(null);
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');
  const [syncingAction, setSyncingAction] = useState<string | null>(null);
  const [rangeOpen, setRangeOpen] = useState(false);
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const LIMIT = 100;

  const fetchData = useCallback(
    async (reset = false) => {
      setError(null);
      if (reset) setLoading(true);
      const currentOffset = reset ? 0 : offset;

      try {
        const params = new URLSearchParams({ limit: String(LIMIT), offset: String(currentOffset) });
        if (search) params.set('symbol', search);
        if (selectedDate) params.set('date', selectedDate);

        const res = await fetch(`/api/dhancopy?${params}`);
        const json = await res.json();

        if (json.success) {
          if (reset || currentOffset === 0) setRows(json.data);
          else setRows((prev) => [...prev, ...json.data]);
          setTotal(json.total);
          if (json.dates) setDates(json.dates);
          if (json.syncDates) setSyncDates(json.syncDates);
          if (json.dateRange) setDateRange(json.dateRange);
          if (reset) setOffset(0);
        } else {
          setError(json.error);
        }
      } catch {
        setError('Failed to fetch Dhan daily data');
      } finally {
        setLoading(false);
      }
    },
    [search, selectedDate, offset],
  );

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  useEffect(() => {
    if (!syncDates.length) return;
    if (!rangeTo) setRangeTo(syncDates[0]);
    if (!rangeFrom) setRangeFrom(syncDates[Math.max(0, Math.min(syncDates.length - 1, 4))]);
  }, [syncDates, rangeFrom, rangeTo]);

  const loadMore = () => setOffset((prev) => prev + LIMIT);

  useEffect(() => {
    if (offset > 0) fetchData(false);
  }, [offset, fetchData]);

  const handleCompute = async () => {
    if (!computeDate || computing || syncingAction) return;
    setComputing(true);
    setComputeResult(null);

    try {
      const res = await fetch('/api/dhancopy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'compute-dhan', date: computeDate }),
      });
      const d = await res.json();

      if (d.success) {
        setComputeResult(`${computeDate}: ${d.computed} stocks computed${d.failed ? `, ${d.failed} failed` : ''}`);
        fetchData(true);
      } else {
        setComputeResult(`Error: ${formatSyncError(d)}`);
      }
    } catch (e) {
      setComputeResult(`Error: ${(e as Error).message}`);
    } finally {
      setComputing(false);
    }
  };

  const handleSync = async (body: Record<string, unknown>, label: string) => {
    if (computing || syncingAction) return;
    setSyncingAction(label);
    setComputeResult(null);

    try {
      const res = await fetch('/api/dhancopy/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json();

      if (d.success) {
        const details = [
          d.mode ? `mode=${d.mode}` : null,
          `computed=${d.computed ?? 0}`,
          `failed=${d.failed ?? 0}`,
          d.processedDates !== undefined ? `dates=${d.processedDates}` : null,
        ].filter(Boolean);
        setComputeResult(details.join(' | '));
        fetchData(true);
      } else {
        setComputeResult(`Error: ${formatSyncError(d)}`);
      }
    } catch (e) {
      setComputeResult(`Error: ${(e as Error).message}`);
    } finally {
      setSyncingAction(null);
    }
  };

  const pcr = (row: DhancopyRow) => (row.ceVolume > 0 ? (row.peVolume / row.ceVolume).toFixed(2) : '\u2014');
  const filterDatesAsc = [...dates].reverse();
  const syncDatesAsc = [...syncDates].reverse();
  const activePreset = PRESETS.find((preset) => {
    const range = getPresetRange(syncDates, preset.count);
    return range.fromDate === rangeFrom && range.toDate === rangeTo;
  })?.label;
  const selectedCount = getRangeCount(syncDates, rangeFrom, rangeTo);
  const selectedRange: DateRange | undefined =
    rangeFrom && rangeTo ? { from: toDateValue(rangeFrom), to: toDateValue(rangeTo) } : undefined;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-violet-400" />
          <div>
            <h1 className="text-xl font-bold">Dhancopy Data</h1>
            <p className="text-xs text-slate-500">
              {dateRange ? `${dateRange.from} \u2192 ${dateRange.to}` : 'No data'} &middot; {dates.length} days &middot;{' '}
              {total.toLocaleString()} rows
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wider text-slate-600">Sync date</span>
            <DatePicker
              selected={computeDate ? toDateValue(computeDate) : null}
              onChange={(date) => {
                if (!date) return;
                setComputeDate(toDateKey(date));
              }}
              maxDate={new Date()}
              dateFormat="MMM dd, yyyy"
              customInput={
                <Button
                  variant="outline"
                  className="min-w-[220px] justify-start border-slate-800 bg-slate-900 font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
                >
                  <CalendarIcon className="w-4 h-4" />
                  {computeDate ? formatTradingDate(computeDate) : 'Pick any date'}
                </Button>
              }
              popperClassName="z-50"
              calendarClassName="!border !border-slate-800 !bg-slate-950 !text-slate-200 !rounded-md !shadow-md"
              dayClassName={(date) => {
                const isToday = toDateKey(date) === format(new Date(), 'yyyy-MM-dd');
                return isToday ? '!bg-violet-500/20 !text-violet-200 rounded-md' : 'text-slate-200';
              }}
              wrapperClassName="inline-block"
            />
          </div>
          <Button
            type="button"
            onClick={handleCompute}
            disabled={computing || !!syncingAction}
            className="border-violet-500/30 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
          >
            {computing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
            {computing ? 'Syncing date...' : 'Sync selected date'}
          </Button>
          <Button
            type="button"
            onClick={() => fetchData(true)}
            variant="outline"
            size="icon-sm"
            className="border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {[
          { label: 'Total Days', value: dates.length },
          { label: 'Total Rows', value: total },
          { label: 'Latest', value: dateRange?.to ?? '\u2014' },
          { label: 'Showing', value: rows.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">{stat.label}</div>
            <div className="text-lg font-semibold text-slate-200">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Download className="w-4 h-4 text-violet-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Historical Download Tools</h2>
            <p className="text-[11px] text-slate-500">
              Full shadcn calendar picker. Selected dates snap to the nearest syncable trading dates.
            </p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                type="button"
                size="sm"
                variant={activePreset === preset.label ? 'secondary' : 'outline'}
                onClick={() => {
                  const nextRange = getPresetRange(syncDates, preset.count);
                  setRangeFrom(nextRange.fromDate);
                  setRangeTo(nextRange.toDate);
                }}
                disabled={computing || !!syncingAction || syncDates.length === 0}
                className={
                  activePreset === preset.label
                    ? 'border-violet-500/40 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30'
                    : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
                }
              >
                {preset.label}
              </Button>
            ))}
            <Button
              type="button"
              size="sm"
              variant={
                rangeFrom === (syncDates[syncDates.length - 1] ?? '') && rangeTo === (syncDates[0] ?? '')
                  ? 'secondary'
                  : 'outline'
              }
              onClick={() => {
                setRangeFrom(syncDates[syncDates.length - 1] ?? '');
                setRangeTo(syncDates[0] ?? '');
              }}
              disabled={computing || !!syncingAction || syncDates.length === 0}
              className={
                rangeFrom === (syncDates[syncDates.length - 1] ?? '') && rangeTo === (syncDates[0] ?? '')
                  ? 'border-sky-500/40 bg-sky-500/20 text-sky-100 hover:bg-sky-500/30'
                  : 'border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white'
              }
            >
              Full range
            </Button>
          </div>

          <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-start border-slate-800 bg-slate-900 text-left font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <CalendarIcon className="w-4 h-4" />
                {rangeFrom && rangeTo
                  ? `${formatTradingDate(rangeFrom)} - ${formatTradingDate(rangeTo)}`
                  : 'Pick a date range'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-slate-800 bg-slate-950 p-0" align="start">
              <Calendar
                mode="range"
                defaultMonth={selectedRange?.from}
                selected={selectedRange}
                onSelect={(range) => {
                  if (!range?.from) return;
                  const nextFromDate = snapTradingDate(syncDatesAsc, range.from, 'onOrAfter');
                  const nextToDate = snapTradingDate(syncDatesAsc, range.to ?? range.from, 'onOrBefore');
                  const normalized = normalizeRange(syncDates, nextFromDate, nextToDate);
                  setRangeFrom(normalized.fromDate);
                  setRangeTo(normalized.toDate);
                  if (range.to) setRangeOpen(false);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <div className="text-[11px] text-slate-500">
            {rangeFrom && rangeTo
              ? `${formatTradingDate(rangeFrom)} -> ${formatTradingDate(rangeTo)}${selectedCount > 0 ? ` • ${selectedCount} trading days` : ''}`
              : 'Choose a trading-date range to sync'}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <Button
              type="button"
              onClick={() =>
                handleSync(
                  { action: 'compute-dhan-range', fromDate: rangeFrom || undefined, toDate: rangeTo || undefined },
                  'range',
                )
              }
              disabled={computing || !!syncingAction || !rangeFrom || !rangeTo}
              className="border-violet-500/30 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
            >
              {syncingAction === 'range' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Sync range
            </Button>
            <Button
              type="button"
              onClick={() =>
                handleSync(
                  { action: 'compute-dhan-missing', fromDate: rangeFrom || undefined, toDate: rangeTo || undefined },
                  'missing',
                )
              }
              disabled={computing || !!syncingAction}
              variant="outline"
              className="border-sky-500/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 hover:text-sky-50"
            >
              {syncingAction === 'missing' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Sync missing only
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <a href="/trading-lab/bhav-dhan-compare">Open compare</a>
            </Button>
            <Button
              asChild
              variant="outline"
              className="border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
            >
              <a href="/historify/scheduler">Open scheduler</a>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value.toUpperCase())}
            placeholder="Search symbol..."
            className="w-full pl-9 pr-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
          />
        </div>
        <Popover open={filterDateOpen} onOpenChange={setFilterDateOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="min-w-[220px] justify-start border-slate-800 bg-slate-900 font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
            >
              <CalendarIcon className="w-4 h-4" />
              {selectedDate ? formatTradingDate(selectedDate) : 'All dates'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto border-slate-800 bg-slate-950 p-0" align="start">
            <div className="border-b border-slate-800 p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSelectedDate('');
                  setFilterDateOpen(false);
                }}
                className="w-full justify-start text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Clear filter
              </Button>
            </div>
            <Calendar
              mode="single"
              selected={selectedDate ? toDateValue(selectedDate) : undefined}
              onSelect={(date) => {
                if (!date) return;
                setSelectedDate(snapTradingDate(filterDatesAsc, date, 'onOrBefore'));
                setFilterDateOpen(false);
              }}
            />
          </PopoverContent>
        </Popover>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {computeResult && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            computeResult.startsWith('Error')
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
          }`}
        >
          {computeResult}
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <div className="grid grid-cols-[90px_1.4fr_78px_78px_78px_88px_88px_88px_84px_84px_88px_88px_60px_70px] gap-2 px-4 py-2 border-b border-slate-800 text-xs text-slate-500 font-medium min-w-[1380px]">
            <span>Date</span>
            <span>Symbol</span>
            <span>High</span>
            <span>Low</span>
            <span>Close</span>
            <span>Eq To</span>
            <span>Fut Vol</span>
            <span>Fut OI</span>
            <span>OI Chg</span>
            <span>Opt Vol</span>
            <span>Opt OI</span>
            <span>Opt To</span>
            <span>PCR</span>
            <span>R</span>
          </div>

          {loading && rows.length === 0 && (
            <div className="px-5 py-16 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
              <p className="text-sm text-slate-500">Loading Dhan daily data...</p>
            </div>
          )}

          {!loading && rows.length === 0 && (
            <div className="px-5 py-16 text-center">
              <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
              <p className="text-sm text-slate-500">
                {total === 0
                  ? 'No Dhan daily data cached yet. Use the sync tools above to start downloading.'
                  : 'No rows match your filters.'}
              </p>
            </div>
          )}

          {rows.map((r, i) => (
            <div
              key={`${r.date}-${r.symbol}`}
              className={`grid grid-cols-[90px_1.4fr_78px_78px_78px_88px_88px_88px_84px_84px_88px_88px_60px_70px] gap-2 px-4 py-1.5 text-sm hover:bg-slate-800/40 transition-colors min-w-[1380px] ${i !== rows.length - 1 ? 'border-b border-slate-800/50' : ''}`}
            >
              <div className="text-slate-500 text-xs font-mono">{r.date}</div>
              <div className="text-white font-medium truncate">{r.symbol}</div>
              <div className="text-slate-300 font-mono">{r.eqHigh.toFixed(1)}</div>
              <div className="text-slate-300 font-mono">{r.eqLow.toFixed(1)}</div>
              <div className="text-slate-300 font-mono">{r.eqClose.toFixed(1)}</div>
              <div className="text-slate-400 font-mono">{fmtCompact(r.eqTurnover)}</div>
              <div className="text-slate-400 font-mono">{fmtCompact(r.futVolume)}</div>
              <div className="text-slate-400 font-mono">{fmtCompact(r.futOi)}</div>
              <div
                className={`font-mono ${r.futOiChange > 0 ? 'text-emerald-400' : r.futOiChange < 0 ? 'text-red-400' : 'text-slate-500'}`}
              >
                {fmtCompact(r.futOiChange)}
              </div>
              <div className="text-slate-400 font-mono">{fmtCompact(r.optVolume)}</div>
              <div className="text-slate-400 font-mono">{fmtCompact(r.optOi)}</div>
              <div className="text-slate-400 font-mono">{fmtCompact(r.optTurnover)}</div>
              <div className="text-slate-400 font-mono">{pcr(r)}</div>
              <div className="text-violet-400 font-mono font-semibold">{r.rFactor.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      {rows.length < total && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Load more ({rows.length.toLocaleString()} / {total.toLocaleString()})
          </button>
        </div>
      )}
    </div>
  );
}

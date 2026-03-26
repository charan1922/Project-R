'use client';

import { format } from 'date-fns';
import { BarChart2, CalendarIcon, CalendarRange, Download, Loader2, RefreshCw, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CompareStats } from './_components/compare-stats';
import { CompareTable } from './_components/compare-table';
import { useCompareData } from './_hooks/use-compare-data';

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

export default function BhavDhanComparePage() {
  const [selectedDate, setSelectedDate] = useState<string | undefined>();
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [rangeOpen, setRangeOpen] = useState(false);
  const [filterDateOpen, setFilterDateOpen] = useState(false);
  const data = useCompareData(selectedDate);

  const filtered = useMemo(() => {
    if (!search) return data.stocks;
    const q = search.toLowerCase();
    return data.stocks.filter((s) => s.symbol.toLowerCase().includes(q));
  }, [data.stocks, search]);

  useEffect(() => {
    if (!data.availableDates.length) return;
    if (!toDate) setToDate(data.availableDates[0]);
    if (!fromDate) setFromDate(data.availableDates[Math.max(0, data.availableDates.length - 5)]);
  }, [data.availableDates, fromDate, toDate]);

  const busy = data.syncingAction !== null;
  const availableDatesAsc = [...data.availableDates].reverse();
  const activePreset = PRESETS.find((preset) => {
    const range = getPresetRange(data.availableDates, preset.count);
    return range.fromDate === fromDate && range.toDate === toDate;
  })?.label;
  const selectedCount = getRangeCount(data.availableDates, fromDate, toDate);
  const selectedRange: DateRange | undefined =
    fromDate && toDate ? { from: toDateValue(fromDate), to: toDateValue(toDate) } : undefined;

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BarChart2 className="w-6 h-6 text-sky-400" />
          <div>
            <h1 className="text-xl font-bold">Bhav vs Dhan Compare</h1>
            <p className="text-xs text-slate-500">
              {data.date ?? 'No date'} &middot; Bhav: {data.bhavCount} &middot; Dhan: {data.dhanCount}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {data.date && !busy && (
            <Button
              type="button"
              onClick={data.computeDhan}
              className="border-violet-500/30 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
            >
              <Download className="w-3.5 h-3.5" />
              {data.dhanCached ? 'Re-sync selected date' : 'Sync selected date'}
            </Button>
          )}
          {busy && (
            <span className="flex items-center gap-1.5 text-xs text-violet-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Syncing {data.syncingAction}...
            </span>
          )}
          <Button
            type="button"
            onClick={data.refresh}
            variant="outline"
            size="icon-sm"
            className="border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${data.loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {data.syncResult && (
        <div
          className={`mb-4 px-4 py-3 rounded-lg text-sm ${
            data.syncResult.errors.length > 0
              ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400'
              : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
          }`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>Computed: {data.syncResult.computed}</span>
            <span>Failed: {data.syncResult.failed}</span>
            {data.syncResult.processedDates !== undefined && <span>Dates: {data.syncResult.processedDates}</span>}
            {data.syncResult.mode && <span>Mode: {data.syncResult.mode}</span>}
          </div>
          {data.syncResult.errors.length > 0 && (
            <details className="mt-1">
              <summary className="text-xs cursor-pointer opacity-70">Show errors</summary>
              <div className="mt-1 text-xs font-mono max-h-24 overflow-y-auto opacity-70">
                {data.syncResult.errors.map((e) => (
                  <div key={e}>{e}</div>
                ))}
              </div>
              {data.syncResult.errors[0]?.includes('Master contracts') && (
                <a href="/trading-lab/master-contracts" className="inline-block mt-2 text-xs text-violet-300 underline">
                  Sync master contracts first
                </a>
              )}
            </details>
          )}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarRange className="w-4 h-4 text-violet-400" />
          <div>
            <h2 className="text-sm font-semibold text-white">Historical Dhan Sync</h2>
            <p className="text-[11px] text-slate-500">
              Full shadcn calendar picker. Selected dates snap to the nearest bhavcopy-backed trading dates.
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
                  const nextRange = getPresetRange(data.availableDates, preset.count);
                  setFromDate(nextRange.fromDate);
                  setToDate(nextRange.toDate);
                }}
                disabled={busy || data.availableDates.length === 0}
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
                fromDate === (data.availableDates[data.availableDates.length - 1] ?? '') &&
                toDate === (data.availableDates[0] ?? '')
                  ? 'secondary'
                  : 'outline'
              }
              onClick={() => {
                setFromDate(data.availableDates[data.availableDates.length - 1] ?? '');
                setToDate(data.availableDates[0] ?? '');
              }}
              disabled={busy || data.availableDates.length === 0}
              className={
                fromDate === (data.availableDates[data.availableDates.length - 1] ?? '') &&
                toDate === (data.availableDates[0] ?? '')
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
                {fromDate && toDate
                  ? `${formatTradingDate(fromDate)} - ${formatTradingDate(toDate)}`
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
                  const nextFromDate = snapTradingDate(availableDatesAsc, range.from, 'onOrAfter');
                  const nextToDate = snapTradingDate(availableDatesAsc, range.to ?? range.from, 'onOrBefore');
                  const normalized = normalizeRange(data.availableDates, nextFromDate, nextToDate);
                  setFromDate(normalized.fromDate);
                  setToDate(normalized.toDate);
                  if (range.to) setRangeOpen(false);
                }}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <div className="text-[11px] text-slate-500">
            {fromDate && toDate
              ? `${formatTradingDate(fromDate)} -> ${formatTradingDate(toDate)}${selectedCount > 0 ? ` • ${selectedCount} trading days` : ''}`
              : 'Choose a trading-date range to sync'}
          </div>

          <div className="flex flex-wrap gap-3 items-end">
            <Button
              type="button"
              onClick={() => data.computeRange(fromDate || undefined, toDate || undefined)}
              disabled={busy || !fromDate || !toDate}
              className="border-violet-500/30 bg-violet-500/20 text-violet-200 hover:bg-violet-500/30"
            >
              {data.syncingAction === 'range' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Sync range
            </Button>
            <Button
              type="button"
              onClick={() => data.computeMissing(fromDate || undefined, toDate || undefined)}
              disabled={busy}
              variant="outline"
              className="border-sky-500/30 bg-sky-500/15 text-sky-200 hover:bg-sky-500/25 hover:text-sky-50"
            >
              {data.syncingAction === 'missing' ? (
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
        {data.availableDates.length > 0 && (
          <Popover open={filterDateOpen} onOpenChange={setFilterDateOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="min-w-[220px] justify-start border-slate-800 bg-slate-900 font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <CalendarIcon className="w-4 h-4" />
                {formatTradingDate(selectedDate ?? data.date ?? data.availableDates[0])}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto border-slate-800 bg-slate-950 p-0" align="start">
              <Calendar
                mode="single"
                selected={toDateValue(selectedDate ?? data.date ?? data.availableDates[0])}
                onSelect={(date) => {
                  if (!date) return;
                  setSelectedDate(snapTradingDate(availableDatesAsc, date, 'onOrBefore'));
                  setFilterDateOpen(false);
                }}
              />
            </PopoverContent>
          </Popover>
        )}
        <div className="flex items-center gap-2 text-[10px]">
          <span
            className={`px-2 py-1 rounded border font-mono ${data.hasBhav ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
          >
            Bhav {data.hasBhav ? `\u2713 ${data.bhavCount}` : '\u2717'}
          </span>
          <span
            className={`px-2 py-1 rounded border font-mono ${data.hasDhan ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-slate-800 text-slate-600 border-slate-700'}`}
          >
            Dhan {data.hasDhan ? `\u2713 ${data.dhanCount}` : 'not cached'}
          </span>
        </div>
      </div>

      <div className="mb-4">
        <CompareStats metrics={data.metrics} />
      </div>

      {data.loading ? (
        <div className="px-5 py-16 text-center">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
          <p className="text-sm text-slate-500">Loading...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-5 py-16 text-center text-sm text-slate-500">
          {data.stocks.length === 0 ? 'No data for this date' : 'No stocks match'}
        </div>
      ) : (
        <CompareTable stocks={filtered} hasDhan={data.hasDhan} />
      )}
    </div>
  );
}

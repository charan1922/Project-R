'use client';

import { format } from 'date-fns';
import { CalendarIcon, Download, Loader2, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import DatePicker from 'react-datepicker';
import type { DateRange } from 'react-day-picker';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import 'react-datepicker/dist/react-datepicker.css';

type Suggestion = {
  symbol: string;
  exchange: string;
  segment: string;
  securityId: string;
  name: string;
};

type DownloadRow = {
  date: string;
  symbol: string;
  futuresContractSymbol: string | null;
  futuresSecurityId: string | null;
  futuresExpiryDate: string | null;
  lotSize: number;
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
};

type DownloadMeta = {
  symbol: string;
  equitySecurityId: string;
  futuresSecurityId: string | null;
  futuresExpiryDate: string | null;
  lotSize: number;
  requestedFromDate: string;
  requestedToDate: string;
  returnedDays: number;
  source: {
    equity: string;
    futures: string;
    options: string;
    note: string;
  };
};

function toDateKey(value: Date): string {
  return format(value, 'yyyy-MM-dd');
}

function toDateValue(value: string): Date {
  return new Date(`${value}T00:00:00`);
}

function formatTradingDate(value: string): string {
  return format(new Date(`${value}T00:00:00`), 'MMM dd, yyyy');
}

function isWeekday(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

function toCsv(rows: DownloadRow[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const body = rows.map((row) =>
    headers
      .map((header) => {
        const value = row[header as keyof DownloadRow];
        return typeof value === 'string' ? `"${value.replaceAll('"', '""')}"` : String(value);
      })
      .join(','),
  );
  return [headers.join(','), ...body].join('\n');
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function DhanStockDownloadPage() {
  const [mode, setMode] = useState<'single' | 'range'>('single');
  const [symbolInput, setSymbolInput] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [range, setRange] = useState<DateRange | undefined>();
  const [rangeOpen, setRangeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [meta, setMeta] = useState<DownloadMeta | null>(null);
  const [rows, setRows] = useState<DownloadRow[]>([]);

  useEffect(() => {
    const query = symbolInput.trim().toUpperCase();
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/dhan-stock?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setSuggestions(json.success ? (json.suggestions ?? []) : []);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [symbolInput]);

  const requestDates = useMemo(() => {
    if (mode === 'single') {
      return { fromDate: selectedDate, toDate: selectedDate };
    }

    return {
      fromDate: range?.from ? toDateKey(range.from) : '',
      toDate: range?.to ? toDateKey(range.to) : range?.from ? toDateKey(range.from) : '',
    };
  }, [mode, range, selectedDate]);

  const handleFetch = async () => {
    const symbol = symbolInput.trim().toUpperCase();
    if (!symbol || !requestDates.fromDate || !requestDates.toDate) {
      const message = 'Choose a symbol and valid date selection first.';
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/dhan-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          fromDate: requestDates.fromDate,
          toDate: requestDates.toDate,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const message = json.error ?? 'Failed to fetch Dhan stock data';
        setError(message);
        toast.error(message);
        setMeta(null);
        setRows([]);
        return;
      }

      setMeta(json.meta);
      setRows(json.data ?? []);
      const message = `Fetched ${json.meta?.returnedDays ?? json.data?.length ?? 0} rows for ${symbol}.`;
      setNotice(message);
      toast.success(message);
    } catch (fetchError) {
      const message = (fetchError as Error).message;
      setError(message);
      toast.error(message);
      setMeta(null);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!meta || rows.length === 0 || saving) return;

    setSaving(true);
    setError(null);
    setNotice(null);

    try {
      const res = await fetch('/api/dhan-stock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save',
          meta,
          rows: rows.map((row) => ({
            date: row.date,
            futuresContractSymbol: row.futuresContractSymbol,
            futuresSecurityId: row.futuresSecurityId,
            futuresExpiryDate: row.futuresExpiryDate,
            lotSize: row.lotSize,
            data: {
              eq_volume: row.eqVolume,
              eq_turnover: row.eqTurnover,
              eq_high: row.eqHigh,
              eq_low: row.eqLow,
              eq_close: row.eqClose,
              fut_volume: row.futVolume,
              fut_oi: row.futOi,
              fut_oi_change: row.futOiChange,
              fut_turnover: row.futTurnover,
              opt_volume: row.optVolume,
              opt_oi: row.optOi,
              opt_turnover: row.optTurnover,
              ce_volume: row.ceVolume,
              pe_volume: row.peVolume,
            },
          })),
        }),
      });
      const json = await res.json();
      if (!json.success) {
        const message = json.error ?? 'Failed to save download to DB';
        setError(message);
        toast.error(message);
        return;
      }
      const message = `Saved ${json.saved ?? rows.length} rows to dhan_stock_downloads.`;
      setNotice(message);
      toast.success(message);
    } catch (saveError) {
      const message = (saveError as Error).message;
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDownload = (formatType: 'json' | 'csv') => {
    if (!rows.length || !meta) return;
    const baseName = `${meta.symbol}_${meta.requestedFromDate}${meta.requestedFromDate !== meta.requestedToDate ? `_to_${meta.requestedToDate}` : ''}`;
    if (formatType === 'json') {
      downloadBlob(`${baseName}.json`, JSON.stringify({ meta, data: rows }, null, 2), 'application/json');
      return;
    }
    downloadBlob(`${baseName}.csv`, toCsv(rows), 'text/csv;charset=utf-8');
  };

  return (
    <div className="min-h-screen bg-black px-4 py-6 text-white md:px-6">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Dhan Stock Download</h1>
          <p className="text-sm text-slate-400">
            Download combined Dhan daily data for one stock for a single date or a custom date range.
          </p>
        </div>

        <Card className="border-slate-800 bg-slate-950 text-slate-100">
          <CardHeader>
            <CardTitle>Fetch Controls</CardTitle>
            <CardDescription className="text-slate-400">
              v1 export uses Dhan historical charts for equity and futures, plus rolling options aggregation.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto]">
              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Symbol</div>
                <div className="relative space-y-2">
                  <Input
                    value={symbolInput}
                    onChange={(event) => setSymbolInput(event.target.value.toUpperCase())}
                    placeholder="Type NSE symbol, for example HDFCBANK"
                    className="border-slate-800 bg-slate-900 text-slate-100 placeholder:text-slate-500"
                  />
                  {(searching || suggestions.length > 0) && (
                    <div className="rounded-lg border border-slate-800 bg-slate-900/95 p-2">
                      {searching ? (
                        <div className="text-xs text-slate-500">Searching symbols...</div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {suggestions.map((item) => (
                            <button
                              type="button"
                              key={`${item.symbol}-${item.securityId}`}
                              onClick={() => {
                                setSymbolInput(item.symbol);
                                setSuggestions([]);
                              }}
                              className="rounded-md border border-slate-800 bg-slate-950 px-2 py-1 text-left text-xs text-slate-300 transition hover:border-violet-500/40 hover:text-white"
                            >
                              <span className="font-semibold">{item.symbol}</span>
                              <span className="ml-2 text-slate-500">
                                {item.name === 'EQUITY' ? `${item.exchange} ${item.segment}` : item.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium uppercase tracking-[0.24em] text-slate-500">Mode</div>
                <Tabs value={mode} onValueChange={(value) => setMode(value as 'single' | 'range')}>
                  <TabsList className="border border-slate-800 bg-slate-900">
                    <TabsTrigger value="single">Single Date</TabsTrigger>
                    <TabsTrigger value="range">Date Range</TabsTrigger>
                  </TabsList>
                  <TabsContent value="single" className="pt-3">
                    <DatePicker
                      selected={toDateValue(selectedDate)}
                      onChange={(date) => {
                        if (date) setSelectedDate(toDateKey(date));
                      }}
                      filterDate={isWeekday}
                      dateFormat="MMM dd, yyyy"
                      maxDate={new Date()}
                      customInput={
                        <Button
                          variant="outline"
                          className="w-full justify-start border-slate-800 bg-slate-900 font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {formatTradingDate(selectedDate)}
                        </Button>
                      }
                      wrapperClassName="w-full"
                    />
                  </TabsContent>
                  <TabsContent value="range" className="pt-3">
                    <Popover open={rangeOpen} onOpenChange={setRangeOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start border-slate-800 bg-slate-900 font-normal text-slate-200 hover:bg-slate-800 hover:text-white"
                        >
                          <CalendarIcon className="h-4 w-4" />
                          {range?.from
                            ? `${formatTradingDate(toDateKey(range.from))}${range.to ? ` - ${formatTradingDate(toDateKey(range.to))}` : ''}`
                            : 'Pick a date range'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto border-slate-800 bg-slate-950 p-0">
                        <Calendar
                          mode="range"
                          selected={range}
                          onSelect={setRange}
                          numberOfMonths={2}
                          disabled={(date) => !isWeekday(date) || date > new Date()}
                        />
                      </PopoverContent>
                    </Popover>
                  </TabsContent>
                </Tabs>
              </div>

              <div className="flex items-end">
                <Button
                  type="button"
                  onClick={handleFetch}
                  disabled={loading}
                  className="w-full border-violet-500/30 bg-violet-500/20 text-violet-100 hover:bg-violet-500/30 md:w-auto"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Preview Data
                </Button>
              </div>
            </div>

            {error ? (
              <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                {error}
              </div>
            ) : null}
            {notice ? (
              <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
                {notice}
              </div>
            ) : null}

            {meta ? (
              <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <div className="text-xs text-slate-500">Symbol</div>
                  <div className="text-sm font-semibold text-white">{meta.symbol}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <div className="text-xs text-slate-500">Equity Security ID</div>
                  <div className="text-sm font-semibold text-white">{meta.equitySecurityId}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <div className="text-xs text-slate-500">Futures Contract</div>
                  <div className="text-sm font-semibold text-white">{meta.futuresSecurityId ?? 'Not available'}</div>
                </div>
                <div className="rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
                  <div className="text-xs text-slate-500">Returned Days</div>
                  <div className="text-sm font-semibold text-white">{meta.returnedDays}</div>
                </div>
              </div>
            ) : null}

            {meta ? (
              <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                <div>
                  Range: {meta.requestedFromDate} to {meta.requestedToDate}
                </div>
                <div>Latest futures expiry in result: {meta.futuresExpiryDate ?? 'Not available'}</div>
                <div>Latest lot size in result: {meta.lotSize}</div>
                <div className="mt-2 text-xs text-slate-500">{meta.source.note}</div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload('json')}
                disabled={!rows.length}
                className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Download className="h-4 w-4" />
                Download JSON
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => handleDownload('csv')}
                disabled={!rows.length}
                className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800 hover:text-white"
              >
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleSave}
                disabled={!rows.length || saving}
                className="border-emerald-500/30 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Save To DB
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-800 bg-slate-950 text-slate-100">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription className="text-slate-400">
              Showing the fetched daily rows before download.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {rows.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-800 bg-slate-900/60 px-4 py-10 text-center text-sm text-slate-500">
                No rows yet. Fetch a symbol to preview the export.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-800 hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Fut Contract</TableHead>
                    <TableHead>Fut Expiry</TableHead>
                    <TableHead>Eq Close</TableHead>
                    <TableHead>Eq Volume</TableHead>
                    <TableHead>Fut Vol</TableHead>
                    <TableHead>Fut OI</TableHead>
                    <TableHead>Opt Vol</TableHead>
                    <TableHead>Opt OI</TableHead>
                    <TableHead>PCR</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={`${row.symbol}-${row.date}`} className="border-slate-800">
                      <TableCell>{row.date}</TableCell>
                      <TableCell>{row.futuresContractSymbol ?? '—'}</TableCell>
                      <TableCell>{row.futuresExpiryDate ?? '—'}</TableCell>
                      <TableCell>{row.eqClose.toFixed(2)}</TableCell>
                      <TableCell>{row.eqVolume.toLocaleString()}</TableCell>
                      <TableCell>{row.futVolume.toLocaleString()}</TableCell>
                      <TableCell>{row.futOi.toLocaleString()}</TableCell>
                      <TableCell>{row.optVolume.toLocaleString()}</TableCell>
                      <TableCell>{row.optOi.toLocaleString()}</TableCell>
                      <TableCell>{row.ceVolume > 0 ? (row.peVolume / row.ceVolume).toFixed(2) : '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

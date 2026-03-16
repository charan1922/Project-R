'use client';

import { ArrowUpDown, ChevronDown, Database, RefreshCw, Search } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

interface Contract {
  id: number;
  securityId: string;
  symbol: string;
  exchange: string;
  segment: string;
  instrument: string;
  name: string;
  underlying: string | null;
  expiryDate: string | null;
  syncDate: string;
}

type SortField = 'securityId' | 'symbol' | 'segment' | 'instrument' | 'underlying' | 'expiryDate';

export default function MasterContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [total, setTotal] = useState(0);
  const [syncDate, setSyncDate] = useState<string | null>(null);
  const [segments, setSegments] = useState<string[]>([]);
  const [instruments, setInstruments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [instrument, setInstrument] = useState('');
  const [sortField, setSortField] = useState<SortField>('symbol');
  const [sortAsc, setSortAsc] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 100;

  const fetchData = useCallback(
    async (reset = false) => {
      setError(null);
      if (reset) setLoading(true);
      const currentOffset = reset ? 0 : offset;
      try {
        const params = new URLSearchParams({
          limit: String(LIMIT),
          offset: String(currentOffset),
        });
        if (search) params.set('q', search);
        if (segment) params.set('segment', segment);
        if (instrument) params.set('instrument', instrument);

        const res = await fetch(`/api/master-contracts?${params}`);
        const json = await res.json();
        if (json.success) {
          if (reset || currentOffset === 0) {
            setContracts(json.data);
          } else {
            setContracts((prev) => [...prev, ...json.data]);
          }
          setTotal(json.total);
          setSyncDate(json.syncDate);
          if (json.filters) {
            setSegments(json.filters.segments);
            setInstruments(json.filters.instruments);
          }
          if (reset) setOffset(0);
        } else {
          setError(json.error);
        }
      } catch {
        setError('Failed to fetch master contracts');
      } finally {
        setLoading(false);
      }
    },
    [search, segment, instrument, offset],
  );

  useEffect(() => {
    fetchData(true);
  }, [fetchData]);

  const loadMore = () => {
    const next = offset + LIMIT;
    setOffset(next);
  };

  useEffect(() => {
    if (offset > 0) fetchData(false);
  }, [offset, fetchData]);

  const handleSync = async () => {
    setSyncing(true);
    setError(null);
    try {
      const res = await fetch('/api/master-contracts/sync', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setOffset(0);
        fetchData(true);
      } else {
        setError(json.error);
      }
    } catch {
      setError('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortAsc(!sortAsc);
    else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const sorted = [...contracts].sort((a, b) => {
    const av = a[sortField] ?? '';
    const bv = b[sortField] ?? '';
    const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
    return sortAsc ? cmp : -cmp;
  });

  const segmentColor = (seg: string) => {
    if (seg === 'NSE_EQ') return 'text-emerald-400';
    if (seg === 'NSE_FNO') return 'text-sky-400';
    if (seg === 'BSE_EQ') return 'text-amber-400';
    if (seg === 'BSE_FNO') return 'text-orange-400';
    return 'text-slate-400';
  };

  const instrumentBadge = (inst: string) => {
    if (inst === 'EQUITY') return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    if (inst === 'FUTSTK') return 'bg-sky-500/20 text-sky-400 border-sky-500/30';
    if (inst === 'OPTSTK') return 'bg-violet-500/20 text-violet-400 border-violet-500/30';
    if (inst === 'FUTIDX') return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
    if (inst === 'OPTIDX') return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6 max-w-[1400px] mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Database className="w-6 h-6 text-sky-400" />
          <div>
            <h1 className="text-xl font-bold">Master Contracts</h1>
            <p className="text-xs text-slate-500">
              {syncDate ? `Synced: ${syncDate}` : 'Not synced'} &middot; {total.toLocaleString()} instruments
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-sm hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Re-sync'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {[
          { label: 'Total', value: total },
          { label: 'NSE Equity', value: contracts.length > 0 ? '—' : '—', key: 'NSE_EQ' },
          { label: 'NSE F&O', value: contracts.length > 0 ? '—' : '—', key: 'NSE_FNO' },
          { label: 'BSE', value: contracts.length > 0 ? '—' : '—', key: 'BSE' },
          { label: 'Showing', value: contracts.length },
        ].map((stat) => (
          <div key={stat.label} className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2">
            <div className="text-xs text-slate-500">{stat.label}</div>
            <div className="text-lg font-semibold text-slate-200">
              {typeof stat.value === 'number' ? stat.value.toLocaleString() : stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Controls */}
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
        <div className="relative">
          <select
            value={segment}
            onChange={(e) => setSegment(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-slate-600"
          >
            <option value="">All Segments</option>
            {segments.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
        <div className="relative">
          <select
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 rounded-lg bg-slate-900 border border-slate-800 text-sm text-slate-300 focus:outline-none focus:border-slate-600"
          >
            <option value="">All Instruments</option>
            {instruments.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {/* Header Row */}
        <div className="grid grid-cols-[80px_2fr_70px_1fr_1fr_1fr_1fr] gap-2 px-4 py-2 border-b border-slate-800 text-xs text-slate-500 font-medium">
          {(
            [
              ['securityId', 'ID'],
              ['symbol', 'Symbol'],
              ['', 'Exch'],
              ['segment', 'Segment'],
              ['instrument', 'Instrument'],
              ['underlying', 'Underlying'],
              ['expiryDate', 'Expiry'],
            ] as [SortField | '', string][]
          ).map(([field, label]) => (
            <button
              type="button"
              key={label}
              onClick={() => field && handleSort(field as SortField)}
              className={`text-left flex items-center gap-1 ${field ? 'hover:text-slate-300 cursor-pointer' : 'cursor-default'}`}
            >
              {label}
              {field && sortField === field && <ArrowUpDown className="w-3 h-3" />}
            </button>
          ))}
        </div>

        {/* Loading */}
        {loading && contracts.length === 0 && (
          <div className="px-5 py-16 text-center">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-slate-600" />
            <p className="text-sm text-slate-500">Loading master contracts...</p>
          </div>
        )}

        {/* Empty */}
        {!loading && sorted.length === 0 && (
          <div className="px-5 py-16 text-center">
            <Search className="w-6 h-6 text-slate-700 mx-auto mb-3" />
            <p className="text-sm text-slate-500">
              {total === 0 ? 'No data synced yet. Click Re-sync to download.' : 'No contracts match your filters.'}
            </p>
          </div>
        )}

        {/* Rows */}
        {sorted.map((c, i) => (
          <div
            key={c.id}
            className={`grid grid-cols-[80px_2fr_70px_1fr_1fr_1fr_1fr] gap-2 px-4 py-1.5 text-sm hover:bg-slate-800/40 transition-colors ${i !== sorted.length - 1 ? 'border-b border-slate-800/50' : ''}`}
          >
            <div className="text-slate-500 font-mono text-xs">{c.securityId}</div>
            <div className="text-white font-medium truncate">{c.symbol}</div>
            <div className="text-slate-400">{c.exchange}</div>
            <div className={segmentColor(c.segment)}>{c.segment}</div>
            <div>
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${instrumentBadge(c.instrument)}`}>
                {c.instrument}
              </span>
            </div>
            <div className="text-slate-400 truncate">{c.underlying || '—'}</div>
            <div className="text-slate-500 text-xs">
              {c.expiryDate
                ? new Date(c.expiryDate).toLocaleDateString('en-IN', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })
                : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {contracts.length < total && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={loadMore}
            className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            Load more ({contracts.length.toLocaleString()} / {total.toLocaleString()})
          </button>
        </div>
      )}
    </div>
  );
}

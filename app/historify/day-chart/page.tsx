"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
    createChart, IChartApi, ISeriesApi, Time,
    ColorType, HistogramSeries, CandlestickSeries, LineSeries,
    CrosshairMode,
} from "lightweight-charts";
import { useTheme } from "next-themes";
import {
    CalendarDays, RefreshCw, AlertCircle, TrendingUp, TrendingDown,
    BarChart2, Activity, Shield, Zap, Database, Info,
} from "lucide-react";

import fnoData from "@/lib/data/fno_stocks_list.json";
import tradesRaw from "@/tradefinder_platform_trades.json";
import type { RawTrade } from "@/app/trading-lab/tradefinder/types";
import { computeAnalytics } from "@/app/trading-lab/tradefinder/analytics";

// ── Static derivations (module-level, computed once) ─────────────────────────
const _trades = (tradesRaw as { trades: RawTrade[] }).trades;
const _analytics = computeAnalytics(_trades);

// Map symbol → stats for quick enrichment
const TRADEFINDER_MAP = new Map(
    _analytics.stockList.map(s => [s.name.toUpperCase(), s])
);

const ALL_FNO = Array.from(new Set(fnoData.stocks.map(s => s.toUpperCase()))).sort();
const TRADED_FNO = ALL_FNO.filter(s => TRADEFINDER_MAP.has(s));

const INTERVALS = [
    { value: "Daily", label: "1D" },
    { value: "1min", label: "1m" },
    { value: "3min", label: "3m" },
    { value: "5min", label: "5m" },
    { value: "15min", label: "15m" },
    { value: "30min", label: "30m" },
    { value: "1hour", label: "1h" },
] as const;

type IntervalValue = typeof INTERVALS[number]["value"];

const TIER_COLORS: Record<string, string> = {
    "A+": "text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
    "A": "text-sky-400 bg-sky-500/10 border-sky-500/30",
    "B": "text-indigo-400 bg-indigo-500/10 border-indigo-500/30",
    "C": "text-amber-400 bg-amber-500/10 border-amber-500/30",
    "D": "text-red-400 bg-red-500/10 border-red-500/30",
};

function lastTradingDay() {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    if (d.getDay() === 0) d.setDate(d.getDate() - 2);
    if (d.getDay() === 6) d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
}

function fmtPrice(v: number) {
    return v.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DayChartPage() {
    const { resolvedTheme } = useTheme();

    // DOM refs
    const chartRef = useRef<HTMLDivElement>(null);
    const volRef = useRef<HTMLDivElement>(null);

    // Series / chart instance refs (not state — avoids re-renders)
    const chartInst = useRef<IChartApi | null>(null);
    const volChartInst = useRef<IChartApi | null>(null);
    const candleSeries = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const vwapSeries = useRef<ISeriesApi<"Line"> | null>(null);
    const ema20Series = useRef<ISeriesApi<"Line"> | null>(null);
    const ema50Series = useRef<ISeriesApi<"Line"> | null>(null);
    const volSeries = useRef<ISeriesApi<"Histogram"> | null>(null);
    const rsiSeries = useRef<ISeriesApi<"Line"> | null>(null);

    // Controls
    const [tradedOnly, setTradedOnly] = useState(true);
    const symbols = tradedOnly ? TRADED_FNO : ALL_FNO;
    const [symbol, setSymbol] = useState(TRADED_FNO[0] ?? ALL_FNO[0] ?? "");
    const [interval, setInterval_] = useState<IntervalValue>("5min");
    const [date, setDate] = useState(lastTradingDay());

    // Searchable symbol dropdown
    const [symbolOpen, setSymbolOpen] = useState(false);
    const [symbolSearch, setSymbolSearch] = useState("");
    const symbolDropdownRef = useRef<HTMLDivElement>(null);
    const filteredSymbols = useMemo(() => {
        const q = symbolSearch.toUpperCase().trim();
        return q ? symbols.filter(s => s.includes(q)) : symbols;
    }, [symbols, symbolSearch]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (symbolDropdownRef.current && !symbolDropdownRef.current.contains(e.target as Node)) {
                setSymbolOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    // Data states
    const [loading, setLoading] = useState(false);
    const [noData, setNoData] = useState(false);
    const [hasChart, setHasChart] = useState(false);

    // Indicators toggles
    const [showVwap, setShowVwap] = useState(true);
    const [showEma20, setShowEma20] = useState(false);
    const [showEma50, setShowEma50] = useState(false);
    const [showRsi, setShowRsi] = useState(false);

    // Indicator Data (stored to allow toggling without refetching)
    const [indData, setIndData] = useState<{
        vwap: any[]; ema20: any[]; ema50: any[]; rsi: any[];
    }>({ vwap: [], ema20: [], ema50: [], rsi: [] });

    // OHLCV bar (crosshair / last candle)
    const [ohlcv, setOhlcv] = useState<{
        open: number; high: number; low: number; close: number; volume: number; time?: string;
    } | null>(null);
    const [dayChange, setDayChange] = useState<{ abs: number; pct: number } | null>(null);

    // Tradefinder enrichment for selected symbol
    const tfStats = TRADEFINDER_MAP.get(symbol.toUpperCase()) ?? null;

    // Keep symbol valid when switching filter
    useEffect(() => {
        if (!symbols.includes(symbol)) setSymbol(symbols[0] ?? "");
    }, [tradedOnly]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── Chart initialisation ────────────────────────────────────────────────
    useEffect(() => {
        if (!chartRef.current || !volRef.current) return;

        const dark = resolvedTheme !== "light";
        const bg = dark ? "#0a0f1a" : "#ffffff";
        const text = dark ? "#94a3b8" : "#334155";
        const grid = dark ? "#0f172a" : "#f1f5f9";
        const border = dark ? "#1e293b" : "#e2e8f0";

        const base = {
            layout: { background: { type: ColorType.Solid, color: bg }, textColor: text, fontSize: 11 },
            grid: { vertLines: { color: grid }, horzLines: { color: grid } },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: border,
                tickMarkFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).format(date);
                }
            },
            rightPriceScale: { borderColor: border },
            crosshair: { mode: CrosshairMode.Normal },
            localization: {
                timeFormatter: (time: number) => {
                    const date = new Date(time * 1000);
                    return new Intl.DateTimeFormat('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false
                    }).format(date);
                },
                priceFormatter: (price: number) => {
                    return new Intl.NumberFormat('en-IN', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    }).format(price);
                }
            }
        };

        // Main chart
        const chart = createChart(chartRef.current, {
            ...base,
            width: chartRef.current.clientWidth,
            height: 440,
        });

        const cSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#22c55e", downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#22c55e", wickDownColor: "#ef4444",
        });
        const vSeries = chart.addSeries(LineSeries, {
            color: "#f59e0b", lineWidth: 1,
            crosshairMarkerVisible: true, crosshairMarkerRadius: 3,
            title: "VWAP",
            priceLineVisible: true, lastValueVisible: true,
        });
        const e20Series = chart.addSeries(LineSeries, {
            color: "#3b82f6", lineWidth: 1, title: "EMA 20",
            priceLineVisible: false, crosshairMarkerRadius: 3,
        });
        const e50Series = chart.addSeries(LineSeries, {
            color: "#ec4899", lineWidth: 1, title: "EMA 50",
            priceLineVisible: false, crosshairMarkerRadius: 3,
        });

        // Crosshair move — live OHLCV readout
        chart.subscribeCrosshairMove(param => {
            if (!param.point || !param.seriesData) return;
            const c = param.seriesData.get(cSeries) as any;
            if (c) setOhlcv({ open: c.open, high: c.high, low: c.low, close: c.close, volume: 0 });
        });

        // Volume chart
        const volChart = createChart(volRef.current, {
            ...base,
            width: volRef.current.clientWidth,
            height: 90,
            timeScale: { ...base.timeScale, visible: false },
        });
        const vols = volChart.addSeries(HistogramSeries, {
            priceFormat: { type: "volume" }, priceScaleId: "",
        });
        volChart.priceScale("").applyOptions({ scaleMargins: { top: 0.1, bottom: 0 } });

        // Add RSI to Volume Chart (using a separate strict 0-100 price scale)
        const rsiLine = volChart.addSeries(LineSeries, {
            color: "#a855f7", lineWidth: 1, title: "RSI 14",
            priceScaleId: "rsi",
            priceLineVisible: false,
        });
        volChart.priceScale("rsi").applyOptions({
            autoScale: false,
            scaleMargins: { top: 0.1, bottom: 0.1 },
        });

        // Sync time scales
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
            try {
                const r = chart.timeScale().getVisibleRange();
                if (r !== null) {
                    volChart.timeScale().setVisibleRange(r);
                }
            } catch (e) {
                // Ignore "Value is null" when volume chart has no data yet
            }
        });

        const onResize = () => {
            if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
            if (volRef.current) volChart.applyOptions({ width: volRef.current.clientWidth });
        };
        window.addEventListener("resize", onResize);

        chartInst.current = chart;
        volChartInst.current = volChart;
        candleSeries.current = cSeries;
        vwapSeries.current = vSeries;
        ema20Series.current = e20Series;
        ema50Series.current = e50Series;
        volSeries.current = vols;
        rsiSeries.current = rsiLine;

        return () => {
            window.removeEventListener("resize", onResize);
            chart.remove();
            volChart.remove();
        };
    }, [resolvedTheme]);

    // ── Toggle Indicators without refetching ────────────────────────────────
    useEffect(() => {
        if (hasChart) vwapSeries.current?.setData(showVwap ? indData.vwap : []);
    }, [showVwap, indData.vwap, hasChart]);

    useEffect(() => {
        if (hasChart) ema20Series.current?.setData(showEma20 ? indData.ema20 : []);
    }, [showEma20, indData.ema20, hasChart]);

    useEffect(() => {
        if (hasChart) ema50Series.current?.setData(showEma50 ? indData.ema50 : []);
    }, [showEma50, indData.ema50, hasChart]);

    useEffect(() => {
        if (hasChart) rsiSeries.current?.setData(showRsi ? indData.rsi : []);
    }, [showRsi, indData.rsi, hasChart]);

    // ── Load data ────────────────────────────────────────────────────────────
    const loadChart = useCallback(async () => {
        if (!symbol || !date || !candleSeries.current) return;
        setLoading(true);
        setNoData(false);
        setOhlcv(null);
        setDayChange(null);
        setHasChart(false);

        try {
            const res = await fetch(
                `/api/historify/day-chart?symbol=${encodeURIComponent(symbol)}&exchange=NSE&interval=${interval}&date=${date}`
            );
            if (!res.ok) throw new Error("API error");
            const data = await res.json();

            if (!data.candles || data.candles.length === 0) {
                setNoData(true);
                return;
            }

            const sorted = [...data.candles].sort((a: any, b: any) => a.timestamp - b.timestamp);

            const cData = sorted.map((c: any) => ({
                time: c.timestamp as Time,
                open: c.open, high: c.high, low: c.low, close: c.close,
            }));
            const vData = sorted.map((c: any) => ({
                time: c.timestamp as Time, value: c.volume,
                color: c.close >= c.open ? "rgba(34,197,94,0.35)" : "rgba(239,68,68,0.35)",
            }));
            const wData = (data.indicators?.vwap || []).map((v: any, i: number) => ({
                time: sorted[i].timestamp as Time, value: v.value,
            }));
            const e20 = (data.indicators?.ema20 || []).map((v: any) => ({ time: v.time as Time, value: v.value }));
            const e50 = (data.indicators?.ema50 || []).map((v: any) => ({ time: v.time as Time, value: v.value }));
            const rData = (data.indicators?.rsi || []).map((v: any) => ({ time: v.time as Time, value: v.value }));

            setIndData({ vwap: wData, ema20: e20, ema50: e50, rsi: rData });

            candleSeries.current!.setData(cData);
            volSeries.current!.setData(vData);
            chartInst.current?.timeScale().fitContent();

            const first = cData[0];
            const last = cData[cData.length - 1];
            const absChg = last.close - first.open;
            const pctChg = (absChg / first.open) * 100;
            setDayChange({ abs: absChg, pct: pctChg });
            setOhlcv({ open: last.open, high: last.high, low: last.low, close: last.close, volume: sorted[sorted.length - 1].volume });
            setHasChart(true);
        } catch (err) {
            console.error(err);
            setNoData(true);
        } finally {
            setLoading(false);
        }
    }, [symbol, date, interval]);

    // Auto-load on dependency change
    useEffect(() => {
        loadChart();
    }, [loadChart]);

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[#070d1a] text-slate-100 flex flex-col">

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <div className="px-6 pt-6 pb-4 border-b border-slate-800/70 flex items-center gap-4">
                <div className="w-9 h-9 rounded-lg bg-rose-500/10 border border-rose-500/25 flex items-center justify-center shrink-0">
                    <CalendarDays className="w-4.5 h-4.5 text-rose-400" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <h1 className="text-lg font-bold text-white tracking-tight">Day Chart Viewer</h1>
                        {tfStats && (
                            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded border ${TIER_COLORS[tfStats.tier]}`}>
                                TF {tfStats.tier}
                            </span>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-500">
                        F&amp;O daily &amp; intraday · {tradedOnly ? `${TRADED_FNO.length} Tradefinder stocks` : `${ALL_FNO.length} F&O stocks`} · NSE · Dhan V2
                    </p>
                </div>

                {/* Live price display */}
                {dayChange && (
                    <div className="flex items-center gap-3 text-right shrink-0">
                        {dayChange.pct >= 0
                            ? <TrendingUp className="w-4 h-4 text-emerald-400" />
                            : <TrendingDown className="w-4 h-4 text-red-400" />
                        }
                        <div>
                            <div className="text-lg font-bold text-white font-mono">
                                {ohlcv ? `₹${fmtPrice(ohlcv.close)}` : "—"}
                            </div>
                            <div className={`text-xs font-semibold ${dayChange.pct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                {dayChange.pct >= 0 ? "+" : ""}{dayChange.pct.toFixed(2)}%
                                &nbsp;({dayChange.abs >= 0 ? "+" : ""}{fmtPrice(dayChange.abs)})
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Controls ────────────────────────────────────────────────── */}
            <div className="px-6 py-3 border-b border-slate-800/50 flex flex-wrap items-center gap-3 bg-slate-900/30">

                {/* Tradefinder toggle */}
                <button
                    onClick={() => setTradedOnly(v => !v)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold border transition-all ${tradedOnly
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                        : "bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200"
                        }`}
                >
                    <Shield className="w-3 h-3" />
                    Tradefinder Only
                    {tradedOnly && <span className="text-emerge-400 opacity-70 font-normal">({TRADED_FNO.length})</span>}
                </button>

                <div className="h-4 w-px bg-slate-700" />

                {/* Symbol — Searchable */}
                <div className="flex items-center gap-2 relative" ref={symbolDropdownRef}>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest shrink-0">Symbol</label>
                    <div className="relative w-44">
                        <input
                            type="text"
                            value={symbolOpen ? symbolSearch : symbol}
                            onFocus={() => { setSymbolOpen(true); setSymbolSearch(""); }}
                            onChange={e => setSymbolSearch(e.target.value)}
                            placeholder="Search..."
                            className="w-full px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white font-mono focus:outline-none focus:border-rose-500"
                        />
                        {symbolOpen && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-full max-h-64 overflow-y-auto bg-slate-800 border border-slate-700 rounded-md shadow-xl">
                                {filteredSymbols.length === 0 && (
                                    <div className="px-3 py-2 text-xs text-slate-500">No matches</div>
                                )}
                                {filteredSymbols.map((s: string) => {
                                    const isTf = TRADEFINDER_MAP.has(s);
                                    return (
                                        <button
                                            key={s}
                                            onClick={() => { setSymbol(s); setSymbolOpen(false); }}
                                            className={`w-full text-left px-3 py-1.5 text-sm font-mono hover:bg-slate-700 transition-colors ${s === symbol ? "bg-rose-500/20 text-rose-300" : "text-white"}`}
                                        >
                                            {s}{!tradedOnly && isTf ? " ✓" : ""}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Interval segmented */}
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-md p-0.5">
                    {INTERVALS.map(({ value, label }) => (
                        <button
                            key={value}
                            onClick={() => setInterval_(value)}
                            className={`px-2.5 py-1 text-xs font-bold rounded transition-all ${interval === value
                                ? "bg-rose-500 text-white shadow"
                                : "text-slate-400 hover:text-slate-200"
                                }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Date */}
                <div className="flex items-center gap-2">
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest shrink-0">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="px-2.5 py-1.5 text-sm bg-slate-800 border border-slate-700 rounded-md text-white focus:outline-none focus:border-rose-500"
                    />
                </div>

                {/* Load button with tooltip */}
                <div className="relative group">
                    <button
                        onClick={loadChart}
                        disabled={loading || !symbol}
                        className="flex items-center gap-1.5 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-xs rounded-md transition-all"
                    >
                        {loading
                            ? <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading…</>
                            : <><Zap className="w-3.5 h-3.5" /> Load Chart</>
                        }
                    </button>
                    {/* Hover tooltip */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-72 hidden group-hover:block z-50 pointer-events-none">
                        <div className="bg-slate-900 border border-slate-700 rounded-lg p-3 shadow-xl text-[11px] text-slate-300 space-y-1.5">
                            <div className="flex items-center gap-1.5 text-amber-400 font-semibold mb-1">
                                <Info className="w-3 h-3" /> Requires downloaded data
                            </div>
                            <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">1.</span><span>Go to <strong className="text-white">Watchlist</strong> → add symbols (e.g. ADANIGREEN)</span></div>
                            <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">2.</span><span>Go to <strong className="text-white">Download</strong> → select symbol, pick interval &amp; date range → click Download</span></div>
                            <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">3.</span><span>Come back here → select symbol &amp; date → <strong className="text-white">Load Chart</strong></span></div>
                        </div>
                        <div className="w-2 h-2 bg-slate-900 border-b border-r border-slate-700 rotate-45 mx-auto -mt-1" />
                    </div>
                </div>

                <div className="h-4 w-px bg-slate-700 mx-1" />

                {/* Indicators Toggles */}
                <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest mr-1">Toggles:</span>
                    {[
                        { label: "VWAP", active: showVwap, color: "text-amber-400 border-amber-500/50 bg-amber-500/10", setter: setShowVwap },
                        { label: "EMA 20", active: showEma20, color: "text-blue-400 border-blue-500/50 bg-blue-500/10", setter: setShowEma20 },
                        { label: "EMA 50", active: showEma50, color: "text-pink-400 border-pink-500/50 bg-pink-500/10", setter: setShowEma50 },
                        { label: "RSI", active: showRsi, color: "text-purple-400 border-purple-500/50 bg-purple-500/10", setter: setShowRsi },
                    ].map(btn => (
                        <button
                            key={btn.label}
                            onClick={() => btn.setter(!btn.active)}
                            className={`px-2 py-1 text-[10px] font-bold rounded border transition-all ${btn.active ? btn.color : "text-slate-500 border-slate-700/50 hover:bg-slate-800"
                                }`}
                        >
                            {btn.label}
                        </button>
                    ))}
                </div>

                {/* Tradefinder stats pill */}
                {tfStats && (
                    <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-400 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5">
                        <Activity className="w-3 h-3 text-emerald-400" />
                        <span>{tfStats.count} trades</span>
                        <span className="text-slate-600">·</span>
                        <span className={tfStats.winRate >= 60 ? "text-emerald-400" : "text-red-400"}>{tfStats.winRate.toFixed(0)}% WR</span>
                        <span className="text-slate-600">·</span>
                        <span className={tfStats.pnl >= 0 ? "text-emerald-400" : "text-red-400"}>
                            ₹{(tfStats.pnl / 1000).toFixed(1)}k P&amp;L
                        </span>
                    </div>
                )}
            </div>

            {/* ── OHLCV bar ───────────────────────────────────────────────── */}
            {ohlcv && (
                <div className="px-6 py-2 border-b border-slate-800/40 flex items-center gap-5 text-[11px] font-mono bg-slate-900/20">
                    {[
                        { label: "O", value: ohlcv.open, color: "text-slate-300" },
                        { label: "H", value: ohlcv.high, color: "text-emerald-400" },
                        { label: "L", value: ohlcv.low, color: "text-red-400" },
                        { label: "C", value: ohlcv.close, color: ohlcv.close >= ohlcv.open ? "text-emerald-400" : "text-red-400" },
                    ].map(({ label, value, color }) => (
                        <span key={label} className="flex items-center gap-1">
                            <span className="text-slate-500">{label}</span>
                            <span className={`${color} font-semibold`}>{fmtPrice(value)}</span>
                        </span>
                    ))}
                    {ohlcv.volume > 0 && (
                        <span className="flex items-center gap-1">
                            <span className="text-slate-500">V</span>
                            <span className="text-slate-300 font-semibold">
                                {ohlcv.volume >= 1_000_000
                                    ? `${(ohlcv.volume / 1_000_000).toFixed(2)}M`
                                    : ohlcv.volume >= 1000
                                        ? `${(ohlcv.volume / 1000).toFixed(1)}K`
                                        : ohlcv.volume
                                }
                            </span>
                        </span>
                    )}
                    {/* VWAP label */}
                    {showVwap && (
                        <span className="flex items-center gap-1 ml-2 border-l border-slate-700 pl-3">
                            <span className="w-4 h-0.5 bg-amber-400 rounded inline-block" />
                            <span className="text-amber-400/80">VWAP</span>
                        </span>
                    )}
                    {showEma20 && (
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-0.5 bg-blue-500 rounded inline-block" />
                            <span className="text-blue-400/80">EMA20</span>
                        </span>
                    )}
                    {showEma50 && (
                        <span className="flex items-center gap-1">
                            <span className="w-4 h-0.5 bg-pink-500 rounded inline-block" />
                            <span className="text-pink-400/80">EMA50</span>
                        </span>
                    )}
                </div>
            )}

            {/* ── Charts ──────────────────────────────────────────────────── */}
            <div className="flex-1 flex flex-col px-6 py-4 gap-2 min-h-0">

                {/* Main candle chart */}
                <div className="relative w-full bg-[#0a0f1a] border border-slate-800/60 rounded-xl overflow-hidden" style={{ height: 440 }}>
                    <div ref={chartRef} className="w-full h-full" />

                    {/* Empty / no-data overlays */}
                    {noData && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0f1a]/95 gap-3">
                            <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center">
                                <Database className="w-6 h-6 text-slate-600" />
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-slate-300">{symbol} · {date}</p>
                                <p className="text-xs text-slate-500 mt-1">No {interval} data in database for this date</p>
                            </div>
                            {/* Setup steps */}
                            <div className="bg-slate-900 border border-slate-800 rounded-xl px-5 py-4 text-[11px] text-slate-400 space-y-2 max-w-xs text-left">
                                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-1">
                                    <Info className="w-3.5 h-3.5" /> To get intraday data:
                                </div>
                                <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">1.</span><span><strong className="text-slate-300">Watchlist</strong> — ensure {symbol} is added</span></div>
                                <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">2.</span><span><strong className="text-slate-300">Download</strong> — select {symbol}, interval <code className="bg-slate-800 px-1 rounded">{interval}</code>, date range including {date}</span></div>
                                <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">3.</span><span>Come back here and load again</span></div>
                            </div>
                            <a
                                href="/historify/download"
                                className="flex items-center gap-1.5 px-4 py-2 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold rounded-lg hover:bg-rose-500/20 transition-colors"
                            >
                                <BarChart2 className="w-3.5 h-3.5" /> Go to Download page
                            </a>
                        </div>
                    )}
                    {!noData && !hasChart && !loading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
                            <CalendarDays className="w-10 h-10 text-slate-700" />
                            <p className="text-xs text-slate-500">Pick a stock, date &amp; interval → Load Chart</p>
                            {/* Setup guide */}
                            <div className="mt-2 bg-slate-900/80 border border-slate-800 rounded-xl px-5 py-4 text-[11px] text-slate-400 space-y-2 max-w-xs text-left">
                                <div className="flex items-center gap-1.5 text-amber-400 font-semibold text-xs mb-1">
                                    <Info className="w-3.5 h-3.5" /> How to get data
                                </div>
                                <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">1.</span><span><strong className="text-slate-300">Watchlist</strong> — add your F&amp;O symbols first</span></div>
                                <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">2.</span><span><strong className="text-slate-300">Download</strong> — select symbol, interval &amp; date range → Download Data (stores to local DB)</span></div>
                                <div className="flex items-start gap-2"><span className="text-rose-400 font-bold shrink-0">3.</span><span>Return here, select symbol &amp; date → <strong className="text-slate-300">Load Chart</strong></span></div>
                            </div>
                        </div>
                    )}
                    {loading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[#0a0f1a]/80">
                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                <RefreshCw className="w-4 h-4 animate-spin text-rose-400" />
                                Loading {symbol} · {date} · {interval}…
                            </div>
                        </div>
                    )}
                </div>

                {/* Volume chart */}
                <div className="relative w-full bg-[#0a0f1a] border border-slate-800/40 rounded-lg overflow-hidden" style={{ height: 90 }}>
                    <div className="absolute top-1.5 left-3 z-10 text-[9px] text-slate-600 font-semibold uppercase tracking-widest">Volume</div>
                    <div ref={volRef} className="w-full h-full" />
                </div>
            </div>

            {/* ── Status footer ───────────────────────────────────────────── */}
            <div className="px-6 py-2 border-t border-slate-800/50 flex items-center gap-4 text-[10px] text-slate-600 bg-slate-900/20">
                <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Data via Dhan V2 · better-sqlite3</span>
                <span>·</span>
                <span>F&amp;O Universe: {ALL_FNO.length} stocks · TF Traded: {TRADED_FNO.length}</span>
            </div>
        </div>
    );
}

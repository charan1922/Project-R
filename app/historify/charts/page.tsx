"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, Time, CandlestickData, ColorType, HistogramSeries, CandlestickSeries, LineSeries } from "lightweight-charts";
import { useTheme } from "next-themes";
import { BarChart2, TrendingUp, Activity, RefreshCw, AlertCircle } from "lucide-react";

export default function ChartsPage() {
    const { resolvedTheme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
    const [candleSeries, setCandleSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
    const [volumeSeries, setVolumeSeries] = useState<ISeriesApi<"Histogram"> | null>(null);
    const [ema20Series, setEma20Series] = useState<ISeriesApi<"Line"> | null>(null);
    const [ema50Series, setEma50Series] = useState<ISeriesApi<"Line"> | null>(null);

    const [symbol, setSymbol] = useState("");
    const [interval, setInterval_] = useState("Daily");
    const [showEMA, setShowEMA] = useState(true);
    const [showRSI, setShowRSI] = useState(true);
    const [loading, setLoading] = useState(false);
    const [noData, setNoData] = useState(false);
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);

    // Simple state for rendering last price
    const [lastCandle, setLastCandle] = useState<any>(null);
    const [changePct, setChangePct] = useState(0);

    // Load watchlist for symbol picker
    useEffect(() => {
        fetch("/api/historify/watchlist")
            .then(r => r.json())
            .then((data: any[]) => {
                if (Array.isArray(data) && data.length > 0) {
                    const syms = data.map(d => d.symbol);
                    setWatchlistSymbols(syms);
                    setSymbol(syms[0]);
                }
            })
            .catch(() => { });
    }, []);

    // Init Chart
    useEffect(() => {
        if (!chartContainerRef.current) return;

        const isDark = resolvedTheme !== "light";
        const backgroundColor = isDark ? "#0f172a" : "#ffffff";
        const textColor = isDark ? "#cbd5e1" : "#334155";
        const gridColor = isDark ? "#1e293b" : "#e2e8f0";

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: backgroundColor },
                textColor: textColor,
            },
            grid: {
                vertLines: { color: gridColor },
                horzLines: { color: gridColor },
            },
            width: chartContainerRef.current.clientWidth,
            height: 450,
            crosshair: { mode: 0 },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
            },
        });

        const vSeries = chart.addSeries(HistogramSeries, {
            color: "#64748b",
            priceFormat: { type: "volume" },
            priceScaleId: "",
        });

        // Setup separate scale for volume at bottom
        chart.priceScale("").applyOptions({
            scaleMargins: { top: 0.8, bottom: 0 },
        });

        const cSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#10b981",
            downColor: "#ef4444",
            borderVisible: false,
            wickUpColor: "#10b981",
            wickDownColor: "#ef4444",
        });

        const e20 = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 2, crosshairMarkerVisible: false });
        const e50 = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 2, crosshairMarkerVisible: false });

        setChartInstance(chart);
        setCandleSeries(cSeries);
        setVolumeSeries(vSeries);
        setEma20Series(e20);
        setEma50Series(e50);

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        window.addEventListener("resize", handleResize);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
        };
    }, [resolvedTheme]);

    // Fetch and Plot Data
    useEffect(() => {
        if (!candleSeries || !volumeSeries || !ema20Series || !ema50Series) return;

        let active = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                // In a real app, you would fetch from your API. Here we simulate the API call response
                // for the purpose of the UI demo, as the backend DuckDB may be empty initially.
                // We will fallback to a generated simulation if DuckDB is empty.

                const res = await fetch(`/api/historify/chart-data?symbol=${symbol}&interval=${interval}`);
                let data = await res.json();

                if (!active) return;

                if (!data.candles || data.candles.length === 0) {
                    setNoData(true);
                    setLastCandle(null);
                    setLoading(false);
                    return;
                }
                setNoData(false);

                // Map to Lightweight Charts format
                const cData: CandlestickData[] = data.candles.map((c: any) => ({
                    time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close
                })).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

                const vData = data.candles.map((c: any) => ({
                    time: c.time as Time, value: c.volume, color: c.close >= c.open ? "rgba(16, 185, 129, 0.4)" : "rgba(239, 68, 68, 0.4)"
                })).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime());

                candleSeries.setData(cData);
                volumeSeries.setData(vData);

                if (data.indicators?.ema20) {
                    ema20Series.setData(data.indicators.ema20.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()));
                }
                if (data.indicators?.ema50) {
                    ema50Series.setData(data.indicators.ema50.sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()));
                }

                // Fit Content
                chartInstance?.timeScale().fitContent();

                // Update Stats UI
                if (cData.length >= 2) {
                    const last = cData[cData.length - 1];
                    const prev = cData[cData.length - 2];
                    setLastCandle(last);
                    setChangePct(((last.close - prev.close) / prev.close) * 100);
                }

            } catch (err) {
                console.error("Failed to load chart data:", err);
            } finally {
                if (active) setLoading(false);
            }
        };

        fetchData();

        return () => { active = false; };
    }, [symbol, interval, candleSeries, volumeSeries, ema20Series, ema50Series, chartInstance]);

    // Toggle Indicators
    useEffect(() => {
        if (ema20Series) ema20Series.applyOptions({ visible: showEMA });
        if (ema50Series) ema50Series.applyOptions({ visible: showEMA });
    }, [showEMA, ema20Series, ema50Series]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {/* Header */}
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center">
                        <BarChart2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Charts · TradingView</h1>
                        <p className="text-sm text-slate-500">Professional-grade charting with EMA & RSI indicators</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 max-w-7xl mx-auto space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap gap-3 items-center">
                    <select value={symbol} onChange={(e) => { setSymbol(e.target.value); setNoData(false); }} className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500" disabled={watchlistSymbols.length === 0}>
                        {watchlistSymbols.length === 0
                            ? <option value="">No symbols in watchlist</option>
                            : watchlistSymbols.map((s) => <option key={s} value={s}>{s}</option>)
                        }
                    </select>
                    <select value={interval} onChange={(e) => setInterval_(e.target.value)} className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500">
                        {["1min", "5min", "15min", "30min", "1hour", "Daily"].map((i) => (
                            <option key={i} value={i}>{i}</option>
                        ))}
                    </select>
                    <div className="h-6 w-px bg-slate-700" />
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={showEMA} onChange={(e) => setShowEMA(e.target.checked)} className="rounded border-slate-600" />
                        <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> EMA (20, 50)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input type="checkbox" checked={showRSI} onChange={(e) => setShowRSI(e.target.checked)} className="rounded border-slate-600" />
                        <Activity className="w-3.5 h-3.5 text-violet-400" /> RSI (14)
                    </label>

                    {/* Loading State & Price Display */}
                    <div className="ml-auto flex items-baseline gap-3">
                        {loading && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
                        {lastCandle && (
                            <>
                                <span className="text-2xl font-bold text-white font-mono">₹{lastCandle.close.toFixed(2)}</span>
                                <span className={`text-sm font-semibold ${changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {changePct >= 0 ? "+" : ""}{(lastCandle.close - (lastCandle.close / (1 + changePct / 100))).toFixed(2)} ({changePct.toFixed(2)}%)
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Lightweight Chart Container */}
                <div className="relative w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden" style={{ height: '450px' }}>
                    <div ref={chartContainerRef} className="w-full h-full" />
                    {noData && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
                            <AlertCircle className="w-10 h-10 text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-400">No data for {symbol} · {interval}</p>
                            <p className="text-xs text-slate-600 mt-1">Download data first via <a href="/historify/download" className="text-teal-400 underline">Bulk Download</a></p>
                        </div>
                    )}
                    {!noData && watchlistSymbols.length === 0 && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900/90">
                            <AlertCircle className="w-10 h-10 text-slate-600 mb-3" />
                            <p className="text-sm text-slate-400">Add symbols to your <a href="/historify/watchlist" className="text-teal-400 underline">Watchlist</a> first</p>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Bullish candle</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500" /> Bearish candle</div>
                    {showEMA && <><div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-sky-400 rounded" /> EMA 20</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-amber-400 rounded" /> EMA 50</div></>}
                    {showRSI && <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-violet-400 rounded" /> RSI 14</div>}
                </div>
            </div>
        </div>
    );
}


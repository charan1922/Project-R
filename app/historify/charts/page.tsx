"use client";

import { useEffect, useRef, useState } from "react";
import {
    createChart, IChartApi, ISeriesApi, Time, CandlestickData,
    ColorType, HistogramSeries, CandlestickSeries, LineSeries
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { BarChart2, TrendingUp, Activity, RefreshCw, AlertCircle } from "lucide-react";

export default function ChartsPage() {
    const { resolvedTheme } = useTheme();

    // Main chart refs
    const chartContainerRef = useRef<HTMLDivElement>(null);
    const rsiContainerRef = useRef<HTMLDivElement>(null);

    const [chartInstance, setChartInstance] = useState<IChartApi | null>(null);
    const [rsiChartInstance, setRsiChartInstance] = useState<IChartApi | null>(null);
    const [candleSeries, setCandleSeries] = useState<ISeriesApi<"Candlestick"> | null>(null);
    const [volumeSeries, setVolumeSeries] = useState<ISeriesApi<"Histogram"> | null>(null);
    const [ema20Series, setEma20Series] = useState<ISeriesApi<"Line"> | null>(null);
    const [ema50Series, setEma50Series] = useState<ISeriesApi<"Line"> | null>(null);
    const [rsiSeries, setRsiSeries] = useState<ISeriesApi<"Line"> | null>(null);

    const [symbol, setSymbol] = useState("");
    const [interval, setIntervalVal] = useState("Daily");
    const [showEMA, setShowEMA] = useState(true);
    const [showRSI, setShowRSI] = useState(false);
    const [loading, setLoading] = useState(false);
    const [noData, setNoData] = useState(false);
    const [noRsiData, setNoRsiData] = useState(false);
    const [watchlistSymbols, setWatchlistSymbols] = useState<string[]>([]);
    const [lastCandle, setLastCandle] = useState<any>(null);
    const [changePct, setChangePct] = useState(0);

    // Load watchlist
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

    // Init Main Chart + RSI Chart
    useEffect(() => {
        if (!chartContainerRef.current || !rsiContainerRef.current) return;

        const isDark = resolvedTheme !== "light";
        const backgroundColor = isDark ? "#0f172a" : "#ffffff";
        const textColor = isDark ? "#cbd5e1" : "#334155";
        const gridColor = isDark ? "#1e293b" : "#e2e8f0";

        const commonOptions = {
            layout: { background: { type: ColorType.Solid, color: backgroundColor }, textColor },
            grid: { vertLines: { color: gridColor }, horzLines: { color: gridColor } },
            crosshair: { mode: 0 },
            timeScale: { timeVisible: true, secondsVisible: false },
        };

        // — Main chart
        const chart = createChart(chartContainerRef.current, {
            ...commonOptions,
            width: chartContainerRef.current.clientWidth,
            height: 450,
        });

        const vSeries = chart.addSeries(HistogramSeries, {
            color: "#64748b", priceFormat: { type: "volume" }, priceScaleId: "",
        });
        chart.priceScale("").applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });

        const cSeries = chart.addSeries(CandlestickSeries, {
            upColor: "#10b981", downColor: "#ef4444",
            borderVisible: false, wickUpColor: "#10b981", wickDownColor: "#ef4444",
        });
        const e20 = chart.addSeries(LineSeries, { color: "#38bdf8", lineWidth: 2, crosshairMarkerVisible: false });
        const e50 = chart.addSeries(LineSeries, { color: "#f59e0b", lineWidth: 2, crosshairMarkerVisible: false });

        // — RSI chart
        const rsiChart = createChart(rsiContainerRef.current, {
            ...commonOptions,
            width: rsiContainerRef.current.clientWidth,
            height: 120,
            rightPriceScale: { scaleMargins: { top: 0.1, bottom: 0.1 }, autoScale: false, },
            timeScale: { timeVisible: true, secondsVisible: false },
        });

        const rsiLine = rsiChart.addSeries(LineSeries, {
            color: "#a78bfa", lineWidth: 2, crosshairMarkerVisible: false,
            priceScaleId: "right",
        });
        rsiChart.priceScale("right").applyOptions({ minimum: 0, maximum: 100 } as any);

        // Overbought / Oversold horizontal lines
        rsiLine.createPriceLine({ price: 70, color: "rgba(239,68,68,0.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "OB" });
        rsiLine.createPriceLine({ price: 30, color: "rgba(16,185,129,0.5)", lineWidth: 1, lineStyle: 2, axisLabelVisible: true, title: "OS" });

        // Sync time scales
        chart.timeScale().subscribeVisibleTimeRangeChange(() => {
            const range = chart.timeScale().getVisibleRange();
            if (range) rsiChart.timeScale().setVisibleRange(range);
        });

        // Resize handler
        const handleResize = () => {
            if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            if (rsiContainerRef.current) rsiChart.applyOptions({ width: rsiContainerRef.current.clientWidth });
        };
        window.addEventListener("resize", handleResize);

        setChartInstance(chart);
        setRsiChartInstance(rsiChart);
        setCandleSeries(cSeries);
        setVolumeSeries(vSeries);
        setEma20Series(e20);
        setEma50Series(e50);
        setRsiSeries(rsiLine);

        return () => {
            window.removeEventListener("resize", handleResize);
            chart.remove();
            rsiChart.remove();
        };
    }, [resolvedTheme]);

    // Fetch and plot data
    useEffect(() => {
        if (!candleSeries || !volumeSeries || !ema20Series || !ema50Series || !rsiSeries || !symbol) return;

        let active = true;

        const fetchData = async () => {
            setLoading(true);
            try {
                const res = await fetch(`/api/historify/chart-data?symbol=${symbol}&exchange=NSE&interval=${interval}`);
                const data = await res.json();

                if (!active) return;

                if (!data.candles || data.candles.length === 0) {
                    setNoData(true); setLastCandle(null); setLoading(false); return;
                }
                setNoData(false);

                const sorted = (arr: any[]) => [...arr].sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

                const cData: CandlestickData[] = sorted(data.candles).map((c: any) => ({
                    time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close,
                }));
                const vData = sorted(data.candles).map((c: any) => ({
                    time: c.time as Time, value: c.volume,
                    color: c.close >= c.open ? "rgba(16,185,129,0.4)" : "rgba(239,68,68,0.4)",
                }));

                candleSeries.setData(cData);
                volumeSeries.setData(vData);

                if (data.indicators?.ema20) ema20Series.setData(sorted(data.indicators.ema20));
                if (data.indicators?.ema50) ema50Series.setData(sorted(data.indicators.ema50));

                if (data.indicators?.rsi && data.indicators.rsi.length > 0) {
                    rsiSeries.setData(sorted(data.indicators.rsi));
                    setNoRsiData(false);
                } else {
                    setNoRsiData(true);
                }

                chartInstance?.timeScale().fitContent();

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
    }, [symbol, interval, candleSeries, volumeSeries, ema20Series, ema50Series, rsiSeries, chartInstance]);

    // Toggle EMA lines
    useEffect(() => {
        if (ema20Series) ema20Series.applyOptions({ visible: showEMA });
        if (ema50Series) ema50Series.applyOptions({ visible: showEMA });
    }, [showEMA, ema20Series, ema50Series]);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="px-6 pt-8 pb-6 border-b border-slate-800/60">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-500/30 flex items-center justify-center">
                        <BarChart2 className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Charts · TradingView</h1>
                        <p className="text-sm text-slate-500">Professional charting with EMA &amp; RSI indicators · Dhan V2</p>
                    </div>
                </div>
            </div>

            <div className="px-6 py-6 max-w-7xl mx-auto space-y-4">
                {/* Controls */}
                <div className="flex flex-wrap gap-3 items-center">
                    <select value={symbol} onChange={e => { setSymbol(e.target.value); setNoData(false); }}
                        className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500"
                        disabled={watchlistSymbols.length === 0}>
                        {watchlistSymbols.length === 0
                            ? <option value="">No symbols in watchlist</option>
                            : watchlistSymbols.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <select value={interval} onChange={e => setIntervalVal(e.target.value)}
                        className="px-3 py-2 text-sm bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:border-amber-500">
                        {["1min", "5min", "15min", "30min", "1hour", "Daily"].map(i => <option key={i}>{i}</option>)}
                    </select>
                    <div className="h-6 w-px bg-slate-700" />
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
                        <input type="checkbox" checked={showEMA} onChange={e => setShowEMA(e.target.checked)} className="rounded border-slate-600 accent-sky-400" />
                        <TrendingUp className="w-3.5 h-3.5 text-sky-400" /> EMA (20, 50)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer select-none">
                        <input type="checkbox" checked={showRSI} onChange={e => setShowRSI(e.target.checked)} className="rounded border-slate-600 accent-violet-400" />
                        <Activity className="w-3.5 h-3.5 text-violet-400" /> RSI (14)
                    </label>

                    <div className="ml-auto flex items-baseline gap-3">
                        {loading && <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />}
                        {lastCandle && (
                            <>
                                <span className="text-2xl font-bold text-white font-mono">₹{lastCandle.close.toFixed(2)}</span>
                                <span className={`text-sm font-semibold ${changePct >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                                    {changePct >= 0 ? "+" : ""}{(lastCandle.close - lastCandle.close / (1 + changePct / 100)).toFixed(2)} ({changePct.toFixed(2)}%)
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Main Chart */}
                <div className="relative w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden" style={{ height: 450 }}>
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

                {/* RSI Sub-panel */}
                <div className={`relative w-full bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-all ${showRSI ? "block" : "hidden"}`} style={{ height: 120 }}>
                    <div className="absolute top-1.5 left-3 z-10 flex items-center gap-1.5">
                        <Activity className="w-3 h-3 text-violet-400" />
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">RSI (14)</span>
                    </div>
                    <div ref={rsiContainerRef} className="w-full h-full" />
                    {showRSI && noRsiData && !noData && (
                        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
                            <p className="text-xs text-slate-500">No RSI data — need at least 15 candles</p>
                        </div>
                    )}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-4 text-xs text-slate-500">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-emerald-500" /> Bullish</div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-red-500" /> Bearish</div>
                    {showEMA && <>
                        <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-sky-400 rounded" /> EMA 20</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-amber-400 rounded" /> EMA 50</div>
                    </>}
                    {showRSI && <>
                        <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-violet-400 rounded" /> RSI 14</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-red-400 rounded opacity-60" style={{ borderTop: "1px dashed" }} /> Overbought (70)</div>
                        <div className="flex items-center gap-2"><div className="w-5 h-0.5 bg-emerald-400 rounded opacity-60" style={{ borderTop: "1px dashed" }} /> Oversold (30)</div>
                    </>}
                </div>
            </div>
        </div>
    );
}

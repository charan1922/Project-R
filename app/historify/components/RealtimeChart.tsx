"use client";

import { useEffect, useRef } from "react";
import {
    createChart,
    IChartApi,
    ISeriesApi,
    ColorType,
    CrosshairMode,
    Time,
    CandlestickSeries,
    HistogramSeries
} from "lightweight-charts";
import { useTheme } from "next-themes";
import { useLiveTradingStore } from "@/lib/historify/live-store";

export default function RealtimeChart() {
    const { resolvedTheme } = useTheme();
    const chartContainerRef = useRef<HTMLDivElement>(null);

    // Core chart refs to bypass React state
    const chartRef = useRef<IChartApi | null>(null);
    const candleSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
    const volumeSeriesRef = useRef<ISeriesApi<"Histogram"> | null>(null);

    // Global store references 
    const activeSymbol = useLiveTradingStore((state) => state.activeSymbol);
    const connectionStatus = useLiveTradingStore((state) => state.connectionStatus);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const isDark = resolvedTheme === "dark" || resolvedTheme === "system";
        const bg = isDark ? "#020617" : "#ffffff"; // slate-950
        const text = isDark ? "#94a3b8" : "#475569"; // slate-400
        const grid = isDark ? "#1e293b" : "#e2e8f0"; // slate-800

        // 1. Initialize Chart
        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: bg },
                textColor: text,
            },
            grid: {
                vertLines: { color: grid },
                horzLines: { color: grid },
            },
            crosshair: {
                mode: CrosshairMode.Normal,
            },
            timeScale: {
                timeVisible: true,
                secondsVisible: false,
                borderColor: grid,
            },
            autoSize: true, // Native v5 auto-resizing
        });

        // 2. Configure Multi-Pane (Candlesticks on primary, Volume on secondary scale)
        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981', // emerald-500
            downColor: '#ef4444', // red-500
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#1e3a8a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '', // Set as an overlay
        });

        // Apply scale margins to visually separate into "panes" within the same chart
        chart.priceScale('').applyOptions({
            scaleMargins: {
                top: 0.8,
                bottom: 0,
            },
        });

        chartRef.current = chart;
        candleSeriesRef.current = candleSeries;
        volumeSeriesRef.current = volumeSeries;

        return () => {
            chart.remove();
            chartRef.current = null;
            candleSeriesRef.current = null;
            volumeSeriesRef.current = null;
        };
    }, [resolvedTheme]);

    // 3. Native .update() streaming pipeline (Bypasses React DOM)
    useEffect(() => {
        let prevTickTime = 0;

        const unsub = useLiveTradingStore.subscribe((state) => {
            const tick = state.latestTick;

            // Only update if we actually got a new tick object
            if (tick && tick.time !== prevTickTime && candleSeriesRef.current && volumeSeriesRef.current) {
                prevTickTime = tick.time;
                const tvTime = (Math.floor(tick.time / 1000) + 19800) as Time; // IST Offset

                try {
                    candleSeriesRef.current.update({
                        time: tvTime,
                        open: tick.open,
                        high: tick.high,
                        low: tick.low,
                        close: tick.close,
                    });

                    if (tick.volume !== undefined) {
                        const isUp = tick.close >= tick.open;
                        volumeSeriesRef.current.update({
                            time: tvTime,
                            value: tick.volume,
                            color: isUp ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
                        });
                    }
                } catch (e) {
                    // Lightweight charts throws if historical time is older than latest tick.
                    // Normally we append only newer data.
                    console.warn("Chart Update collision:", e);
                }
            }
        });

        return () => unsub();
    }, []);

    // Also clear chart data when symbol changes
    useEffect(() => {
        if (candleSeriesRef.current && volumeSeriesRef.current) {
            candleSeriesRef.current.setData([]);
            volumeSeriesRef.current.setData([]);
        }
    }, [activeSymbol]);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* Watermark Overlay (UI Layer, avoids canvas pollution and plugin bundle bloat) */}
            {activeSymbol && (
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-5 z-10">
                    <span className="text-8xl font-black text-slate-500 tracking-tighter">
                        {activeSymbol}
                    </span>
                    <span className="text-2xl font-bold tracking-widest text-slate-500 mt-2">
                        {connectionStatus === "connected" ? "LIVE MARKET FEED" : "CONNECTING..."}
                    </span>
                </div>
            )}

            {/* Empty State */}
            {!activeSymbol && (
                <div className="absolute inset-0 flex items-center justify-center z-20 text-slate-500 opacity-50">
                    <p>Select a symbol from the Watchlist to start streaming.</p>
                </div>
            )}

            {/* TradingView Canvas Container */}
            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}

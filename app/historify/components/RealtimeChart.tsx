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
    const historicalData = useLiveTradingStore((state) => state.historicalData);

    useEffect(() => {
        if (!chartContainerRef.current) return;

        const isDark = resolvedTheme === "dark" || resolvedTheme === "system";
        const bg = isDark ? "#020617" : "#ffffff";
        const text = isDark ? "#94a3b8" : "#475569";
        const grid = isDark ? "#1e293b" : "#e2e8f0";

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
                secondsVisible: true,
                borderColor: grid,
            },
            autoSize: true,
        });

        const candleSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        const volumeSeries = chart.addSeries(HistogramSeries, {
            color: '#1e3a8a',
            priceFormat: {
                type: 'volume',
            },
            priceScaleId: '',
        });

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

    // Handle Historical Data Loading
    useEffect(() => {
        if (candleSeriesRef.current && volumeSeriesRef.current && historicalData.length > 0) {
            const candles = historicalData.map(d => ({
                time: d.time as Time,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
            }));

            const volumes = historicalData.map(d => ({
                time: d.time as Time,
                value: d.volume || 0,
                color: d.close >= d.open ? 'rgba(16, 185, 129, 0.5)' : 'rgba(239, 68, 68, 0.5)',
            }));

            candleSeriesRef.current.setData(candles);
            volumeSeriesRef.current.setData(volumes);
            
            if (chartRef.current) {
                chartRef.current.timeScale().fitContent();
            }
        }
    }, [historicalData]);

    // Native .update() streaming pipeline
    // lightweight-charts .update() inserts a new candle if time is new,
    // or updates the last candle if time matches — perfect for 1-min aggregation.
    useEffect(() => {
        let prevTick: string = '';

        const unsub = useLiveTradingStore.subscribe((state) => {
            const tick = state.latestTick;
            if (!tick || !candleSeriesRef.current || !volumeSeriesRef.current) return;

            // Dedupe identical tick updates
            const key = `${tick.time}:${tick.close}:${tick.high}:${tick.low}`;
            if (key === prevTick) return;
            prevTick = key;

            const tvTime = tick.time as Time;

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
                console.warn("Chart Update collision:", e);
            }
        });

        return () => unsub();
    }, []);

    // Clear chart data when symbol changes
    useEffect(() => {
        if (candleSeriesRef.current && volumeSeriesRef.current) {
            candleSeriesRef.current.setData([]);
            volumeSeriesRef.current.setData([]);
        }
    }, [activeSymbol]);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
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

            {!activeSymbol && (
                <div className="absolute inset-0 flex items-center justify-center z-20 text-slate-500 opacity-50">
                    <p>Select a symbol from the Watchlist to start streaming.</p>
                </div>
            )}

            <div ref={chartContainerRef} className="w-full h-full" />
        </div>
    );
}

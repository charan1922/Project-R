"use client";

import { useEffect, useCallback, useRef } from "react";
import { useLiveTradingStore, LiveTick } from "@/lib/historify/live-store";
import { LiveService } from "../_lib/live-service";

const CANDLE_INTERVAL_S = 60; // 1-minute candles

/** Round epoch seconds down to the start of the current candle interval */
function bucketTime(epochS: number): number {
    return Math.floor(epochS / CANDLE_INTERVAL_S) * CANDLE_INTERVAL_S;
}

/**
 * useLiveSession
 *
 * Orchestrates the lifecycle of a live trading session.
 * Handles SSE connection, symbol sync, and 1-minute candle aggregation.
 */
export function useLiveSession() {
    const activeSymbol = useLiveTradingStore((state) => state.activeSymbol);
    const setActiveSymbol = useLiveTradingStore((state) => state.setActiveSymbol);
    const setConnectionStatus = useLiveTradingStore((state) => state.setConnectionStatus);
    const setLatestTick = useLiveTradingStore((state) => state.setLatestTick);
    const setHistoricalData = useLiveTradingStore((state) => state.setHistoricalData);
    const connectionStatus = useLiveTradingStore((state) => state.connectionStatus);
    const latestTick = useLiveTradingStore((state) => state.latestTick);

    // Running 1-minute candle aggregator (survives re-renders, no React state churn)
    const candleRef = useRef<LiveTick | null>(null);

    // Reset candle when symbol changes
    useEffect(() => {
        candleRef.current = null;
    }, [activeSymbol]);

    // 1. Manage EventSource (SSE) Lifecycle
    useEffect(() => {
        setConnectionStatus("connecting");
        const eventSource = new EventSource("/api/historify/live-stream");

        eventSource.onopen = () => setConnectionStatus("connected");

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);

                switch (parsed.event) {
                    case 'quote': {
                        const q = parsed.data;
                        const ltp: number = q.ltp;
                        const ltt: number = q.ltt || Math.floor(Date.now() / 1000);
                        const candleTime = bucketTime(ltt);
                        const volume: number = q.volume || 0;

                        const prev = candleRef.current;

                        if (prev && prev.time === candleTime) {
                            // Same minute — update running candle
                            prev.high = Math.max(prev.high, ltp);
                            prev.low = Math.min(prev.low, ltp);
                            prev.close = ltp;
                            prev.volume = volume; // cumulative day volume from Dhan
                            setLatestTick({ ...prev });
                        } else {
                            // New minute — start fresh candle
                            const newCandle: LiveTick = {
                                time: candleTime,
                                open: ltp,
                                high: ltp,
                                low: ltp,
                                close: ltp,
                                volume: volume,
                            };
                            candleRef.current = newCandle;
                            setLatestTick({ ...newCandle });
                        }
                        break;
                    }

                    case 'info':
                        if (parsed.data.status === 'connected') setConnectionStatus("connected");
                        break;

                    case 'error':
                        console.error("[LiveSession] Server Error:", parsed.data.message);
                        setConnectionStatus("error");
                        break;
                }
            } catch (e) {
                console.error("[LiveSession] SSE Parse Exception", e);
            }
        };

        eventSource.onerror = () => setConnectionStatus("error");

        return () => {
            eventSource.close();
            setConnectionStatus("disconnected");
        };
    }, [setConnectionStatus, setLatestTick]);

    // 2. Select Symbol & Perform Flash Sync
    const selectSymbol = useCallback(async (symbol: string) => {
        if (activeSymbol === symbol) return;

        const oldSymbol = activeSymbol;
        setActiveSymbol(symbol);

        try {
            // Flash Sync: Load history for immediate context
            const histData = await LiveService.getHistoricalContext(symbol);
            if (histData.candles) setHistoricalData(histData.candles);

            // Synchronize WebSocket Subscriptions
            if (oldSymbol) await LiveService.updateSubscription(oldSymbol, 'unsubscribe');
            await LiveService.updateSubscription(symbol, 'subscribe');

        } catch (e: any) {
            console.error("[LiveSession] Flash Sync Failure:", e.message);
        }
    }, [activeSymbol, setActiveSymbol, setHistoricalData]);

    // Automatic cleanup on unmount
    useEffect(() => {
        return () => {
            if (activeSymbol) {
                LiveService.updateSubscription(activeSymbol, 'unsubscribe').catch(() => {});
            }
        };
    }, [activeSymbol]);

    return {
        activeSymbol,
        connectionStatus,
        latestTick,
        selectSymbol
    };
}

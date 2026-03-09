"use client";

import { useEffect, useCallback } from "react";
import { useLiveTradingStore, LiveTick } from "@/lib/historify/live-store";

export function useLiveSession() {
    const activeSymbol = useLiveTradingStore((state) => state.activeSymbol);
    const setActiveSymbol = useLiveTradingStore((state) => state.setActiveSymbol);
    const setConnectionStatus = useLiveTradingStore((state) => state.setConnectionStatus);
    const setLatestTick = useLiveTradingStore((state) => state.setLatestTick);
    const setHistoricalData = useLiveTradingStore((state) => state.setHistoricalData);
    const connectionStatus = useLiveTradingStore((state) => state.connectionStatus);
    const latestTick = useLiveTradingStore((state) => state.latestTick);

    // 1. Manage Server-Sent Events (SSE) Stream
    useEffect(() => {
        console.log("[LiveSession] Initializing SSE connection...");
        setConnectionStatus("connecting");
        const eventSource = new EventSource("/api/historify/live-stream");

        eventSource.onopen = () => {
            console.log("[LiveSession] SSE Connection opened");
            setConnectionStatus("connected");
        };

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                if (parsed.event === 'quote') {
                    const data = parsed.data;
                    const tick: LiveTick = {
                        time: data.ltt || Math.floor(Date.now() / 1000),
                        open: data.open,
                        high: data.high,
                        low: data.low,
                        close: data.close,
                        volume: data.volume,
                    };
                    setLatestTick(tick);
                } else if (parsed.event === 'info') {
                    console.log("[LiveSession] Server Info:", parsed.data);
                    setConnectionStatus("connected");
                }
            } catch (e) {
                console.error("[LiveSession] SSE Parse Error", e);
            }
        };

        eventSource.onerror = (e) => {
            console.error("[LiveSession] SSE Connection Error", e);
            setConnectionStatus("error");
        };

        return () => {
            console.log("[LiveSession] Closing SSE connection");
            eventSource.close();
            setConnectionStatus("disconnected");
        };
    }, [setConnectionStatus, setLatestTick]);

    // 2. Handle Symbol Subscription Changes
    const selectSymbol = useCallback(async (symbol: string) => {
        if (activeSymbol === symbol) return;

        const oldSymbol = activeSymbol;
        setActiveSymbol(symbol);

        // Fetch history for technical context
        try {
            const histRes = await fetch(`/api/historify/live-history?symbol=${encodeURIComponent(symbol)}`);
            const histData = await histRes.json();
            if (histData.candles) {
                setHistoricalData(histData.candles);
            }
        } catch (e) {
            console.error("[LiveSession] Failed to fetch historical context", e);
        }

        // Unsubscribe old symbol on server
        if (oldSymbol) {
            await fetch('/api/historify/live-feed', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'unsubscribe', symbol: oldSymbol })
            });
        }

        // Subscribe new symbol on server
        await fetch('/api/historify/live-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'subscribe', symbol })
        });
    }, [activeSymbol, setActiveSymbol, setHistoricalData]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (activeSymbol) {
                fetch('/api/historify/live-feed', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    keepalive: true,
                    body: JSON.stringify({ action: 'unsubscribe', symbol: activeSymbol })
                }).catch(console.error);
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

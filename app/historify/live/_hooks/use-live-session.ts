"use client";

import { useEffect, useCallback } from "react";
import { useLiveTradingStore, LiveTick } from "@/lib/historify/live-store";
import { LiveService } from "../_lib/live-service";

/**
 * useLiveSession
 * 
 * Orchestrates the lifecycle of a live trading session.
 * Handles SSE connection management and symbol synchronization.
 */
export function useLiveSession() {
    const activeSymbol = useLiveTradingStore((state) => state.activeSymbol);
    const setActiveSymbol = useLiveTradingStore((state) => state.setActiveSymbol);
    const setConnectionStatus = useLiveTradingStore((state) => state.setConnectionStatus);
    const setLatestTick = useLiveTradingStore((state) => state.setLatestTick);
    const setHistoricalData = useLiveTradingStore((state) => state.setHistoricalData);
    const connectionStatus = useLiveTradingStore((state) => state.connectionStatus);
    const latestTick = useLiveTradingStore((state) => state.latestTick);

    // 1. Manage EventSource (SSE) Lifecycle
    useEffect(() => {
        setConnectionStatus("connecting");
        const eventSource = new EventSource("/api/historify/live-stream");

        eventSource.onopen = () => setConnectionStatus("connected");

        eventSource.onmessage = (event) => {
            try {
                const parsed = JSON.parse(event.data);
                
                switch (parsed.event) {
                    case 'quote':
                        setLatestTick({
                            time: parsed.data.ltt || Math.floor(Date.now() / 1000),
                            open: parsed.data.open,
                            high: parsed.data.high,
                            low: parsed.data.low,
                            close: parsed.data.close,
                            volume: parsed.data.volume,
                        });
                        break;
                    
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

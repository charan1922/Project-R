import { create } from 'zustand';

export interface LiveTick {
    time: number; // Unix timestamp in seconds expected by Lightweight Charts
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
}

interface LiveTradingState {
    activeSymbol: string | null;
    connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
    latestTick: LiveTick | null;
    historicalData: LiveTick[];
    setActiveSymbol: (symbol: string) => void;
    setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
    setLatestTick: (tick: LiveTick) => void;
    setHistoricalData: (data: LiveTick[]) => void;
}

export const useLiveTradingStore = create<LiveTradingState>((set) => ({
    activeSymbol: null,
    connectionStatus: 'disconnected',
    latestTick: null,
    historicalData: [],

    // Changing active symbol resets the latest tick immediately so the UI clears
    setActiveSymbol: (symbol) => set({ activeSymbol: symbol, latestTick: null, historicalData: [] }),

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setLatestTick: (tick) => set({ latestTick: tick }),

    setHistoricalData: (data) => set({ historicalData: data }),
}));

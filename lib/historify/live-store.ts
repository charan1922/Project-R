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
    setActiveSymbol: (symbol: string) => void;
    setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'error') => void;
    setLatestTick: (tick: LiveTick) => void;
}

export const useLiveTradingStore = create<LiveTradingState>((set) => ({
    activeSymbol: null,
    connectionStatus: 'disconnected',
    latestTick: null,

    // Changing active symbol resets the latest tick immediately so the UI clears
    setActiveSymbol: (symbol) => set({ activeSymbol: symbol, latestTick: null }),

    setConnectionStatus: (status) => set({ connectionStatus: status }),

    setLatestTick: (tick) => set({ latestTick: tick }),
}));

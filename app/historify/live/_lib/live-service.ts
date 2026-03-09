/**
 * LiveService (Frontend)
 * 
 * Enterprise-grade service layer encapsulating all live-trading API interactions.
 * Implements centralized error handling and request normalization.
 */

export interface SymbolSubscriptionResponse {
    success: boolean;
    symbol: string;
    action: 'subscribe' | 'unsubscribe';
}

export class LiveService {
    /**
     * Fetch historical 1-minute context for technical seeding.
     */
    static async getHistoricalContext(symbol: string) {
        const res = await fetch(`/api/historify/live-history?symbol=${encodeURIComponent(symbol)}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || "Failed to fetch technical context");
        }
        return res.json();
    }

    /**
     * Update server-side WebSocket subscription registry.
     */
    static async updateSubscription(symbol: string, action: 'subscribe' | 'unsubscribe'): Promise<SymbolSubscriptionResponse> {
        const res = await fetch('/api/historify/live-feed', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action, symbol })
        });

        if (!res.ok) {
            throw new Error(`Failed to ${action} symbol: ${symbol}`);
        }

        return res.json();
    }
}

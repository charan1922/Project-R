import { MarketFeedSocket } from '../../dhanv2/src/websockets/MarketFeedSocket';
import { FeedInstrument, FeedRequestCode, TickerData, QuoteData } from '../../dhanv2/src/types';
import { resolveSymbol } from './master-contracts';

class LiveManager {
    private socket: MarketFeedSocket | null = null;
    private clients: Set<ReadableStreamDefaultController> = new Set();
    private activeSymbols: Map<string, FeedInstrument> = new Map();

    public connect() {
        if (this.socket) return;

        const clientId = process.env.DHAN_CLIENT_ID;
        const accessToken = process.env.DHAN_ACCESS_TOKEN;

        if (!clientId || !accessToken) {
            console.error("[LiveManager] Missing Dhan API credentials for WebSocket.");
            return;
        }

        this.socket = new MarketFeedSocket(clientId, accessToken);

        this.socket.on('connect', () => {
            console.log('[LiveManager] Connected to Dhan Market Feed WebSockets');
            const instruments = Array.from(this.activeSymbols.values());
            if (instruments.length > 0) {
                // Subscribe to Quote data for maximum fidelity (OHLCV)
                this.socket?.subscribe(instruments, FeedRequestCode.SUBSCRIBE_QUOTE);
            }
        });

        this.socket.on('quote', (data: QuoteData) => {
            this.broadcast('quote', data);
        });

        this.socket.on('ticker', (data: TickerData) => {
            this.broadcast('ticker', data);
        });

        this.socket.on('close', () => {
            console.log('[LiveManager] Connection closed. Reconnection handled exponentially by SDK.');
        });

        this.socket.on('error', (err) => {
            console.error('[LiveManager] WebSocket Error:', err.message);
        });

        this.socket.connect();
    }

    private broadcast(event: string, data: any) {
        const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
        const encoder = new TextEncoder();
        const encoded = encoder.encode(payload);

        this.clients.forEach(client => {
            try {
                client.enqueue(encoded);
            } catch (e) {
                this.clients.delete(client);
            }
        });
    }

    public addClient(controller: ReadableStreamDefaultController) {
        this.clients.add(controller);
        if (!this.socket) {
            this.connect();
        }
    }

    public removeClient(controller: ReadableStreamDefaultController) {
        this.clients.delete(controller);
        if (this.clients.size === 0 && this.socket) {
            // Unsubscribe all and close socket gracefully if no UI streams are active
            this.socket.close();
            this.socket = null;
            this.activeSymbols.clear();
        }
    }

    public async subscribeSymbol(symbol: string) {
        const resolved = await resolveSymbol(symbol, 'NSE'); // Defaulting to NSE equity
        if (!resolved) {
            console.error(`[LiveManager] Cannot resolve symbol: ${symbol}`);
            return;
        }

        const instrument: FeedInstrument = {
            exchangeSegment: resolved.segment as any,
            securityId: resolved.securityId,
        };

        this.activeSymbols.set(symbol, instrument);
        if (this.socket) {
            this.socket.subscribe([instrument], FeedRequestCode.SUBSCRIBE_QUOTE);
        }
    }

    public async unsubscribeSymbol(symbol: string) {
        const instrument = this.activeSymbols.get(symbol);
        if (instrument && this.socket) {
            this.socket.unsubscribe([instrument], FeedRequestCode.UNSUBSCRIBE_QUOTE);
        }
        this.activeSymbols.delete(symbol);
    }
}

// NextJS fast refresh preservation
const globalForLiveManager = global as unknown as { liveManager: LiveManager };
export const liveManager = globalForLiveManager.liveManager || new LiveManager();
if (process.env.NODE_ENV !== 'production') globalForLiveManager.liveManager = liveManager;

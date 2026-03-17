import { MarketFeedSocket } from '../../dhanv2/src/websockets/MarketFeedSocket';
import { FeedInstrument, FeedRequestCode, QuoteData, ExchangeSegment } from '../../dhanv2/src/types';
import { resolveSymbol } from './master-contracts';
import { env } from '@/lib/env';
import { getDhanAccessToken, hasDhanAuth } from '@/lib/dhan/auth';

const TAG = '[LiveManager]';

class LiveManager {
    private socket: MarketFeedSocket | null = null;
    private clients: Set<ReadableStreamDefaultController> = new Set();
    private activeSymbols: Map<string, FeedInstrument> = new Map();

    public async connect() {
        if (this.socket) return;
        if (!hasDhanAuth()) {
            console.error(`${TAG} connect failed: missing Dhan credentials`);
            return;
        }

        console.log(`${TAG} initializing Dhan WebSocket...`);
        const token = await getDhanAccessToken();
        this.socket = new MarketFeedSocket(env.DHAN_CLIENT_ID!, token);

        this.socket.on('connect', () => {
            console.log(`${TAG} WebSocket connected to Dhan`);
            const instruments = Array.from(this.activeSymbols.values());
            if (instruments.length > 0) {
                console.log(`${TAG} re-subscribing ${instruments.length} instruments`);
                this.socket?.subscribe(instruments, FeedRequestCode.SUBSCRIBE_QUOTE);
            }
        });

        this.socket.on('quote', (data: QuoteData) => {
            this.broadcast('quote', data);
        });

        this.socket.on('error', (err) => {
            console.error(`${TAG} WebSocket error:`, err.message);
        });

        this.socket.on('close', () => {
            console.log(`${TAG} WebSocket closed`);
            this.socket = null;
        });

        this.socket.connect();
    }

    private broadcast(event: string, data: any) {
        const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
        const encoded = new TextEncoder().encode(payload);
        const dead: ReadableStreamDefaultController[] = [];
        this.clients.forEach(client => {
            try { client.enqueue(encoded); } catch { dead.push(client); }
        });
        dead.forEach(c => this.clients.delete(c));
    }

    public async addClient(controller: ReadableStreamDefaultController) {
        this.clients.add(controller);
        console.log(`${TAG} client added (total: ${this.clients.size})`);
        if (!this.socket) await this.connect();
    }

    public removeClient(controller: ReadableStreamDefaultController) {
        this.clients.delete(controller);
        console.log(`${TAG} client removed (remaining: ${this.clients.size})`);
        if (this.clients.size === 0 && this.socket) {
            console.log(`${TAG} no clients, closing WebSocket`);
            this.socket.close();
            this.socket = null;
        }
    }

    public async subscribeSymbol(symbol: string) {
        const resolved = await resolveSymbol(symbol);
        if (!resolved) {
            console.warn(`${TAG} could not resolve symbol: ${symbol}`);
            return;
        }

        // Dhan WebSocket subscription expects string segment (e.g. "NSE_EQ"), not numeric code
        const segment = resolved.segment as ExchangeSegment;
        if (!Object.values(ExchangeSegment).includes(segment)) {
            console.warn(`${TAG} unknown segment: ${resolved.segment}`);
            return;
        }

        const instrument: FeedInstrument = { exchangeSegment: segment, securityId: resolved.securityId };
        this.activeSymbols.set(symbol, instrument);
        console.log(`${TAG} subscribing to ${symbol} (secId: ${resolved.securityId}, seg: ${segment})`);

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
        console.log(`${TAG} unsubscribed ${symbol}`);
    }
}

console.log(`${TAG} module loaded`);
const globalRef = global as any;
if (!globalRef.__liveManager) {
    globalRef.__liveManager = new LiveManager();
    console.log(`${TAG} new singleton created`);
}
export const liveManager: LiveManager = globalRef.__liveManager;

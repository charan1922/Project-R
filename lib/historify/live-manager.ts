import { MarketFeedSocket } from '../../dhanv2/src/websockets/MarketFeedSocket';
import { FeedInstrument, FeedRequestCode, TickerData, QuoteData, ExchangeSegmentCode } from '../../dhanv2/src/types';
import { resolveSymbol } from './master-contracts';
import path from 'path';
import fs from 'fs';

// Safer manual .env.local parsing to handle JWT tokens which often contain '=' padding
function loadEnvLocal() {
    try {
        const envLocalPath = path.resolve(process.cwd(), '.env.local');
        if (fs.existsSync(envLocalPath)) {
            const content = fs.readFileSync(envLocalPath, 'utf8');
            content.split('\n').forEach(line => {
                const index = line.indexOf('=');
                if (index !== -1) {
                    const key = line.substring(0, index).trim();
                    const value = line.substring(index + 1).trim().replace(/^["']|["']$/g, '');
                    if (key && value) {
                        process.env[key] = value;
                    }
                }
            });
            console.log(`[LiveManager] .env.local loaded. ClientID: ${process.env.DHAN_CLIENT_ID ? 'OK' : 'MISSING'}, Token: ${process.env.DHAN_ACCESS_TOKEN ? 'OK (' + process.env.DHAN_ACCESS_TOKEN.length + ' chars)' : 'MISSING'}`);
        } else {
            console.warn("[LiveManager] .env.local not found at " + envLocalPath);
        }
    } catch (e) {
        console.error("[LiveManager] Manual env load failed", e);
    }
}

if (process.env.NODE_ENV !== 'production') {
    loadEnvLocal();
}

class LiveManager {
    private socket: MarketFeedSocket | null = null;
    private clients: Set<ReadableStreamDefaultController> = new Set();
    private activeSymbols: Map<string, FeedInstrument> = new Map();

    public connect() {
        if (this.socket) return;

        const clientId = process.env.DHAN_CLIENT_ID;
        const accessToken = process.env.DHAN_ACCESS_TOKEN;

        if (!clientId || !accessToken) {
            console.error("[LiveManager] CRITICAL: Missing Dhan API credentials for WebSocket.");
            this.broadcast('error', { message: 'Missing credentials' });
            return;
        }

        console.log(`[LiveManager] Connecting to Dhan WebSocket (ClientID: ${clientId})...`);
        this.socket = new MarketFeedSocket(clientId, accessToken);

        this.socket.on('connect', () => {
            console.log('[LiveManager] Connected to Dhan Market Feed WebSockets');
            const instruments = Array.from(this.activeSymbols.values());
            if (instruments.length > 0) {
                console.log(`[LiveManager] Resubscribing to ${instruments.length} instruments`);
                this.socket?.subscribe(instruments, FeedRequestCode.SUBSCRIBE_QUOTE);
            }
        });

        this.socket.on('quote', (data: QuoteData) => {
            this.broadcast('quote', data);
        });

        this.socket.on('ticker', (data: TickerData) => {
            this.broadcast('ticker', data);
        });

        this.socket.on('error', (err) => {
            console.error('[LiveManager] WebSocket Error:', err.message);
            this.broadcast('error', { message: err.message });
        });

        this.socket.on('close', () => {
            console.log('[LiveManager] WebSocket connection closed');
            this.socket = null;
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
        console.log(`[LiveManager] Client added. Total active clients: ${this.clients.size}`);
        
        try {
            // 1. Send an immediate padding comment to force browser buffers to flush
            // Some browsers/proxies won't trigger 'onopen' until ~2KB of data is received
            const padding = `: ${' '.repeat(2048)}\n\n`;
            controller.enqueue(new TextEncoder().encode(padding));

            // 2. Send the explicit "connected" message
            const welcome = `data: ${JSON.stringify({ event: 'info', data: { status: 'connected' } })}\n\n`;
            controller.enqueue(new TextEncoder().encode(welcome));
            
            console.log("[LiveManager] Sent welcome and padding to new client");
        } catch (e) {
            console.error("[LiveManager] Failed to send initial chunks", e);
        }

        if (!this.socket) {
            this.connect();
        }
    }

    public removeClient(controller: ReadableStreamDefaultController) {
        this.clients.delete(controller);
        console.log(`[LiveManager] Client removed. Remaining: ${this.clients.size}`);
        if (this.clients.size === 0 && this.socket) {
            console.log("[LiveManager] No clients remaining. Closing Dhan socket.");
            this.socket.close();
            this.socket = null;
            this.activeSymbols.clear();
        }
    }

    public async subscribeSymbol(symbol: string) {
        const resolved = await resolveSymbol(symbol, 'NSE');
        if (!resolved) {
            console.error(`[LiveManager] Could not resolve symbol: ${symbol}`);
            return;
        }

        const segmentName = resolved.segment as keyof typeof ExchangeSegmentCode;
        const segmentCode = ExchangeSegmentCode[segmentName];
        if (segmentCode === undefined) {
            console.error(`[LiveManager] No numeric segment code for ${resolved.segment}`);
            return;
        }

        const instrument: FeedInstrument = {
            exchangeSegment: segmentCode as any,
            securityId: resolved.securityId,
        };

        console.log(`[LiveManager] Subscribing to ${symbol} (ID: ${resolved.securityId})`);
        this.activeSymbols.set(symbol, instrument);
        if (this.socket) {
            this.socket.subscribe([instrument], FeedRequestCode.SUBSCRIBE_QUOTE);
        }
    }

    public async unsubscribeSymbol(symbol: string) {
        const instrument = this.activeSymbols.get(symbol);
        if (instrument && this.socket) {
            console.log(`[LiveManager] Unsubscribing from ${symbol}`);
            this.socket.unsubscribe([instrument], FeedRequestCode.UNSUBSCRIBE_QUOTE);
        }
        this.activeSymbols.delete(symbol);
    }
}

const globalForLiveManager = global as unknown as { liveManager: LiveManager };
export const liveManager = globalForLiveManager.liveManager || new LiveManager();
if (process.env.NODE_ENV !== 'production') globalForLiveManager.liveManager = liveManager;

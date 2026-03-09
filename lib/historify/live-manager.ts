import { MarketFeedSocket } from '../../dhanv2/src/websockets/MarketFeedSocket';
import { FeedInstrument, FeedRequestCode, TickerData, QuoteData, ExchangeSegment } from '../../dhanv2/src/types';
import { resolveSymbol } from './master-contracts';
import path from 'path';
import fs from 'fs';

/**
 * Enterprise LiveManager (The Gateway)
 * 
 * A high-availability bridge between the Dhan Exchange and local SSE clients.
 * Implements: 
 *  - Subscription Registry (Single WS for all UI tabs)
 *  - Diagnostic Heartbeat
 *  - Automated Resource Cleanup
 */

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
                    if (key && value) process.env[key] = value;
                }
            });
        }
    } catch (e) {}
}

if (process.env.NODE_ENV !== 'production') loadEnvLocal();

interface SessionDiagnostics {
    packetsReceived: number;
    lastTickAt: number;
    activeClients: number;
    uptimeSeconds: number;
}

class LiveManager {
    private socket: MarketFeedSocket | null = null;
    private clients: Set<ReadableStreamDefaultController> = new Set();
    private activeSymbols: Map<string, FeedInstrument> = new Map();
    private diagnostics: SessionDiagnostics = {
        packetsReceived: 0,
        lastTickAt: 0,
        activeClients: 0,
        uptimeSeconds: 0
    };
    private systemInterval: ReturnType<typeof setInterval> | null = null;

    public connect() {
        if (this.socket) return;

        const clientId = process.env.DHAN_CLIENT_ID;
        const accessToken = process.env.DHAN_ACCESS_TOKEN;

        if (!clientId || !accessToken) {
            console.error("[LiveManager] ERROR: DHAN_CLIENT_ID or DHAN_ACCESS_TOKEN not set.");
            return;
        }

        console.log(`[LiveManager] Initializing Gateway Connection...`);
        this.socket = new MarketFeedSocket(clientId, accessToken);

        this.socket.on('connect', () => {
            console.log('[LiveManager] Dhan WebSocket Ready');
            const instruments = Array.from(this.activeSymbols.values());
            if (instruments.length > 0) {
                this.socket?.subscribe(instruments, FeedRequestCode.SUBSCRIBE_QUOTE);
            }
        });

        this.socket.on('quote', (data: QuoteData) => {
            this.diagnostics.packetsReceived++;
            this.diagnostics.lastTickAt = Date.now();
            this.broadcast('quote', data);
        });

        this.socket.on('error', (err) => {
            console.error('[LiveManager] Socket Error:', err.message);
            this.broadcast('error', { message: err.message });
        });

        this.socket.on('close', () => {
            console.log('[LiveManager] Socket Terminated');
            this.socket = null;
        });

        this.socket.connect();
    }

    private broadcast(event: string, data: any) {
        const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
        const encoded = new TextEncoder().encode(payload);
        this.clients.forEach(client => {
            try { client.enqueue(encoded); } catch { this.clients.delete(client); }
        });
    }

    public addClient(controller: ReadableStreamDefaultController) {
        this.clients.add(controller);
        this.diagnostics.activeClients = this.clients.size;
        
        // SSE Flush Buffer
        controller.enqueue(new TextEncoder().encode(`: ${' '.repeat(2048)}\n\n`));
        this.broadcast('info', { status: 'connected', diagnostics: this.diagnostics });

        if (this.clients.size === 1) this.startSystemLoop();
        if (!this.socket) this.connect();
    }

    public removeClient(controller: ReadableStreamDefaultController) {
        this.clients.delete(controller);
        this.diagnostics.activeClients = this.clients.size;
        if (this.clients.size === 0) {
            this.stopSystemLoop();
            if (this.socket) {
                this.socket.close();
                this.socket = null;
                this.activeSymbols.clear();
            }
        }
    }

    private startSystemLoop() {
        this.stopSystemLoop();
        this.systemInterval = setInterval(() => {
            this.diagnostics.uptimeSeconds += 10;
            this.broadcast('diagnostics', this.diagnostics);
        }, 10000);
    }

    private stopSystemLoop() {
        if (this.systemInterval) {
            clearInterval(this.systemInterval);
            this.systemInterval = null;
        }
    }

    public async subscribeSymbol(symbol: string) {
        const resolved = await resolveSymbol(symbol);
        if (!resolved) return;

        const instrument: FeedInstrument = {
            exchangeSegment: resolved.segment as ExchangeSegment,
            securityId: resolved.securityId,
        };

        this.activeSymbols.set(symbol, instrument);
        if (this.socket) this.socket.subscribe([instrument]);
    }

    public async unsubscribeSymbol(symbol: string) {
        const instrument = this.activeSymbols.get(symbol);
        if (instrument && this.socket) this.socket.unsubscribe([instrument]);
        this.activeSymbols.delete(symbol);
    }
}

const globalForLiveManager = global as unknown as { liveManager: LiveManager };
export const liveManager = globalForLiveManager.liveManager || new LiveManager();
if (process.env.NODE_ENV !== 'production') globalForLiveManager.liveManager = liveManager;

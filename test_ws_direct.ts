import { MarketFeedSocket } from './dhanv2/src/websockets/MarketFeedSocket';
import { FeedRequestCode, ExchangeSegment } from './dhanv2/src/types';
import path from 'path';
import fs from 'fs';

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

async function test() {
    loadEnvLocal();
    const clientId = process.env.DHAN_CLIENT_ID;
    const accessToken = process.env.DHAN_ACCESS_TOKEN;

    if (!clientId || !accessToken) {
        console.error("Missing credentials in .env.local");
        return;
    }

    console.log(`Testing WebSocket for Client: ${clientId}`);
    const socket = new MarketFeedSocket(clientId, accessToken);

    socket.on('connect', () => {
        console.log("✅ WebSocket Connected to Dhan");
        // Subscribe to RELIANCE (Security ID 2885 on NSE)
        socket.subscribe([{
            exchangeSegment: ExchangeSegment.NSE_EQ,
            securityId: '2885'
        }], FeedRequestCode.SUBSCRIBE_QUOTE);
        console.log("Sent subscription request for RELIANCE (2885)");
    });

    socket.on('quote', (data) => {
        console.log("🔥 RECEIVED QUOTE:", JSON.stringify(data));
    });

    socket.on('error', (err) => {
        console.error("❌ Socket Error:", err.message);
    });

    socket.on('close', () => {
        console.log("🔌 Socket Closed");
    });

    socket.connect();

    // Run for 30 seconds
    setTimeout(() => {
        console.log("Test finished after 30s");
        socket.close();
        process.exit(0);
    }, 30000);
}

test().catch(console.error);

import { DhanHQClient } from "../../dhanv2/src";
import { HistoricalDataRequest, IntradayDataRequest, ExchangeSegment } from "../../dhanv2/src/types";

// Helper to delay execution (Rate Limiting)
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export class HistorifyDhanClient {
    private client: DhanHQClient;
    private lastRequestTime: number = 0;
    private readonly RATE_LIMIT_MS = 250; // 4 requests per sec to stay safely under 5/sec

    constructor() {
        const clientId = process.env.DHAN_CLIENT_ID || "";
        const accessToken = process.env.DHAN_ACCESS_TOKEN || "";
        const env = "prod"; // User explicitly requested real one, not sandbox

        this.client = new DhanHQClient(
            clientId,
            accessToken,
            env
        );
    }

    private async throttle() {
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        if (timeSinceLast < this.RATE_LIMIT_MS) {
            await delay(this.RATE_LIMIT_MS - timeSinceLast);
        }
        this.lastRequestTime = Date.now();
    }

    /**
     * Fetch Intraday Data with automatic chunking for periods > 90 days.
     */
    async fetchIntradayChunked(req: IntradayDataRequest) {
        const results = {
            open: [] as number[],
            high: [] as number[],
            low: [] as number[],
            close: [] as number[],
            volume: [] as number[],
            timestamp: [] as number[],
        };

        let currentFrom = new Date(req.fromDate);
        const finalTo = new Date(req.toDate);

        while (currentFrom < finalTo) {
            // max 90 days per chunk
            let currentTo = new Date(currentFrom);
            currentTo.setDate(currentTo.getDate() + 89);
            if (currentTo > finalTo) currentTo = finalTo;

            await this.throttle();

            try {
                const chunkData = await this.client.historical.getIntradayHistorical({
                    ...req,
                    fromDate: currentFrom.toISOString().split('T')[0],
                    toDate: currentTo.toISOString().split('T')[0]
                });

                if (chunkData.timestamp && chunkData.timestamp.length > 0) {
                    results.open.push(...chunkData.open);
                    results.high.push(...chunkData.high);
                    results.low.push(...chunkData.low);
                    results.close.push(...chunkData.close);
                    results.volume.push(...chunkData.volume);
                    results.timestamp.push(...chunkData.timestamp);
                }
            } catch (err) {
                console.error(`Error fetching Dhan intraday chunk ${currentFrom.toISOString()} to ${currentTo.toISOString()}:`, err);
                throw err;
            }

            // Move to next chunk (next day)
            currentFrom = new Date(currentTo);
            currentFrom.setDate(currentFrom.getDate() + 1);
        }

        return results;
    }

    /**
     * Fetch Daily Data
     */
    async fetchDaily(req: HistoricalDataRequest) {
        await this.throttle();
        return this.client.historical.getDailyHistorical(req);
    }
}

export const dhanAPI = new HistorifyDhanClient();

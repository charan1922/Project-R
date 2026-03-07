require('dotenv').config({ path: '.env.local' });
const { dhanAPI } = require('./lib/historify/dhan-client.ts');
const { resolveSymbol } = require('./lib/historify/master-contracts.ts');
const { ExchangeSegment } = require('./dhanv2/src/types');

async function test() {
    const entry = await resolveSymbol('ABB', 'NSE');
    console.log("Security ID for ABB:", entry.securityId);
    
    const req = {
        securityId: entry.securityId,
        exchangeSegment: ExchangeSegment.NSE_EQ,
        instrument: "EQUITY",
        interval: 1, // 1min
        fromDate: "2026-03-05",
        toDate: "2026-03-05"
    };
    
    const data = await dhanAPI.fetchIntradayChunked(req);
    console.log("Raw Dhan API returned", data.timestamp.length, "rows for 2026-03-05");
    if (data.timestamp.length > 0) {
        console.log("First candle raw timestamp:", data.timestamp[0]);
        console.log("First candle time (UTC):", new Date(data.timestamp[0] * 1000).toISOString());
        console.log("First candle open:", data.open[0]);
    }
}
test().catch(console.error);

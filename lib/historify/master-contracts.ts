/**
 * Dhan Master Contract Lookup
 *
 * Fetches the NSE equity master contract from Dhan's public CSV endpoint
 * and resolves symbol names to their securityId for use in historical data calls.
 * Also resolves near-month stock futures for live F&O data.
 */

const MASTER_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // Refresh every 4 hours

export type SecurityEntry = {
    securityId: string;
    symbol: string;
    exchange: string;
    segment: string;    // Should match ExchangeSegment enum (e.g. NSE_EQ)
    name: string;
    instrument: string; // Should match InstrumentType enum (e.g. EQUITY)
};

/** Near-month futures entry for an underlying symbol */
export type FuturesEntry = SecurityEntry & {
    expiry: Date;
    underlying: string;
};

let cache: Map<string, SecurityEntry> | null = null;
let futuresCache: Map<string, FuturesEntry> | null = null;
let cacheTs = 0;

async function fetchMasterContracts(): Promise<Map<string, SecurityEntry>> {
    const now = Date.now();
    if (cache && (now - cacheTs) < CACHE_TTL_MS) return cache;

    console.log("[MasterContracts] Fetching fresh master contract CSV...");
    const resp = await fetch(MASTER_CSV_URL, { next: { revalidate: 14400 } } as any);
    if (!resp.ok) throw new Error(`Failed to fetch Dhan master contracts: ${resp.status}`);

    const text = await resp.text();
    const lines = text.split("\n");
    if (lines.length < 2) throw new Error("Empty master contract CSV");

    const header = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

    const col = (name: string) => header.findIndex(h => h === name);

    const idxExch = col("SEM_EXM_EXCH_ID");
    const idxSeg = col("SEM_SEGMENT");
    const idxId = col("SEM_SMST_SECURITY_ID");
    const idxSym = col("SEM_TRADING_SYMBOL");
    const idxName = col("SEM_INSTRUMENT_NAME");
    const idxInstType = col("SEM_INSTRUMENT_TYPE");
    const idxExpiry = col("SEM_EXPIRY_DATE");

    const map = new Map<string, SecurityEntry>();
    const fmap = new Map<string, FuturesEntry>();
    const today = new Date();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));

        const rawExch = cols[idxExch] || "";
        const rawSeg = cols[idxSeg] || "";
        const secId = cols[idxId] || "";
        const symbol = cols[idxSym] || "";
        const name = cols[idxName] || "";
        let inst = cols[idxInstType] || "";
        const expiryStr = cols[idxExpiry] || "";

        if (!secId || !symbol) continue;

        // Normalize Segment
        let segment = rawSeg;
        if (rawExch === "NSE" && rawSeg === "E") segment = "NSE_EQ";
        else if (rawExch === "BSE" && rawSeg === "E") segment = "BSE_EQ";
        else if (rawExch === "NSE" && rawSeg === "D") segment = "NSE_FNO";
        else if (rawExch === "BSE" && rawSeg === "D") segment = "BSE_FNO";

        if (segment.includes("_EQ")) {
            inst = "EQUITY";
        }

        const entry: SecurityEntry = {
            securityId: secId,
            symbol,
            exchange: rawExch,
            segment: segment.toUpperCase(),
            name,
            instrument: inst.toUpperCase()
        };

        map.set(`${rawExch}:${symbol}`, entry);
        if (!map.has(symbol) || rawExch === "NSE") {
            map.set(symbol, entry);
        }

        // Build futures index: NSE FUTSTK → underlying → near-month entry
        if (rawExch === "NSE" && rawSeg === "D" && inst.toUpperCase() === "FUTSTK" && expiryStr) {
            const dash = symbol.indexOf('-');
            if (dash <= 0) continue;
            const underlying = symbol.substring(0, dash);

            const expiry = new Date(expiryStr);
            if (isNaN(expiry.getTime())) continue;
            // Only consider contracts that haven't expired
            if (expiry < today) continue;

            const existing = fmap.get(underlying);
            if (!existing || expiry < existing.expiry) {
                // Keep the nearest expiry (near-month)
                fmap.set(underlying, { ...entry, expiry, underlying });
            }
        }
    }

    cache = map;
    futuresCache = fmap;
    cacheTs = now;
    console.log(`[MasterContracts] Loaded ${map.size} entries, ${fmap.size} near-month futures`);
    return map;
}

export async function resolveSymbol(symbol: string, exchange = "NSE"): Promise<SecurityEntry | null> {
    const map = await fetchMasterContracts();
    return map.get(`${exchange}:${symbol}`) || map.get(symbol) || null;
}

/**
 * Resolve near-month stock futures security entry for an underlying symbol.
 * e.g. "RELIANCE" → { securityId: "52023", symbol: "RELIANCE-Mar2026-FUT", ... }
 */
export async function resolveFuturesSecurity(underlying: string): Promise<FuturesEntry | null> {
    await fetchMasterContracts(); // Ensure cache is populated
    return futuresCache?.get(underlying) || null;
}

/**
 * Batch-resolve futures security IDs for multiple underlying symbols.
 * Returns Map<underlying, futuresSecurityId>.
 */
export async function batchResolveFutures(underlyings: string[]): Promise<Map<string, string>> {
    await fetchMasterContracts();
    const result = new Map<string, string>();
    if (!futuresCache) return result;
    for (const u of underlyings) {
        const entry = futuresCache.get(u);
        if (entry) result.set(u, entry.securityId);
    }
    return result;
}

export async function searchSymbols(query: string, exchange?: string): Promise<SecurityEntry[]> {
    const map = await fetchMasterContracts();
    const q = query.toLowerCase();
    const results: SecurityEntry[] = [];
    for (const [key, entry] of map) {
        if (key.includes(":")) continue;
        if (exchange && entry.exchange !== exchange) continue;
        if (entry.symbol.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q)) {
            results.push(entry);
        }
        if (results.length >= 20) break;
    }
    return results;
}

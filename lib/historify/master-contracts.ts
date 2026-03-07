/**
 * Dhan Master Contract Lookup
 *
 * Fetches the NSE equity master contract from Dhan's public CSV endpoint
 * and resolves symbol names to their securityId for use in historical data calls.
 *
 * Master CSV format (Dhan v2):
 *   SEM_EXM_EXCH_ID, SEM_SEGMENT, SEM_SMST_SECURITY_ID, SEM_TRADING_SYMBOL, ...
 */

const MASTER_CSV_URL = "https://images.dhan.co/api-data/api-scrip-master.csv";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // Refresh every 4 hours

type SecurityEntry = {
    securityId: string;
    symbol: string;
    exchange: string;   // NSE, BSE
    segment: string;   // NSE_EQ, NSE_FNO, etc.
    name: string;
    instrument: string;   // EQUITY, FUTIDX, OPTIDX, etc.
};

let cache: Map<string, SecurityEntry> | null = null;
let cacheTs = 0;

async function fetchMasterContracts(): Promise<Map<string, SecurityEntry>> {
    const now = Date.now();
    if (cache && (now - cacheTs) < CACHE_TTL_MS) return cache;

    const resp = await fetch(MASTER_CSV_URL, { next: { revalidate: 14400 } });
    if (!resp.ok) throw new Error(`Failed to fetch Dhan master contracts: ${resp.status}`);

    const text = await resp.text();
    const lines = text.split("\n");
    if (lines.length < 2) throw new Error("Empty master contract CSV");

    // Parse header — Dhan CSV may have slight variations; find columns by name
    const header = lines[0].split(",").map(h => h.trim().replace(/"/g, ""));

    const col = (name: string) => header.findIndex(h => h.includes(name));
    const idxExch = col("SEM_EXM_EXCH_ID");
    const idxSeg = col("SEM_SEGMENT");
    const idxId = col("SEM_SMST_SECURITY_ID");
    const idxSym = col("SEM_TRADING_SYMBOL");
    const idxName = col("SEM_INSTRUMENT_NAME");
    const idxInst = col("SEM_INSTRUMENT_NAME");

    const map = new Map<string, SecurityEntry>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
        const exchange = cols[idxExch] || "";
        const segment = cols[idxSeg] || "";
        const secId = cols[idxId] || "";
        const symbol = cols[idxSym] || "";
        const name = cols[idxName] || "";
        const inst = cols[idxInst] || "";

        if (!secId || !symbol) continue;

        // Index by "NSE:RELIANCE", "BSE:RELIANCE" etc. for unambiguous lookup
        const key = `${exchange}:${symbol}`;
        map.set(key, { securityId: secId, symbol, exchange, segment, name, instrument: inst });
        // Also index by symbol alone (first occurrence wins — NSE preferred if iterated first)
        if (!map.has(symbol)) {
            map.set(symbol, { securityId: secId, symbol, exchange, segment, name, instrument: inst });
        }
    }

    cache = map;
    cacheTs = now;
    return map;
}

/**
 * Resolve a trading symbol to its Dhan securityId.
 * @param symbol  e.g. "RELIANCE" or "NIFTY 50"
 * @param exchange e.g. "NSE" (default) or "BSE"
 * @returns SecurityEntry or null if not found
 */
export async function resolveSymbol(symbol: string, exchange = "NSE"): Promise<SecurityEntry | null> {
    const map = await fetchMasterContracts();
    // Try exchange-qualified first, then plain symbol
    return map.get(`${exchange}:${symbol}`) || map.get(symbol) || null;
}

/**
 * Search for symbols matching a partial name or symbol.
 */
export async function searchSymbols(query: string, exchange?: string): Promise<SecurityEntry[]> {
    const map = await fetchMasterContracts();
    const q = query.toLowerCase();
    const results: SecurityEntry[] = [];
    for (const [key, entry] of map) {
        if (key.includes(":")) continue; // skip duplicates — only iterate plain symbol keys
        if (exchange && entry.exchange !== exchange) continue;
        if (entry.symbol.toLowerCase().includes(q) || entry.name.toLowerCase().includes(q)) {
            results.push(entry);
        }
        if (results.length >= 20) break;
    }
    return results;
}

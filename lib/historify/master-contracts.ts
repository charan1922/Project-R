/**
 * Dhan Master Contract Lookup
 *
 * Fetches the NSE equity master contract from Dhan's public CSV endpoint
 * and resolves symbol names to their securityId for use in historical data calls.
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

let cache: Map<string, SecurityEntry> | null = null;
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
    console.log("[MasterContracts] Header:", header);
    
    // Log first data line to see structure
    if (lines.length > 1) {
        console.log("[MasterContracts] Sample Line:", lines[1]);
    }

    const col = (name: string) => header.findIndex(h => h === name);
    
    // Precise column mapping based on standard Dhan CSV format
    const idxExch = col("SEM_EXM_EXCH_ID");
    const idxSeg = col("SEM_SEGMENT");
    const idxId = col("SEM_SMST_SECURITY_ID");
    const idxSym = col("SEM_TRADING_SYMBOL");
    const idxSeries = col("SEM_SERIES");
    const idxName = col("SEM_INSTRUMENT_NAME");
    const idxInstType = col("SEM_INSTRUMENT_TYPE");

    console.log("[MasterContracts] Column Indexes:", { 
        idxExch, idxSeg, idxId, idxSym, idxSeries, idxName, idxInstType 
    });

    const map = new Map<string, SecurityEntry>();

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cols = line.split(",").map(c => c.trim().replace(/"/g, ""));
        
        const rawExch = cols[idxExch] || "";
        const rawSeg = cols[idxSeg] || "";
        const secId = cols[idxId] || "";
        const symbol = cols[idxSym] || "";
        const series = cols[idxSeries] || "";
        const name = cols[idxName] || "";
        let inst = cols[idxInstType] || "";

        if (!secId || !symbol) continue;

        // Normalize Segment: "NSE" + "E" -> "NSE_EQ"
        let segment = rawSeg;
        if (rawExch === "NSE" && rawSeg === "E") segment = "NSE_EQ";
        else if (rawExch === "BSE" && rawSeg === "E") segment = "BSE_EQ";
        else if (rawExch === "NSE" && rawSeg === "FO") segment = "NSE_FNO";
        else if (rawExch === "BSE" && rawSeg === "FO") segment = "BSE_FNO";
        
        // Normalize Instrument
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
    }

    cache = map;
    cacheTs = now;
    return map;
}

export async function resolveSymbol(symbol: string, exchange = "NSE"): Promise<SecurityEntry | null> {
    const map = await fetchMasterContracts();
    return map.get(`${exchange}:${symbol}`) || map.get(symbol) || null;
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

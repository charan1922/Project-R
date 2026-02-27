// ─── Raw Trade from JSON ──────────────────────────────────────────────────────
export interface RawTrade {
    month: string;
    year: string;
    trade_date: string;
    trade_time: string | null;
    stock_name: string | null;
    spot_price: number | null;
    instrument_type: string | null;
    strike_price: number | null;
    expiry_date: string | null;
    trade_type: string | null;
    total_pnl: number;
    trade_status: string;
    verified: boolean;
}

// ─── Computed Stats ───────────────────────────────────────────────────────────
export interface MonthStats {
    label: string;         // "January 2026"
    shortLabel: string;    // "Jan 2026"
    pnl: number;
    wins: number;
    losses: number;
    trades: RawTrade[];
}

export interface StockStats {
    name: string;
    pnl: number;
    count: number;
    wins: number;
    losses: number;
    winRate: number;
    maxPnl: number;
    avgPnl: number;
    /** Composite score 0–100 used for F&O stock filtering */
    compositeScore: number;
    /** Qualitative tier based on compositeScore */
    tier: "A+" | "A" | "B" | "C" | "D";
}

export interface TimeBucketStats {
    bucket: string;
    count: number;
    totalPnl: number;
}

export interface AnalyticsResult {
    // Trade slices
    actual: RawTrade[];
    noTrade: RawTrade[];
    wins: RawTrade[];
    losses: RawTrade[];
    sorted: RawTrade[];

    // Aggregates
    totalPnl: number;
    grossProfit: number;
    grossLoss: number;

    // Breakdowns
    months: MonthStats[];
    ceT: RawTrade[];
    peT: RawTrade[];
    stockList: StockStats[];

    // Risk
    maxWin: number;
    maxLoss: number;
    maxDD: number;

    // Chart data
    equity: { date: string; pnl: number }[];
    buckets: Record<string, number>;
    timeBuckets: Record<string, TimeBucketStats>;

    // Moneyness
    otm: number;
    itm: number;
    atm: number;
    unknownMoney: number;
}

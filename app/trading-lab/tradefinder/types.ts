// ─── Raw Trade from JSON ──────────────────────────────────────────────────────
export interface RawTrade {
  month: string;
  year: string;
  trade_date: string;
  sensibull_log_time: string | null;
  stock_name: string | null;
  spot_price: number | null;
  instrument_type: string | null;
  strike_price: number | null;
  expiry_date: string | null;
  trade_type: string | null;
  total_pnl: number;
  trade_status: string;
  verified: boolean;
  // Broker execution data
  entry_time: string | null;
  entry_price: number | null;
  exit_time: string | null;
  exit_price: number | null;
  // Position sizing
  lots: number | null;
  lot_size: number | null;
  quantity: number | null;
  capital_used: number | null;
  // Verification
  humanReview: boolean;
}

// ─── Computed Stats ───────────────────────────────────────────────────────────
export interface MonthStats {
  label: string; // "January 2026"
  shortLabel: string; // "Jan 2026"
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
  avgROI: number;
  totalCapital: number;
  /** Composite score 0–100 used for F&O stock filtering */
  compositeScore: number;
  /** Qualitative tier based on compositeScore */
  tier: 'A+' | 'A' | 'B' | 'C' | 'D';
}

export interface TimeBucketStats {
  bucket: string;
  count: number;
  totalPnl: number;
  verifiedCount: number;
}

// ─── Capital & ROI ───────────────────────────────────────────────────────────
export interface CapitalAnalysis {
  totalCapitalDeployed: number;
  avgCapitalPerTrade: number;
  overallROI: number;
  avgROIPerTrade: number;
  medianROIPerTrade: number;
  bestROI: { trade: RawTrade; roi: number } | null;
  worstROI: { trade: RawTrade; roi: number } | null;
  roiDistribution: Record<string, number>;
  capitalEfficiency: number;
}

// ─── Holding Time ─────────────────────────────────────────────────────────────
export interface DurationBucket {
  bucket: string;
  count: number;
  avgPnl: number;
  winRate: number;
}

export interface HoldingTimeAnalysis {
  tradesWithTime: number;
  totalTrades: number;
  avgHoldMinutes: number;
  medianHoldMinutes: number;
  shortestHold: { trade: RawTrade; minutes: number } | null;
  longestHold: { trade: RawTrade; minutes: number } | null;
  winnerAvgHold: number;
  loserAvgHold: number;
  durationBuckets: DurationBucket[];
}

// ─── Position Sizing ──────────────────────────────────────────────────────────
export interface LotGroup {
  lots: number;
  count: number;
  pnl: number;
  winRate: number;
  avgROI: number;
}

export interface PositionSizeAnalysis {
  lotDistribution: LotGroup[];
  avgCapitalWinners: number;
  avgCapitalLosers: number;
  scatterData: { capital: number; pnl: number; roi: number; stock: string }[];
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

  // New: Capital, Holding Time, Position Sizing
  capitalAnalysis: CapitalAnalysis;
  holdingTime: HoldingTimeAnalysis;
  positionSize: PositionSizeAnalysis;
  humanReviewedCount: number;
}

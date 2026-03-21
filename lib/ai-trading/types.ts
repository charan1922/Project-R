import type { MarketRegime } from '@/lib/r-factor/types';

/** Aggregated signal from R-Factor + ADX + live data for AI analysis */
export interface TradeSignal {
  symbol: string;
  // R-Factor
  rFactor: number;
  confidence: number;
  modelUsed: string;
  regime: MarketRegime;
  // ADX trend strength
  adx: number | null;
  plusDI: number | null;
  minusDI: number | null;
  // Key Z-scores
  spread: number;
  oiLevel: number;
  futTurnover: number;
  futVolume: number;
  optVolume: number;
  pcr: number;
  // Price context
  pctChange: number | null;
  sector: string | null;
  lotValue: number | null;
  lastPrice: number | null;
}

/** AI model's trading decision */
export interface TradeDecision {
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number; // 0-1
  symbol: string;
  rationale: string; // AI's explanation
  suggestedEntry: number | null;
  suggestedStopLoss: number | null;
  suggestedTarget: number | null;
  timeframe: 'scalp' | 'intraday' | 'swing';
  riskRewardRatio: number | null;
  modelUsed: string; // deepseek-chat, claude-sonnet, etc.
  timestamp: string;
}

/** Risk-checked decision ready for execution */
export interface ExecutableDecision extends TradeDecision {
  positionSize: number; // Number of lots
  capitalRequired: number; // ₹ amount
  riskAmount: number; // Max loss if SL hit
  approved: boolean; // Risk manager approved
  rejectReason?: string; // Why rejected
}

/** Order execution result from Dhan */
export interface ExecutionResult {
  orderId: string;
  correlationId: string;
  symbol: string;
  side: 'BUY' | 'SELL';
  quantity: number;
  orderType: 'LIMIT' | 'MARKET' | 'STOP_LOSS';
  price: number;
  status: 'placed' | 'filled' | 'rejected' | 'cancelled';
  filledPrice?: number;
  filledAt?: string;
  error?: string;
}

/** Risk management configuration */
export interface RiskConfig {
  maxCapitalPerTrade: number; // % of total capital (default: 2%)
  maxOpenPositions: number; // Max simultaneous positions (default: 5)
  maxDailyLoss: number; // % of capital to stop trading (default: 5%)
  maxSectorExposure: number; // % of capital per sector (default: 20%)
  defaultStopLossPct: number; // % below entry (default: 1.5%)
  defaultTargetPct: number; // % above entry (default: 3%)
  minRiskReward: number; // Minimum R:R ratio (default: 1.5)
  minRFactorThreshold: number; // Min R-Factor to consider (default: 2.0)
  minADXThreshold: number; // Min ADX to confirm strong trend (default: 28)
  paperTrading: boolean; // If true, log decisions but don't execute (default: true)
  // Entry time window (IST) — only enter trades during this window
  entryWindowStart: string; // HH:MM IST (default: "09:45")
  entryWindowEnd: string; // HH:MM IST (default: "11:00")
  // Exit strategy
  exitMode: 'ai' | 'fixed-profit' | 'fixed-time' | 'trailing-sl';
  fixedProfitTarget: number; // ₹ profit per trade to auto-exit (default: 5000)
  fixedExitTime: string; // HH:MM IST to force-exit all positions (default: "15:10")
  trailingSlPct: number; // Trailing stop-loss % (default: 1.0%)
}

export const DEFAULT_RISK_CONFIG: RiskConfig = {
  maxCapitalPerTrade: 2,
  maxOpenPositions: 5,
  maxDailyLoss: 5,
  maxSectorExposure: 20,
  defaultStopLossPct: 1.5,
  defaultTargetPct: 3,
  minRiskReward: 1.5,
  minRFactorThreshold: 2.0,
  minADXThreshold: 28,
  paperTrading: true, // SAFE DEFAULT: no real orders
  entryWindowStart: '09:45', // Only enter trades after 9:45 AM IST
  entryWindowEnd: '11:00', // No new entries after 11:00 AM IST
  exitMode: 'fixed-profit', // Default: exit when ₹5000 profit reached
  fixedProfitTarget: 5000, // ₹5,000 per trade
  fixedExitTime: '15:10', // Force exit 20 mins before market close
  trailingSlPct: 1.0, // 1% trailing stop
};

/** Trading session state */
export interface TradingSession {
  id: string;
  strategy: string;
  modelProvider: string;
  isActive: boolean;
  startedAt: string;
  decisions: TradeDecision[];
  executions: ExecutionResult[];
  pnl: number;
  tradesCount: number;
  winCount: number;
  riskConfig: RiskConfig;
}

/** Supported AI model providers via Vercel AI Gateway */
export type AIModelProvider =
  | 'deepseek/deepseek-chat'
  | 'deepseek/deepseek-reasoner'
  | 'anthropic/claude-sonnet-4-6'
  | 'openai/gpt-4o'
  | 'google/gemini-2.5-flash';

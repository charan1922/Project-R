export interface TradeDataStatus {
  symbol: string;
  date: string;
  optionType: string;
  strike: number;
  pnl: number;
  humanReview: boolean;
  entryTime?: string;
  entryPrice?: number;
  exitTime?: string;
  exitPrice?: number;
  hasEquity: boolean;
  hasFutures: boolean;
  hasOptions: boolean;
  status: 'ready' | 'partial' | 'missing';
}

export interface DataSummary {
  totalTrades: number;
  readyCount: number;
  partialCount: number;
  missingCount: number;
  dateRange: { from: string; to: string };
}

export interface DownloadEvent {
  type: 'progress' | 'step-done' | 'symbol-done' | 'complete' | 'error';
  symbol?: string;
  step?: 'equity' | 'futures' | 'options';
  rows?: number;
  symbolIndex?: number;
  totalSymbols?: number;
  totalRows?: number;
  errorCount?: number;
  errors?: string[];
  message?: string;
}

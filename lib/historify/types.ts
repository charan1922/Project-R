export type Stats = {
  watchlistCount: number;
  totalCandles: number;
  lastSyncTs: number | null;
  storageMb: number;
};

export type ActivityItem = {
  symbol: string;
  exchange: string;
  interval: string;
  action: string;
  rows_count: number;
  status: string;
  createdAt: number;
};

export type WatchlistItem = {
  symbol: string;
  exchange: string;
  status: string;
};

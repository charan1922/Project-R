"use client";

import { useState, useCallback, useEffect } from "react";
import { Stats, ActivityItem, WatchlistItem } from "@/lib/historify/types";

export function useHistorifyData() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, a, w] = await Promise.all([
        fetch("/api/historify/stats").then((r) => r.json()),
        fetch("/api/historify/activity").then((r) => r.json()),
        fetch("/api/historify/watchlist").then((r) => r.json()),
      ]);
      setStats(s);
      setActivity(Array.isArray(a) ? a : []);
      setWatchlist(Array.isArray(w) ? w : []);
    } catch (error) {
      console.error("Failed to load Historify data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    stats,
    activity,
    watchlist,
    loading,
    refresh: load,
  };
}

/**
 * Analytics Engine — pure computation, no React.
 * Takes raw trade array → returns fully-computed AnalyticsResult.
 */
import type { RawTrade, AnalyticsResult, MonthStats, StockStats } from "./types";
import {
    MONTH_ORDER, MONTH_SHORT,
    parseDate, timeBucket, classifyMoneyness,
} from "./utils";

export function computeAnalytics(trades: RawTrade[]): AnalyticsResult {
    // ── Partition ──────────────────────────────────────────────────────────────
    const actual = trades.filter(t => t.trade_status === "Trade Taken");
    const noTrade = trades.filter(t => t.trade_status === "No Trade Day");
    const wins = actual.filter(t => t.total_pnl > 0);
    const losses = actual.filter(t => t.total_pnl < 0);

    const totalPnl = actual.reduce((s, t) => s + t.total_pnl, 0);
    const grossProfit = wins.reduce((s, t) => s + t.total_pnl, 0);
    const grossLoss = Math.abs(losses.reduce((s, t) => s + t.total_pnl, 0));

    // ── Sort chronologically ───────────────────────────────────────────────────
    const sorted = [...actual].sort(
        (a, b) => parseDate(a.trade_date).getTime() - parseDate(b.trade_date).getTime()
    );

    // ── Monthly breakdown ──────────────────────────────────────────────────────
    const monthMap: Record<string, { pnl: number; wins: number; losses: number; trades: RawTrade[] }> = {};
    actual.forEach(t => {
        const key = `${t.year}-${String(MONTH_ORDER[t.month] ?? 0).padStart(2, "0")} ${t.month} ${t.year}`;
        if (!monthMap[key]) monthMap[key] = { pnl: 0, wins: 0, losses: 0, trades: [] };
        monthMap[key].pnl += t.total_pnl;
        monthMap[key].trades.push(t);
        if (t.total_pnl > 0) monthMap[key].wins++;
        else monthMap[key].losses++;
    });

    const months: MonthStats[] = Object.entries(monthMap)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, val]) => ({
            label: key.substring(8),
            shortLabel: MONTH_SHORT[key.split(" ")[1]] + " " + key.split(" ")[2],
            ...val,
        }));

    // ── Instrument split ───────────────────────────────────────────────────────
    const ceT = actual.filter(t => t.instrument_type === "CE");
    const peT = actual.filter(t => t.instrument_type === "PE");

    // ── Stock analysis ─────────────────────────────────────────────────────────
    const stockMap: Record<string, { pnl: number; count: number; wins: number; losses: number; maxPnl: number }> = {};
    actual.forEach(t => {
        const s = t.stock_name ?? "Unknown";
        if (!stockMap[s]) stockMap[s] = { pnl: 0, count: 0, wins: 0, losses: 0, maxPnl: -Infinity };
        stockMap[s].pnl += t.total_pnl;
        stockMap[s].count++;
        stockMap[s].maxPnl = Math.max(stockMap[s].maxPnl, t.total_pnl);
        if (t.total_pnl > 0) stockMap[s].wins++;
        else stockMap[s].losses++;
    });

    const stockList: StockStats[] = (() => {
        // Build raw stats first
        const raw = Object.entries(stockMap).map(([name, v]) => ({
            name, ...v,
            winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0,
            avgPnl: v.count > 0 ? v.pnl / v.count : 0,
        }));

        // Normalisation helpers
        const maxAvgPnl = Math.max(...raw.map(s => s.avgPnl), 1);
        const maxCount = Math.max(...raw.map(s => s.count), 1);

        return raw.map(s => {
            // Component scores (all 0–100)
            const winScore = s.winRate;                                       // 40%
            const pnlScore = Math.max(0, Math.min(100, (s.avgPnl / maxAvgPnl) * 100));  // 30%
            const confScore = Math.min(100, (s.count / maxCount) * 100);       // 20%
            const safeScore = s.wins > 0 ? Math.max(0, 100 - (s.losses / s.count) * 100) : 0; // 10%

            const compositeScore = Math.round(
                winScore * 0.40 +
                pnlScore * 0.30 +
                confScore * 0.20 +
                safeScore * 0.10
            );

            const tier: StockStats["tier"] =
                compositeScore >= 80 ? "A+" :
                    compositeScore >= 65 ? "A" :
                        compositeScore >= 50 ? "B" :
                            compositeScore >= 35 ? "C" : "D";

            return { ...s, compositeScore, tier };
        });
    })();

    // ── Streak analysis ────────────────────────────────────────────────────────
    let maxWin = 0, maxLoss = 0, curWin = 0, curLoss = 0;
    sorted.forEach(t => {
        if (t.total_pnl > 0) { curWin++; curLoss = 0; maxWin = Math.max(maxWin, curWin); }
        else { curLoss++; curWin = 0; maxLoss = Math.max(maxLoss, curLoss); }
    });

    // ── Max drawdown ───────────────────────────────────────────────────────────
    let peak = 0, maxDD = 0, runningPnl = 0;
    sorted.forEach(t => {
        runningPnl += t.total_pnl;
        if (runningPnl > peak) peak = runningPnl;
        else maxDD = Math.max(maxDD, peak - runningPnl);
    });

    // ── Equity curve ───────────────────────────────────────────────────────────
    let cum = 0;
    const equity = sorted.map(t => {
        cum += t.total_pnl;
        return { date: t.trade_date.split(" ").slice(0, 2).join(" "), pnl: cum };
    });

    // ── P&L distribution buckets ───────────────────────────────────────────────
    const buckets: Record<string, number> = {
        "<-5k": 0, "-5k to 0": 0, "0-10k": 0,
        "10k-20k": 0, "20k-30k": 0, "30k-50k": 0, ">50k": 0,
    };
    actual.forEach(t => {
        const p = t.total_pnl;
        if (p < -5000) buckets["<-5k"]++;
        else if (p < 0) buckets["-5k to 0"]++;
        else if (p < 10000) buckets["0-10k"]++;
        else if (p < 20000) buckets["10k-20k"]++;
        else if (p < 30000) buckets["20k-30k"]++;
        else if (p < 50000) buckets["30k-50k"]++;
        else buckets[">50k"]++;
    });

    // ── Time bucket analysis ───────────────────────────────────────────────────
    const timeBuckets: Record<string, { bucket: string; count: number; totalPnl: number }> = {};
    actual.forEach(t => {
        const b = timeBucket(t.trade_time);
        if (!timeBuckets[b]) timeBuckets[b] = { bucket: b, count: 0, totalPnl: 0 };
        timeBuckets[b].count++;
        timeBuckets[b].totalPnl += t.total_pnl;
    });

    // ── Moneyness ──────────────────────────────────────────────────────────────
    let otm = 0, itm = 0, atm = 0, unknownMoney = 0;
    actual.forEach(t => {
        const m = classifyMoneyness(t);
        if (m === "OTM") otm++;
        else if (m === "ITM") itm++;
        else if (m === "ATM") atm++;
        else unknownMoney++;
    });

    return {
        actual, noTrade, wins, losses, sorted,
        totalPnl, grossProfit, grossLoss,
        months, ceT, peT, stockList,
        maxWin, maxLoss, maxDD,
        equity, buckets, timeBuckets,
        otm, itm, atm, unknownMoney,
    };
}

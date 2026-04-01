/**
 * Analytics Engine — pure computation, no React.
 * Takes raw trade array → returns fully-computed AnalyticsResult.
 */
import type {
  AnalyticsResult,
  CapitalAnalysis,
  DurationBucket,
  HoldingTimeAnalysis,
  LotGroup,
  MonthStats,
  PositionSizeAnalysis,
  RawTrade,
  StockStats,
} from './types';
import { classifyMoneyness, holdingDurationMinutes, MONTH_ORDER, MONTH_SHORT, parseDate, timeBucketAny } from './utils';

function median(arr: number[]): number {
  if (arr.length === 0) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

export function computeAnalytics(trades: RawTrade[]): AnalyticsResult {
  // ── Partition ──────────────────────────────────────────────────────────────
  const actual = trades.filter((t) => t.trade_status === 'Trade Taken');
  const noTrade = trades.filter((t) => t.trade_status === 'No Trade Day');
  const wins = actual.filter((t) => t.total_pnl > 0);
  const losses = actual.filter((t) => t.total_pnl < 0);

  const totalPnl = actual.reduce((s, t) => s + t.total_pnl, 0);
  const grossProfit = wins.reduce((s, t) => s + t.total_pnl, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.total_pnl, 0));

  // ── Sort chronologically ───────────────────────────────────────────────────
  const sorted = [...actual].sort((a, b) => parseDate(a.trade_date).getTime() - parseDate(b.trade_date).getTime());

  // ── Monthly breakdown ──────────────────────────────────────────────────────
  const monthMap: Record<string, { pnl: number; wins: number; losses: number; trades: RawTrade[] }> = {};
  actual.forEach((t) => {
    const key = `${t.year}-${String(MONTH_ORDER[t.month] ?? 0).padStart(2, '0')} ${t.month} ${t.year}`;
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
      shortLabel: `${MONTH_SHORT[key.split(' ')[1]]} ${key.split(' ')[2]}`,
      ...val,
    }));

  // ── Instrument split ───────────────────────────────────────────────────────
  const ceT = actual.filter((t) => t.instrument_type === 'CE');
  const peT = actual.filter((t) => t.instrument_type === 'PE');

  // ── Stock analysis (enhanced with ROI + capital) ──────────────────────────
  const stockMap: Record<
    string,
    {
      pnl: number;
      count: number;
      wins: number;
      losses: number;
      maxPnl: number;
      totalCapital: number;
      roiSum: number;
    }
  > = {};
  actual.forEach((t) => {
    const s = t.stock_name ?? 'Unknown';
    if (!stockMap[s])
      stockMap[s] = { pnl: 0, count: 0, wins: 0, losses: 0, maxPnl: -Infinity, totalCapital: 0, roiSum: 0 };
    stockMap[s].pnl += t.total_pnl;
    stockMap[s].count++;
    stockMap[s].maxPnl = Math.max(stockMap[s].maxPnl, t.total_pnl);
    stockMap[s].totalCapital += t.capital_used ?? 0;
    if (t.capital_used && t.capital_used > 0) {
      stockMap[s].roiSum += (t.total_pnl / t.capital_used) * 100;
    }
    if (t.total_pnl > 0) stockMap[s].wins++;
    else stockMap[s].losses++;
  });

  const stockList: StockStats[] = (() => {
    const raw = Object.entries(stockMap).map(([name, v]) => ({
      name,
      ...v,
      winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0,
      avgPnl: v.count > 0 ? v.pnl / v.count : 0,
      avgROI: v.count > 0 ? v.roiSum / v.count : 0,
    }));

    const maxAvgPnl = Math.max(...raw.map((s) => s.avgPnl), 1);
    const maxCount = Math.max(...raw.map((s) => s.count), 1);

    return raw.map((s) => {
      const winScore = s.winRate;
      const pnlScore = Math.max(0, Math.min(100, (s.avgPnl / maxAvgPnl) * 100));
      const confScore = Math.min(100, (s.count / maxCount) * 100);
      const safeScore = s.wins > 0 ? Math.max(0, 100 - (s.losses / s.count) * 100) : 0;

      const compositeScore = Math.round(winScore * 0.4 + pnlScore * 0.3 + confScore * 0.2 + safeScore * 0.1);

      const tier: StockStats['tier'] =
        compositeScore >= 80
          ? 'A+'
          : compositeScore >= 65
            ? 'A'
            : compositeScore >= 50
              ? 'B'
              : compositeScore >= 35
                ? 'C'
                : 'D';

      return { ...s, compositeScore, tier };
    });
  })();

  // ── Streak analysis ────────────────────────────────────────────────────────
  let maxWin = 0,
    maxLoss = 0,
    curWin = 0,
    curLoss = 0;
  sorted.forEach((t) => {
    if (t.total_pnl > 0) {
      curWin++;
      curLoss = 0;
      maxWin = Math.max(maxWin, curWin);
    } else {
      curLoss++;
      curWin = 0;
      maxLoss = Math.max(maxLoss, curLoss);
    }
  });

  // ── Max drawdown ───────────────────────────────────────────────────────────
  let peak = 0,
    maxDD = 0,
    runningPnl = 0;
  sorted.forEach((t) => {
    runningPnl += t.total_pnl;
    if (runningPnl > peak) peak = runningPnl;
    else maxDD = Math.max(maxDD, peak - runningPnl);
  });

  // ── Equity curve ───────────────────────────────────────────────────────────
  let cum = 0;
  const equity = sorted.map((t) => {
    cum += t.total_pnl;
    return { date: t.trade_date.split(' ').slice(0, 2).join(' '), pnl: cum };
  });

  // ── P&L distribution buckets ───────────────────────────────────────────────
  const buckets: Record<string, number> = {
    '<-5k': 0,
    '-5k to 0': 0,
    '0-10k': 0,
    '10k-20k': 0,
    '20k-30k': 0,
    '30k-50k': 0,
    '>50k': 0,
  };
  actual.forEach((t) => {
    const p = t.total_pnl;
    if (p < -5000) buckets['<-5k']++;
    else if (p < 0) buckets['-5k to 0']++;
    else if (p < 10000) buckets['0-10k']++;
    else if (p < 20000) buckets['10k-20k']++;
    else if (p < 30000) buckets['20k-30k']++;
    else if (p < 50000) buckets['30k-50k']++;
    else buckets['>50k']++;
  });

  // ── Time bucket analysis (prefer entry_time over sensibull_log_time) ─────
  const timeBuckets: Record<string, { bucket: string; count: number; totalPnl: number; verifiedCount: number }> = {};
  actual.forEach((t) => {
    const timeSource = t.entry_time ?? t.sensibull_log_time;
    const b = timeBucketAny(timeSource);
    if (!timeBuckets[b]) timeBuckets[b] = { bucket: b, count: 0, totalPnl: 0, verifiedCount: 0 };
    timeBuckets[b].count++;
    timeBuckets[b].totalPnl += t.total_pnl;
    if (t.entry_time) timeBuckets[b].verifiedCount++;
  });

  // ── Moneyness ──────────────────────────────────────────────────────────────
  let otm = 0,
    itm = 0,
    atm = 0,
    unknownMoney = 0;
  actual.forEach((t) => {
    const m = classifyMoneyness(t);
    if (m === 'OTM') otm++;
    else if (m === 'ITM') itm++;
    else if (m === 'ATM') atm++;
    else unknownMoney++;
  });

  // ── Capital & ROI Analysis ───────────────────────────────────────────────
  const capitalAnalysis: CapitalAnalysis = (() => {
    const withCapital = actual.filter((t) => t.capital_used && t.capital_used > 0);
    const totalCapitalDeployed = withCapital.reduce((s, t) => s + (t.capital_used ?? 0), 0);
    const avgCapitalPerTrade = withCapital.length > 0 ? totalCapitalDeployed / withCapital.length : 0;

    const rois = withCapital.map((t) => ({
      trade: t,
      roi: (t.total_pnl / (t.capital_used as number)) * 100,
    }));
    const roiValues = rois.map((r) => r.roi);

    const overallROI = totalCapitalDeployed > 0 ? (totalPnl / totalCapitalDeployed) * 100 : 0;
    const avgROIPerTrade = roiValues.length > 0 ? roiValues.reduce((s, r) => s + r, 0) / roiValues.length : 0;
    const medianROIPerTrade = median(roiValues);

    const sortedByROI = [...rois].sort((a, b) => b.roi - a.roi);
    const bestROI = sortedByROI[0] ?? null;
    const worstROI = sortedByROI.length > 0 ? sortedByROI[sortedByROI.length - 1] : null;

    const roiDistribution: Record<string, number> = {
      '<-20%': 0,
      '-20% to 0': 0,
      '0-50%': 0,
      '50-100%': 0,
      '100-200%': 0,
      '>200%': 0,
    };
    roiValues.forEach((r) => {
      if (r < -20) roiDistribution['<-20%']++;
      else if (r < 0) roiDistribution['-20% to 0']++;
      else if (r < 50) roiDistribution['0-50%']++;
      else if (r < 100) roiDistribution['50-100%']++;
      else if (r < 200) roiDistribution['100-200%']++;
      else roiDistribution['>200%']++;
    });

    const capitalEfficiency = avgCapitalPerTrade > 0 ? totalPnl / avgCapitalPerTrade : 0;

    return {
      totalCapitalDeployed,
      avgCapitalPerTrade,
      overallROI,
      avgROIPerTrade,
      medianROIPerTrade,
      bestROI,
      worstROI,
      roiDistribution,
      capitalEfficiency,
    };
  })();

  // ── Holding Time Analysis ─────────────────────────────────────────────────
  const holdingTime: HoldingTimeAnalysis = (() => {
    const timed = actual
      .filter((t) => t.entry_time && t.exit_time)
      .map((t) => ({
        trade: t,
        minutes: holdingDurationMinutes(t.entry_time as string, t.exit_time as string),
      }))
      .filter((t): t is { trade: RawTrade; minutes: number } => t.minutes !== null && t.minutes > 0);

    const durations = timed.map((t) => t.minutes);
    const avgHoldMinutes = durations.length > 0 ? durations.reduce((s, d) => s + d, 0) / durations.length : 0;
    const medianHoldMinutes = median(durations);

    const winnerDurations = timed.filter((t) => t.trade.total_pnl > 0).map((t) => t.minutes);
    const loserDurations = timed.filter((t) => t.trade.total_pnl <= 0).map((t) => t.minutes);

    const winnerAvgHold =
      winnerDurations.length > 0 ? winnerDurations.reduce((s, d) => s + d, 0) / winnerDurations.length : 0;
    const loserAvgHold =
      loserDurations.length > 0 ? loserDurations.reduce((s, d) => s + d, 0) / loserDurations.length : 0;

    const sortedByDuration = [...timed].sort((a, b) => a.minutes - b.minutes);
    const shortestHold = sortedByDuration[0] ?? null;
    const longestHold = sortedByDuration.length > 0 ? sortedByDuration[sortedByDuration.length - 1] : null;

    // Duration buckets
    const bucketDefs: [string, number, number][] = [
      ['<30m', 0, 30],
      ['30m-1h', 30, 60],
      ['1h-2h', 60, 120],
      ['2h-3h', 120, 180],
      ['>3h', 180, Infinity],
    ];
    const durationBuckets: DurationBucket[] = bucketDefs.map(([bucket, lo, hi]) => {
      const inBucket = timed.filter((t) => t.minutes >= lo && t.minutes < hi);
      const bucketWins = inBucket.filter((t) => t.trade.total_pnl > 0).length;
      const bucketPnl = inBucket.reduce((s, t) => s + t.trade.total_pnl, 0);
      return {
        bucket,
        count: inBucket.length,
        avgPnl: inBucket.length > 0 ? bucketPnl / inBucket.length : 0,
        winRate: inBucket.length > 0 ? (bucketWins / inBucket.length) * 100 : 0,
      };
    });

    return {
      tradesWithTime: timed.length,
      totalTrades: actual.length,
      avgHoldMinutes,
      medianHoldMinutes,
      shortestHold,
      longestHold,
      winnerAvgHold,
      loserAvgHold,
      durationBuckets,
    };
  })();

  // ── Position Size Analysis ────────────────────────────────────────────────
  const positionSize: PositionSizeAnalysis = (() => {
    const withLots = actual.filter((t) => t.lots && t.lots > 0);

    // Group by lot count
    const lotMap: Record<number, { count: number; pnl: number; wins: number; roiSum: number }> = {};
    withLots.forEach((t) => {
      const l = t.lots as number;
      if (!lotMap[l]) lotMap[l] = { count: 0, pnl: 0, wins: 0, roiSum: 0 };
      lotMap[l].count++;
      lotMap[l].pnl += t.total_pnl;
      if (t.total_pnl > 0) lotMap[l].wins++;
      if (t.capital_used && t.capital_used > 0) {
        lotMap[l].roiSum += (t.total_pnl / t.capital_used) * 100;
      }
    });

    const lotDistribution: LotGroup[] = Object.entries(lotMap)
      .map(([lots, v]) => ({
        lots: Number(lots),
        count: v.count,
        pnl: v.pnl,
        winRate: v.count > 0 ? (v.wins / v.count) * 100 : 0,
        avgROI: v.count > 0 ? v.roiSum / v.count : 0,
      }))
      .sort((a, b) => a.lots - b.lots);

    // Capital winners vs losers
    const winnersWithCap = wins.filter((t) => t.capital_used && t.capital_used > 0);
    const losersWithCap = losses.filter((t) => t.capital_used && t.capital_used > 0);
    const avgCapitalWinners =
      winnersWithCap.length > 0
        ? winnersWithCap.reduce((s, t) => s + (t.capital_used as number), 0) / winnersWithCap.length
        : 0;
    const avgCapitalLosers =
      losersWithCap.length > 0
        ? losersWithCap.reduce((s, t) => s + (t.capital_used as number), 0) / losersWithCap.length
        : 0;

    // Scatter data
    const scatterData = actual
      .filter((t) => t.capital_used && t.capital_used > 0)
      .map((t) => ({
        capital: t.capital_used as number,
        pnl: t.total_pnl,
        roi: (t.total_pnl / (t.capital_used as number)) * 100,
        stock: t.stock_name ?? 'Unknown',
      }));

    return { lotDistribution, avgCapitalWinners, avgCapitalLosers, scatterData };
  })();

  // ── Human review count ────────────────────────────────────────────────────
  const humanReviewedCount = actual.filter((t) => t.humanReview).length;

  return {
    actual,
    noTrade,
    wins,
    losses,
    sorted,
    totalPnl,
    grossProfit,
    grossLoss,
    months,
    ceT,
    peT,
    stockList,
    maxWin,
    maxLoss,
    maxDD,
    equity,
    buckets,
    timeBuckets,
    otm,
    itm,
    atm,
    unknownMoney,
    capitalAnalysis,
    holdingTime,
    positionSize,
    humanReviewedCount,
  };
}

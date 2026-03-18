/**
 * Sector Activity Score — average spread Z-score across stocks in each sector.
 *
 * Spread ratio = (eq_high - eq_low) / eq_close, Z-scored against 20d history.
 * A sector score of 2.48X means the sector's average spread is 2.48σ above its
 * 20-day mean — i.e., institutional activity in that sector is 2.48x the norm.
 *
 * We use spread Z-score (coeff 0.625 — largest in the OLS model) because it's
 * the single strongest predictor of R-Factor and directly measures "activity
 * relative to normal" — a natural "X times" multiplier. Using composite R-Factor
 * would compress sector differences due to the constant intercept (1.11).
 */

export interface SectorStat {
  name: string;
  activity: number; // Average spread Z-score (the "X" multiplier)
  avgR: number; // Average composite R-Factor
  count: number;
}

export function computeSectorStats(
  stocks: { sector?: string; compositeRFactor: number; zScores: { spread: number } }[],
): SectorStat[] {
  const map = new Map<string, { spreadSum: number; rSum: number; count: number }>();

  for (const s of stocks) {
    if (!s.sector) continue;
    const entry = map.get(s.sector) || { spreadSum: 0, rSum: 0, count: 0 };
    entry.spreadSum += Math.max(0, s.zScores.spread); // Floor at 0 — negative spread = below-average activity
    entry.rSum += s.compositeRFactor;
    entry.count++;
    map.set(s.sector, entry);
  }

  return Array.from(map.entries())
    .map(([name, { spreadSum, rSum, count }]) => ({
      name,
      activity: spreadSum / count,
      avgR: rSum / count,
      count,
    }))
    .sort((a, b) => b.activity - a.activity);
}

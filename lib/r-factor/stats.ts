import { mean, std } from 'mathjs';

/**
 * Calculates rolling statistics (mean, stdDev) for a numeric series
 */
export function calculateRollingStats(series: number[]): { mean: number; stdDev: number } {
  if (series.length === 0) {
    return { mean: 0, stdDev: 0 };
  }

  const m = mean(series) as unknown as number;
  const s = std(series) as unknown as number;

  return { mean: m, stdDev: s };
}

/**
 * Calculates the Z-score for a value given a series
 */
export function calculateZScore(value: number, series: number[]): number {
  const { mean: m, stdDev: s } = calculateRollingStats(series);
  
  if (s === 0) {
    return value === m ? 0 : 0; // Avoid division by zero
  }

  return (value - m) / s;
}

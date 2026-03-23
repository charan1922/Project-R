/**
 * R-Factor Comparison Functions
 *
 * Compares our R-Factor rankings against TradeFinder's ground truth.
 * Used on the Intraday Boost page when TF snapshot data is available.
 */

interface RankPair {
  symbol: string;
  ourR: number;
  tfR: number;
}

/** Spearman rank correlation coefficient (-1 to +1) */
export function computeSpearmanCorrelation(pairs: RankPair[]): number {
  if (pairs.length < 3) return 0;
  const n = pairs.length;

  const ourRanked = rankValues(pairs.map((p) => p.ourR));
  const tfRanked = rankValues(pairs.map((p) => p.tfR));

  let d2sum = 0;
  for (let i = 0; i < n; i++) {
    const d = ourRanked[i] - tfRanked[i];
    d2sum += d * d;
  }

  return 1 - (6 * d2sum) / (n * (n * n - 1));
}

/** Count of symbols in both our top-N and TF top-N */
export function computeTopNOverlap(pairs: RankPair[], n: number): number {
  const ourTop = [...pairs]
    .sort((a, b) => b.ourR - a.ourR)
    .slice(0, n)
    .map((p) => p.symbol);
  const tfTop = [...pairs]
    .sort((a, b) => b.tfR - a.tfR)
    .slice(0, n)
    .map((p) => p.symbol);
  const tfSet = new Set(tfTop);
  return ourTop.filter((s) => tfSet.has(s)).length;
}

/** Root Mean Square Error between our R and TF R */
export function computeRMSE(pairs: RankPair[]): number {
  if (pairs.length === 0) return 0;
  const sumSq = pairs.reduce((s, p) => s + (p.ourR - p.tfR) ** 2, 0);
  return Math.sqrt(sumSq / pairs.length);
}

/** Mean bias: positive = we score higher on average */
export function computeMeanBias(pairs: RankPair[]): number {
  if (pairs.length === 0) return 0;
  return pairs.reduce((s, p) => s + (p.ourR - p.tfR), 0) / pairs.length;
}

/** Assign ranks to an array of values (1 = highest, handles ties with average rank) */
function rankValues(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ v, i }));
  indexed.sort((a, b) => b.v - a.v); // descending

  const ranks = new Array<number>(values.length);
  let i = 0;
  while (i < indexed.length) {
    let j = i;
    // Find group of tied values
    while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
    // Average rank for tied values
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].i] = avgRank;
    }
    i = j;
  }
  return ranks;
}

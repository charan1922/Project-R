"""
Validate V3 R-Factor engine (7-factor hybrid model) against TradeFinder's
80-stock ground truth from March 13, 2026.

V3 changes from V2:
  - Spread as RATIO (today/20d avg) instead of Z-score
  - PCR (put-call ratio) added as 7th factor
  - Weights from 80-stock OLS regression
"""

import json
import os
import csv as csv_module
import io
import statistics
import math

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')

# V3 weights (validated against 80 stocks)
WEIGHTS = {
    'spread': 0.30,
    'fut_turnover': 0.20,
    'pcr': 0.15,
    'oi_change': 0.12,
    'eq_trade_size': 0.10,
    'fut_volume': 0.08,
    'opt_volume': 0.05,
}

FACTORS_Z = ['fut_turnover', 'fut_volume', 'opt_volume', 'eq_trade_size', 'oi_change']
FACTORS_RATIO = ['spread', 'pcr']


def parse_fo(filepath):
    """Parse F&O bhavcopy. Returns {symbol: {fut_vol, fut_turn, fut_oi, fut_oi_chg, opt_vol, ce_vol, pe_vol}}"""
    with open(filepath) as fh:
        reader = csv_module.DictReader(fh)
        futures = {}
        options = {}

        for row in reader:
            sym = row.get('TckrSymb', '').strip()
            inst = row.get('FinInstrmTp', '').strip()

            if inst == 'STF':
                if sym not in futures:
                    futures[sym] = row  # First = nearest expiry
            elif inst == 'STO':
                if sym not in options:
                    options[sym] = {'vol': 0, 'oi': 0, 'turn': 0, 'ce_vol': 0, 'pe_vol': 0}
                vol = float(row.get('TtlTradgVol', 0) or 0)
                options[sym]['vol'] += vol
                options[sym]['oi'] += float(row.get('OpnIntrst', 0) or 0)
                options[sym]['turn'] += float(row.get('TtlTrfVal', 0) or 0)
                opt_type = row.get('OptnTp', '').strip()
                if opt_type == 'CE':
                    options[sym]['ce_vol'] += vol
                elif opt_type == 'PE':
                    options[sym]['pe_vol'] += vol

        result = {}
        for sym in futures:
            r = futures[sym]
            opt = options.get(sym, {'vol': 0, 'oi': 0, 'turn': 0, 'ce_vol': 0, 'pe_vol': 0})
            result[sym] = {
                'fut_vol': float(r.get('TtlTradgVol', 0) or 0),
                'fut_turn': float(r.get('TtlTrfVal', 0) or 0),
                'fut_oi': float(r.get('OpnIntrst', 0) or 0),
                'fut_oi_chg': float(r.get('ChngInOpnIntrst', 0) or 0),
                'opt_vol': opt['vol'],
                'ce_vol': opt['ce_vol'],
                'pe_vol': opt['pe_vol'],
            }
        return result


def parse_cm(filepath):
    """Parse equity bhavcopy. Returns {symbol: {eq_vol, eq_turn, eq_high, eq_low, eq_close}}"""
    with open(filepath) as fh:
        reader = csv_module.DictReader(fh)
        result = {}
        for row in reader:
            sym = row.get('TckrSymb', '').strip()
            if row.get('SctySrs', '').strip() != 'EQ':
                continue
            result[sym] = {
                'eq_vol': float(row.get('TtlTradgVol', 0) or 0),
                'eq_turn': float(row.get('TtlTrfVal', 0) or 0),
                'eq_high': float(row.get('HghPric', 0) or 0),
                'eq_low': float(row.get('LwPric', 0) or 0),
                'eq_close': float(row.get('ClsPric', 0) or 0),
            }
        return result


def z_score(value, series):
    if len(series) < 2:
        return 0
    m = statistics.mean(series)
    s = statistics.stdev(series)
    if s == 0:
        return 0
    return (value - m) / s


def pearson_corr(x, y):
    n = len(x)
    if n < 3:
        return 0
    mx, my = statistics.mean(x), statistics.mean(y)
    sx, sy = statistics.stdev(x), statistics.stdev(y)
    if sx == 0 or sy == 0:
        return 0
    return sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / ((n - 1) * sx * sy)


def spearman_corr(x, y):
    def rank(data):
        sorted_data = sorted(enumerate(data), key=lambda t: t[1])
        ranks = [0] * len(data)
        for rank_val, (orig_idx, _) in enumerate(sorted_data):
            ranks[orig_idx] = rank_val + 1
        return ranks
    return pearson_corr(rank(x), rank(y))


def main():
    # Load ground truth
    with open(os.path.join(os.path.dirname(__file__), 'march-13-2026.json')) as f:
        data = json.load(f)

    intraday_boost = data['payload']['data']['intraday_boost']
    ground_truth = {}
    for item in intraday_boost:
        ground_truth[item['Symbol']] = item['param_3']

    print(f"Ground truth: {len(ground_truth)} stocks")
    print(f"R Factor range: {min(ground_truth.values()):.3f} to {max(ground_truth.values()):.3f}")
    print()

    # Load all bhavcopy days
    fo_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('fo_')])
    cm_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('cm_')])

    print(f"Loading {len(fo_files)} F&O days + {len(cm_files)} equity days...")
    all_fo = [parse_fo(os.path.join(CACHE_DIR, f)) for f in fo_files]
    all_cm = [parse_cm(os.path.join(CACHE_DIR, f)) for f in cm_files]
    n_days = min(len(all_fo), len(all_cm))
    print(f"Using {n_days} matched trading days\n")

    # Compute V3 scores for each ground truth stock
    results = []
    missing = []

    for symbol in sorted(ground_truth.keys()):
        # Build time series for this stock
        factor_series = []

        for day_idx in range(n_days):
            fo = all_fo[day_idx].get(symbol, {})
            cm = all_cm[day_idx].get(symbol, {})

            if not fo and not cm:
                continue

            # Raw factor values (before Z-scoring)
            fut_turnover = fo.get('fut_turn', 0)
            fut_volume = fo.get('fut_vol', 0)
            opt_volume = fo.get('opt_vol', 0)
            eq_vol = cm.get('eq_vol', 0)
            eq_turn = cm.get('eq_turn', 0)
            eq_high = cm.get('eq_high', 0)
            eq_low = cm.get('eq_low', 0)
            eq_close = cm.get('eq_close', 0)
            fut_oi_chg = fo.get('fut_oi_chg', 0)
            ce_vol = fo.get('ce_vol', 0)
            pe_vol = fo.get('pe_vol', 0)

            eq_trade_size = eq_turn / eq_vol if eq_vol > 0 else 0
            oi_change = abs(fut_oi_chg)
            spread_raw = (eq_high - eq_low) / eq_close if eq_close > 0 else 0
            pcr = pe_vol / ce_vol if ce_vol > 0 else 0

            factor_series.append({
                'fut_turnover': fut_turnover,
                'fut_volume': fut_volume,
                'opt_volume': opt_volume,
                'eq_trade_size': eq_trade_size,
                'oi_change': oi_change,
                'spread_raw': spread_raw,
                'pcr': pcr,
            })

        if len(factor_series) < 15:
            missing.append(symbol)
            continue

        current = factor_series[-1]
        historical = factor_series[:-1]

        # --- V3 HYBRID SCORING ---

        # Z-scores for volume/OI factors
        scores = {}
        for f in FACTORS_Z:
            series = [h[f] for h in historical]
            scores[f] = z_score(current[f], series)

        # Spread as RATIO (today / 20d average)
        lookback = historical[-20:] if len(historical) >= 20 else historical
        avg_spread = statistics.mean([h['spread_raw'] for h in lookback]) if lookback else 0
        scores['spread'] = current['spread_raw'] / avg_spread if avg_spread > 0 else 0

        # PCR as raw ratio
        scores['pcr'] = current['pcr']

        # Weighted composite
        composite = sum(scores[f] * WEIGHTS[f] for f in WEIGHTS)

        results.append({
            'symbol': symbol,
            'actual_r': ground_truth[symbol],
            'our_composite': composite,
            'scores': scores,
        })

    print(f"Computed V3 scores for {len(results)} stocks, {len(missing)} missing")
    if missing:
        print(f"Missing: {', '.join(missing)}")
    print()

    # Compute correlations
    actual = [r['actual_r'] for r in results]
    ours = [r['our_composite'] for r in results]

    p_corr = pearson_corr(actual, ours)
    s_corr = spearman_corr(actual, ours)

    print("=" * 70)
    print("  V3 ENGINE VALIDATION (7-factor hybrid: ratio + Z-score)")
    print(f"  Stocks: {len(results)}")
    print(f"  Pearson correlation:  {p_corr:.4f}")
    print(f"  Spearman correlation: {s_corr:.4f}")
    print("=" * 70)
    print()

    # Per-factor correlations
    print("Per-factor correlations with TradeFinder R:")
    print(f"{'Factor':<20} {'Pearson':>10} {'Spearman':>10} {'Weight':>8} {'Type':>8}")
    print("-" * 60)
    for f in WEIGHTS:
        factor_vals = [r['scores'][f] for r in results]
        fp = pearson_corr(actual, factor_vals)
        fs = spearman_corr(actual, factor_vals)
        ftype = 'ratio' if f in FACTORS_RATIO else 'z-score'
        print(f"  {f:<18} {fp:>10.4f} {fs:>10.4f} {WEIGHTS[f]:>8.0%} {ftype:>8}")
    print()

    # Show top/bottom comparison
    results.sort(key=lambda r: r['actual_r'], reverse=True)
    print(f"{'Rank':<6} {'Symbol':<15} {'TF R Factor':>12} {'V3 Score':>12} {'Match?':>8}")
    print("-" * 55)
    for i, r in enumerate(results[:15]):
        match = "~" if abs(r['our_composite'] - r['actual_r']) < 0.5 else ""
        print(f"  {i+1:<4} {r['symbol']:<15} {r['actual_r']:>12.3f} {r['our_composite']:>12.3f} {match:>8}")
    print("  ...")
    for i, r in enumerate(results[-10:]):
        rank = len(results) - 10 + i + 1
        match = "~" if abs(r['our_composite'] - r['actual_r']) < 0.5 else ""
        print(f"  {rank:<4} {r['symbol']:<15} {r['actual_r']:>12.3f} {r['our_composite']:>12.3f} {match:>8}")

    # Ranking accuracy
    print()
    our_ranked = sorted(results, key=lambda r: r['our_composite'], reverse=True)
    our_top20 = set(r['symbol'] for r in our_ranked[:20])
    actual_top20 = set(r['symbol'] for r in results[:20])
    overlap = our_top20 & actual_top20
    print(f"Top 20 overlap: {len(overlap)}/20 stocks in common")
    print(f"  Matched: {', '.join(sorted(overlap))}")
    missed = actual_top20 - our_top20
    if missed:
        print(f"  Missed:  {', '.join(sorted(missed))}")

    # Our top 20 vs actual top 20
    our_top10 = set(r['symbol'] for r in our_ranked[:10])
    actual_top10 = set(r['symbol'] for r in results[:10])
    overlap10 = our_top10 & actual_top10
    print(f"\nTop 10 overlap: {len(overlap10)}/10 stocks in common")
    print(f"  Matched: {', '.join(sorted(overlap10))}")

    # Production readiness assessment
    print()
    print("=" * 70)
    print("  PRODUCTION READINESS ASSESSMENT")
    print("=" * 70)

    mae = statistics.mean([abs(r['our_composite'] - r['actual_r']) for r in results])
    print(f"\n  Mean Absolute Error: {mae:.3f}")
    print(f"  TradeFinder R range: {min(actual):.3f} — {max(actual):.3f}")
    print(f"  Our score range:     {min(ours):.3f} — {max(ours):.3f}")

    # How many blast trades we'd detect vs TradeFinder's top picks
    our_blast = [r for r in results if r['our_composite'] >= 2.0]
    tf_high = [r for r in results if r['actual_r'] >= 2.8]
    print(f"\n  Our 'Blast Trade' (>= 2.0): {len(our_blast)} stocks")
    print(f"  TradeFinder high-R (>= 2.8): {len(tf_high)} stocks")
    if our_blast:
        print(f"    Our blast: {', '.join(r['symbol'] for r in sorted(our_blast, key=lambda x: -x['our_composite']))}")
    if tf_high:
        blast_overlap = set(r['symbol'] for r in our_blast) & set(r['symbol'] for r in tf_high)
        print(f"    TF high-R: {', '.join(r['symbol'] for r in sorted(tf_high, key=lambda x: -x['actual_r']))}")
        print(f"    Overlap:   {len(blast_overlap)}/{len(tf_high)} — {', '.join(sorted(blast_overlap)) if blast_overlap else 'NONE'}")

    print(f"\n  Verdict: {'USABLE for ranking/screening' if p_corr > 0.4 else 'NOT reliable enough'}")
    if p_corr > 0.4:
        print("  → Good for: identifying stocks with unusual institutional activity")
        print("  → Good for: relative ranking (which stocks are hotter than others)")
        print("  → NOT good for: exact R Factor replication (different scale)")
        print("  → Limitation: no intraday data = missing ~48% of TradeFinder's signal")
    else:
        print("  → The model needs more data sources to be production-ready")

    # Save results
    output = {
        'model': 'V3 hybrid (7-factor, ratio+zscore)',
        'pearson': p_corr,
        'spearman': s_corr,
        'mae': mae,
        'n_stocks': len(results),
        'weights': WEIGHTS,
        'results': results,
    }
    outpath = os.path.join(os.path.dirname(__file__), 'v3_validation.json')
    with open(outpath, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\n  Results saved to {outpath}")


if __name__ == '__main__':
    main()

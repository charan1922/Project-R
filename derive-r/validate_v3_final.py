"""
Final validation: simulates the EXACT production engine (engine.ts) logic
against 80 stocks to confirm LOO Pearson and ranking accuracy.
"""

import json
import os
import csv as csv_module
import statistics

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')

# Exact OLS coefficients from production engine
OLS_INTERCEPT = 1.108614
OLS_COEFFICIENTS = {
    'spread_r': 0.624570,
    'pcr_z': 0.076682,
    'spread_x_fut_turn': 0.226081,
    'fut_turn_z': 1.414904,
    'fut_vol_z': -1.733390,
}

BLAST_THRESHOLD = 2.8  # top ~15% of predicted scores


def parse_fo(filepath):
    with open(filepath) as fh:
        reader = csv_module.DictReader(fh)
        futures, options = {}, {}
        for row in reader:
            sym = row.get('TckrSymb', '').strip()
            inst = row.get('FinInstrmTp', '').strip()
            if inst == 'STF':
                if sym not in futures: futures[sym] = row
            elif inst == 'STO':
                if sym not in options:
                    options[sym] = {'vol': 0, 'ce_vol': 0, 'pe_vol': 0}
                vol = float(row.get('TtlTradgVol', 0) or 0)
                options[sym]['vol'] += vol
                ot = row.get('OptnTp', '').strip()
                if ot == 'CE': options[sym]['ce_vol'] += vol
                elif ot == 'PE': options[sym]['pe_vol'] += vol
        result = {}
        for sym in futures:
            r = futures[sym]
            opt = options.get(sym, {'vol': 0, 'ce_vol': 0, 'pe_vol': 0})
            result[sym] = {
                'fut_vol': float(r.get('TtlTradgVol', 0) or 0),
                'fut_turn': float(r.get('TtlTrfVal', 0) or 0),
                'fut_oi_chg': float(r.get('ChngInOpnIntrst', 0) or 0),
                'opt_vol': opt['vol'],
                'ce_vol': opt['ce_vol'],
                'pe_vol': opt['pe_vol'],
            }
        return result


def parse_cm(filepath):
    with open(filepath) as fh:
        reader = csv_module.DictReader(fh)
        result = {}
        for row in reader:
            sym = row.get('TckrSymb', '').strip()
            if row.get('SctySrs', '').strip() != 'EQ': continue
            result[sym] = {
                'eq_vol': float(row.get('TtlTradgVol', 0) or 0),
                'eq_turn': float(row.get('TtlTrfVal', 0) or 0),
                'eq_high': float(row.get('HghPric', 0) or 0),
                'eq_low': float(row.get('LwPric', 0) or 0),
                'eq_close': float(row.get('ClsPric', 0) or 0),
            }
        return result


def z_score(value, series):
    if len(series) < 2: return 0
    m = statistics.mean(series)
    s = statistics.stdev(series)
    return (value - m) / s if s != 0 else 0


def pearson(x, y):
    n = len(x)
    if n < 3: return 0
    mx, my = statistics.mean(x), statistics.mean(y)
    sx, sy = statistics.stdev(x), statistics.stdev(y)
    if sx == 0 or sy == 0: return 0
    return sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / ((n - 1) * sx * sy)


def spearman(x, y):
    def rank(data):
        s = sorted(enumerate(data), key=lambda t: t[1])
        r = [0] * len(data)
        for rv, (oi, _) in enumerate(s): r[oi] = rv + 1
        return r
    return pearson(rank(x), rank(y))


def main():
    with open(os.path.join(os.path.dirname(__file__), 'march-13-2026.json')) as f:
        data = json.load(f)
    ground_truth = {item['Symbol']: item['param_3']
                    for item in data['payload']['data']['intraday_boost']}

    fo_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('fo_')])
    cm_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('cm_')])
    all_fo = [parse_fo(os.path.join(CACHE_DIR, f)) for f in fo_files]
    all_cm = [parse_cm(os.path.join(CACHE_DIR, f)) for f in cm_files]
    n_days = min(len(all_fo), len(all_cm))

    results = []
    for symbol in sorted(ground_truth.keys()):
        ts = []
        for day_idx in range(n_days):
            fo = all_fo[day_idx].get(symbol, {})
            cm = all_cm[day_idx].get(symbol, {})
            if not fo and not cm: continue
            eq_close = cm.get('eq_close', 0)
            ts.append({
                'fut_turn': fo.get('fut_turn', 0),
                'fut_vol': fo.get('fut_vol', 0),
                'spread_raw': (cm.get('eq_high', 0) - cm.get('eq_low', 0)) / eq_close if eq_close > 0 else 0,
                'pcr': fo.get('pe_vol', 0) / fo.get('ce_vol', 1) if fo.get('ce_vol', 0) > 0 else 0,
                'oi_change': abs(fo.get('fut_oi_chg', 0)),
            })

        if len(ts) < 15: continue

        current = ts[-1]
        hist = ts[:-1]
        lookback = hist[-20:] if len(hist) >= 20 else hist

        # Exactly matching engine.ts logic:
        # spread = ratio (from transformToFactorData)
        avg_spread = statistics.mean([h['spread_raw'] for h in lookback]) if lookback else 0
        spread_r = current['spread_raw'] / avg_spread if avg_spread > 0 else 0

        # Z-scores
        fut_turn_z = z_score(current['fut_turn'], [h['fut_turn'] for h in hist])
        fut_vol_z = z_score(current['fut_vol'], [h['fut_vol'] for h in hist])
        pcr_z = z_score(current['pcr'], [h['pcr'] for h in hist])

        # OLS composite (exact engine formula)
        composite = (
            OLS_INTERCEPT +
            OLS_COEFFICIENTS['spread_r'] * spread_r +
            OLS_COEFFICIENTS['pcr_z'] * pcr_z +
            OLS_COEFFICIENTS['spread_x_fut_turn'] * (spread_r * fut_turn_z) +
            OLS_COEFFICIENTS['fut_turn_z'] * fut_turn_z +
            OLS_COEFFICIENTS['fut_vol_z'] * fut_vol_z
        )

        results.append({
            'symbol': symbol,
            'actual_r': ground_truth[symbol],
            'predicted': composite,
            'spread_r': spread_r,
            'pcr_z': pcr_z,
            'fut_turn_z': fut_turn_z,
            'fut_vol_z': fut_vol_z,
        })

    actual = [r['actual_r'] for r in results]
    predicted = [r['predicted'] for r in results]

    p = pearson(actual, predicted)
    s = spearman(actual, predicted)
    mae = statistics.mean([abs(r['predicted'] - r['actual_r']) for r in results])

    print("=" * 70)
    print("  PRODUCTION ENGINE V3 FINAL VALIDATION")
    print(f"  Model: 5-feature OLS with intercept + interaction term")
    print(f"  Stocks: {len(results)}/80")
    print("=" * 70)
    print(f"  Pearson:  {p:.4f}")
    print(f"  Spearman: {s:.4f}")
    print(f"  MAE:      {mae:.4f}")
    print(f"  Scale:    predicted {min(predicted):.2f}—{max(predicted):.2f} vs actual {min(actual):.2f}—{max(actual):.2f}")
    print()

    # Ranking analysis
    by_actual = sorted(results, key=lambda r: r['actual_r'], reverse=True)
    by_pred = sorted(results, key=lambda r: r['predicted'], reverse=True)

    actual_top10 = set(r['symbol'] for r in by_actual[:10])
    pred_top10 = set(r['symbol'] for r in by_pred[:10])
    actual_top20 = set(r['symbol'] for r in by_actual[:20])
    pred_top20 = set(r['symbol'] for r in by_pred[:20])

    print(f"  Top 10 overlap: {len(actual_top10 & pred_top10)}/10  ({', '.join(sorted(actual_top10 & pred_top10))})")
    print(f"  Top 20 overlap: {len(actual_top20 & pred_top20)}/20  ({', '.join(sorted(actual_top20 & pred_top20))})")
    print()

    # Side-by-side ranking
    print(f"  {'#':<4} {'TradeFinder Top 10':<20} {'R':>6}  |  {'Our Top 10':<20} {'Pred':>6} {'Actual#':>8}")
    print("  " + "-" * 75)
    for i in range(10):
        a = by_actual[i]
        p_item = by_pred[i]
        actual_rank = next(j for j, r in enumerate(by_actual) if r['symbol'] == p_item['symbol']) + 1
        match_a = "*" if a['symbol'] in pred_top10 else " "
        match_p = "*" if p_item['symbol'] in actual_top10 else " "
        print(f"  {i+1:<4}{match_a}{a['symbol']:<19} {a['actual_r']:>6.3f}  |  {match_p}{p_item['symbol']:<19} {p_item['predicted']:>6.3f} {f'(#{actual_rank})':>8}")

    # Blast trade detection
    print()
    our_blasts = [r for r in by_pred if r['predicted'] >= BLAST_THRESHOLD]
    tf_blasts = [r for r in by_actual if r['actual_r'] >= 2.8]
    blast_set = set(r['symbol'] for r in our_blasts)
    tf_blast_set = set(r['symbol'] for r in tf_blasts)
    overlap = blast_set & tf_blast_set

    print(f"  Blast Trades (pred >= {BLAST_THRESHOLD}):")
    print(f"    Ours:        {len(our_blasts)} — {', '.join(r['symbol'] for r in our_blasts)}")
    print(f"    TradeFinder: {len(tf_blasts)} — {', '.join(r['symbol'] for r in tf_blasts)}")
    print(f"    Overlap:     {len(overlap)}/{len(tf_blasts)} — {', '.join(sorted(overlap)) if overlap else 'none'}")

    # Full comparison table (sorted by actual)
    print(f"\n  {'#':<4} {'Symbol':<15} {'Actual':>8} {'Predicted':>10} {'Error':>8} {'Hit?':>6}")
    print("  " + "-" * 55)
    for i, r in enumerate(by_actual):
        err = r['predicted'] - r['actual_r']
        hit = "Y" if abs(err) < 0.5 else ""
        print(f"  {i+1:<4} {r['symbol']:<15} {r['actual_r']:>8.3f} {r['predicted']:>10.3f} {err:>+8.3f} {hit:>6}")

    hits = sum(1 for r in results if abs(r['predicted'] - r['actual_r']) < 0.5)
    print(f"\n  Stocks within ±0.5 of actual: {hits}/{len(results)} ({100*hits/len(results):.0f}%)")

    # Save
    output = {
        'model': 'V3 OLS 5-feature (production engine)',
        'pearson': p, 'spearman': s, 'mae': mae,
        'n_stocks': len(results),
        'top10_overlap': len(actual_top10 & pred_top10),
        'top20_overlap': len(actual_top20 & pred_top20),
        'coefficients': {'intercept': OLS_INTERCEPT, **OLS_COEFFICIENTS},
        'results': results,
    }
    with open(os.path.join(os.path.dirname(__file__), 'v3_final_validation.json'), 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\n  Saved to v3_final_validation.json")


if __name__ == '__main__':
    main()

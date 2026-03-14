"""
Improve V3 R-Factor engine — try multiple model formulations against 80 stocks.

Approaches:
1. Apply exact OLS regression coefficients (with intercept + negative fut_volume)
2. Try all possible 2-7 factor combinations with LOO cross-validation
3. Try non-linear transforms (log, sqrt, squared)
4. Try mixing ratios and Z-scores for different factors
5. Try rank-based scoring instead of raw values

Goal: maximize LOO Pearson (out-of-sample generalization)
"""

import json
import os
import csv as csv_module
import statistics
import math
from itertools import combinations

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')


def parse_fo(filepath):
    with open(filepath) as fh:
        reader = csv_module.DictReader(fh)
        futures = {}
        options = {}
        for row in reader:
            sym = row.get('TckrSymb', '').strip()
            inst = row.get('FinInstrmTp', '').strip()
            if inst == 'STF':
                if sym not in futures:
                    futures[sym] = row
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
    return (value - m) / s if s != 0 else 0


def ratio(today, series):
    avg = statistics.mean(series) if series and any(v != 0 for v in series) else 0
    return today / avg if avg > 0 else 0


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
        for rv, (oi, _) in enumerate(s):
            r[oi] = rv + 1
        return r
    return pearson(rank(x), rank(y))


def loo_pearson(features, target):
    """Leave-one-out cross-validated Pearson using OLS regression."""
    import numpy as np
    X = np.column_stack([np.ones(len(target)), features])
    Y = np.array(target)
    n = len(Y)
    preds = np.zeros(n)
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        b = np.linalg.lstsq(X[mask], Y[mask], rcond=None)[0]
        preds[i] = X[i] @ b
    return float(np.corrcoef(Y, preds)[0, 1])


def ols_fit(features, target):
    """Fit OLS and return coefficients, R², Pearson."""
    import numpy as np
    X = np.column_stack([np.ones(len(target)), features])
    Y = np.array(target)
    beta = np.linalg.lstsq(X, Y, rcond=None)[0]
    pred = X @ beta
    r2 = 1 - np.sum((Y - pred)**2) / np.sum((Y - np.mean(Y))**2)
    corr = float(np.corrcoef(Y, pred)[0, 1])
    return beta, r2, corr, pred


def main():
    import numpy as np

    # Load ground truth
    with open(os.path.join(os.path.dirname(__file__), 'march-13-2026.json')) as f:
        data = json.load(f)
    intraday_boost = data['payload']['data']['intraday_boost']
    ground_truth = {item['Symbol']: item['param_3'] for item in intraday_boost}

    # Load bhavcopy cache
    fo_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('fo_')])
    cm_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('cm_')])
    all_fo = [parse_fo(os.path.join(CACHE_DIR, f)) for f in fo_files]
    all_cm = [parse_cm(os.path.join(CACHE_DIR, f)) for f in cm_files]
    n_days = min(len(all_fo), len(all_cm))

    print(f"80 stocks, {n_days} trading days\n")

    # Build feature matrix for all 80 stocks
    # For each stock: compute Z-scores AND ratios for all factors
    stock_features = {}

    for symbol in sorted(ground_truth.keys()):
        ts = []
        for day_idx in range(n_days):
            fo = all_fo[day_idx].get(symbol, {})
            cm = all_cm[day_idx].get(symbol, {})
            if not fo and not cm:
                continue
            ts.append({
                'fut_turn': fo.get('fut_turn', 0),
                'fut_vol': fo.get('fut_vol', 0),
                'opt_vol': fo.get('opt_vol', 0),
                'eq_trade_size': cm.get('eq_turn', 0) / cm.get('eq_vol', 1) if cm.get('eq_vol', 0) > 0 else 0,
                'oi_change': abs(fo.get('fut_oi_chg', 0)),
                'spread_raw': (cm.get('eq_high', 0) - cm.get('eq_low', 0)) / cm.get('eq_close', 1) if cm.get('eq_close', 0) > 0 else 0,
                'pcr': fo.get('pe_vol', 0) / fo.get('ce_vol', 1) if fo.get('ce_vol', 0) > 0 else 0,
                'eq_vol': cm.get('eq_vol', 0),
                'eq_turn': cm.get('eq_turn', 0),
                'fut_oi': fo.get('fut_oi', 0),
                'opt_oi': fo.get('oi', 0) if 'oi' in fo else 0,
                'ce_vol': fo.get('ce_vol', 0),
                'pe_vol': fo.get('pe_vol', 0),
            })

        if len(ts) < 15:
            continue

        current = ts[-1]
        hist = ts[:-1]
        lookback = hist[-20:] if len(hist) >= 20 else hist

        features = {}

        # Z-scores
        for key in ['fut_turn', 'fut_vol', 'opt_vol', 'eq_trade_size', 'oi_change', 'eq_vol', 'eq_turn']:
            features[f'{key}_z'] = z_score(current[key], [h[key] for h in hist])

        # Ratios (today / 20d avg)
        for key in ['fut_turn', 'fut_vol', 'opt_vol', 'eq_trade_size', 'oi_change', 'eq_vol', 'eq_turn']:
            features[f'{key}_r'] = ratio(current[key], [h[key] for h in lookback])

        # Spread ratio (dominant predictor)
        avg_spread = statistics.mean([h['spread_raw'] for h in lookback]) if lookback else 0
        features['spread_r'] = current['spread_raw'] / avg_spread if avg_spread > 0 else 0
        features['spread_z'] = z_score(current['spread_raw'], [h['spread_raw'] for h in hist])

        # PCR
        features['pcr'] = current['pcr']
        features['pcr_z'] = z_score(current['pcr'], [h['pcr'] for h in hist])

        # Non-linear transforms
        features['spread_r_sq'] = features['spread_r'] ** 2
        features['spread_r_log'] = math.log1p(max(0, features['spread_r']))
        features['pcr_log'] = math.log1p(max(0, features['pcr']))
        features['fut_turn_z_abs'] = abs(features['fut_turn_z'])

        # Interaction terms
        features['spread_x_pcr'] = features['spread_r'] * features['pcr']
        features['spread_x_fut_turn'] = features['spread_r'] * features['fut_turn_z']

        stock_features[symbol] = features

    symbols = sorted(stock_features.keys())
    actual = np.array([ground_truth[s] for s in symbols])
    all_feature_names = sorted(stock_features[symbols[0]].keys())
    n = len(symbols)

    print(f"Features available: {len(all_feature_names)}")
    print()

    # ============================================================
    # 1. Individual feature correlations
    # ============================================================
    print("=" * 70)
    print("INDIVIDUAL FEATURE CORRELATIONS")
    print("=" * 70)
    ind_corrs = []
    for fname in all_feature_names:
        vals = np.array([stock_features[s][fname] for s in symbols])
        pc = float(np.corrcoef(actual, vals)[0, 1]) if np.std(vals) > 0 else 0
        ind_corrs.append((fname, pc))
    ind_corrs.sort(key=lambda x: abs(x[1]), reverse=True)
    for fname, pc in ind_corrs:
        bar = "+" * int(abs(pc) * 40)
        print(f"  {fname:<25} {pc:>+.4f}  {bar}")

    # ============================================================
    # 2. Apply exact regression coefficients (best known model)
    # ============================================================
    print(f"\n{'='*70}")
    print("MODEL 1: Exact OLS regression (all available features)")
    print("=" * 70)

    # Use top features by individual correlation
    top_features = [f for f, _ in ind_corrs[:12]]
    F_top = np.array([[stock_features[s][f] for f in top_features] for s in symbols])
    beta_top, r2_top, corr_top, pred_top = ols_fit(F_top, actual)
    loo_top = loo_pearson(F_top, actual)
    print(f"  Top 12 features OLS: R²={r2_top:.4f}, Pearson={corr_top:.4f}, LOO={loo_top:.4f}")
    print(f"  Intercept: {beta_top[0]:.4f}")
    for i, f in enumerate(top_features):
        print(f"    {f:<25}: {beta_top[i+1]:>+.4f}")

    # ============================================================
    # 3. Best 3-feature model (exhaustive search with LOO)
    # ============================================================
    print(f"\n{'='*70}")
    print("MODEL 2: Best 3-feature combo (LOO cross-validated)")
    print("=" * 70)

    # Use top 15 individual features to limit search space
    candidate_names = [f for f, _ in ind_corrs[:15]]
    candidate_data = {f: np.array([stock_features[s][f] for s in symbols]) for f in candidate_names}

    best_3 = (0, None, None)
    for combo in combinations(range(len(candidate_names)), 3):
        feats = np.column_stack([candidate_data[candidate_names[i]] for i in combo])
        try:
            loo = loo_pearson(feats, actual)
            if loo > best_3[0]:
                best_3 = (loo, combo, None)
        except:
            pass

    combo_names_3 = [candidate_names[i] for i in best_3[1]]
    F3 = np.column_stack([candidate_data[f] for f in combo_names_3])
    beta3, r2_3, corr3, pred3 = ols_fit(F3, actual)
    print(f"  Best 3: {', '.join(combo_names_3)}")
    print(f"  R²={r2_3:.4f}, Pearson={corr3:.4f}, LOO={best_3[0]:.4f}")
    print(f"  Formula: R = {beta3[0]:.4f}", end="")
    for i, f in enumerate(combo_names_3):
        print(f" + {beta3[i+1]:+.4f}*{f}", end="")
    print()

    # ============================================================
    # 4. Best 4-feature model
    # ============================================================
    print(f"\n{'='*70}")
    print("MODEL 3: Best 4-feature combo (LOO cross-validated)")
    print("=" * 70)

    best_4 = (0, None, None)
    for combo in combinations(range(len(candidate_names)), 4):
        feats = np.column_stack([candidate_data[candidate_names[i]] for i in combo])
        try:
            loo = loo_pearson(feats, actual)
            if loo > best_4[0]:
                best_4 = (loo, combo, None)
        except:
            pass

    combo_names_4 = [candidate_names[i] for i in best_4[1]]
    F4 = np.column_stack([candidate_data[f] for f in combo_names_4])
    beta4, r2_4, corr4, pred4 = ols_fit(F4, actual)
    print(f"  Best 4: {', '.join(combo_names_4)}")
    print(f"  R²={r2_4:.4f}, Pearson={corr4:.4f}, LOO={best_4[0]:.4f}")
    print(f"  Formula: R = {beta4[0]:.4f}", end="")
    for i, f in enumerate(combo_names_4):
        print(f" + {beta4[i+1]:+.4f}*{f}", end="")
    print()

    # ============================================================
    # 5. Best 5-feature model
    # ============================================================
    print(f"\n{'='*70}")
    print("MODEL 4: Best 5-feature combo (LOO cross-validated)")
    print("=" * 70)

    best_5 = (0, None, None)
    for combo in combinations(range(len(candidate_names)), 5):
        feats = np.column_stack([candidate_data[candidate_names[i]] for i in combo])
        try:
            loo = loo_pearson(feats, actual)
            if loo > best_5[0]:
                best_5 = (loo, combo, None)
        except:
            pass

    combo_names_5 = [candidate_names[i] for i in best_5[1]]
    F5 = np.column_stack([candidate_data[f] for f in combo_names_5])
    beta5, r2_5, corr5, pred5 = ols_fit(F5, actual)
    print(f"  Best 5: {', '.join(combo_names_5)}")
    print(f"  R²={r2_5:.4f}, Pearson={corr5:.4f}, LOO={best_5[0]:.4f}")
    print(f"  Formula: R = {beta5[0]:.4f}", end="")
    for i, f in enumerate(combo_names_5):
        print(f" + {beta5[i+1]:+.4f}*{f}", end="")
    print()

    # ============================================================
    # 6. Pick the winner — best LOO model
    # ============================================================
    models = [
        ("3-feature", best_3[0], combo_names_3, beta3, F3, pred3),
        ("4-feature", best_4[0], combo_names_4, beta4, F4, pred4),
        ("5-feature", best_5[0], combo_names_5, beta5, F5, pred5),
    ]
    models.sort(key=lambda x: x[1], reverse=True)
    winner = models[0]

    print(f"\n{'='*70}")
    print(f"WINNER: {winner[0]} model (LOO Pearson = {winner[1]:.4f})")
    print("=" * 70)

    w_names = winner[2]
    w_beta = winner[3]
    w_pred = winner[5]

    # Ranking analysis with winner
    ranked_actual = sorted(range(n), key=lambda i: actual[i], reverse=True)
    ranked_ours = sorted(range(n), key=lambda i: w_pred[i], reverse=True)

    actual_top20 = set(ranked_actual[:20])
    our_top20 = set(ranked_ours[:20])
    overlap20 = actual_top20 & our_top20

    actual_top10 = set(ranked_actual[:10])
    our_top10 = set(ranked_ours[:10])
    overlap10 = actual_top10 & our_top10

    print(f"\n  Top 20 overlap: {len(overlap20)}/20")
    print(f"  Top 10 overlap: {len(overlap10)}/10")

    # Show predictions
    print(f"\n  {'Rank':<6} {'Symbol':<15} {'Actual R':>10} {'Predicted':>10} {'Error':>8}")
    print("  " + "-" * 52)
    for rank, idx in enumerate(ranked_actual[:15]):
        err = w_pred[idx] - actual[idx]
        print(f"  {rank+1:<6} {symbols[idx]:<15} {actual[idx]:>10.3f} {w_pred[idx]:>10.3f} {err:>+8.3f}")
    print("  ...")
    for rank_offset, idx in enumerate(ranked_actual[-5:]):
        rank = n - 5 + rank_offset + 1
        err = w_pred[idx] - actual[idx]
        print(f"  {rank:<6} {symbols[idx]:<15} {actual[idx]:>10.3f} {w_pred[idx]:>10.3f} {err:>+8.3f}")

    # Show top 10 from our predictions
    print(f"\n  OUR TOP 10 PICKS:")
    for rank, idx in enumerate(ranked_ours[:10]):
        actual_rank = ranked_actual.index(idx) + 1
        print(f"  {rank+1:<4} {symbols[idx]:<15} predicted={w_pred[idx]:.3f}  actual_R={actual[idx]:.3f}  (actual rank #{actual_rank})")

    # Blast trade detection
    print(f"\n  BLAST TRADE DETECTION:")
    threshold = w_beta[0] + 1.5 * statistics.stdev(w_pred)  # Top ~15% of predictions
    our_blasts = [i for i in range(n) if w_pred[i] >= threshold]
    tf_top = set(ranked_actual[:10])  # TradeFinder's top 10
    our_blast_set = set(our_blasts)
    blast_overlap = tf_top & our_blast_set
    print(f"  Our blast threshold: {threshold:.3f}")
    print(f"  Our blasts: {len(our_blasts)} stocks")
    print(f"  TF top 10 caught: {len(blast_overlap)}/10")

    # ============================================================
    # 7. Export best model for production use
    # ============================================================
    print(f"\n{'='*70}")
    print("PRODUCTION MODEL EXPORT")
    print("=" * 70)
    print(f"\n  // Best model: {winner[0]}")
    print(f"  // LOO Pearson: {winner[1]:.4f}")
    print(f"  // Features: {', '.join(w_names)}")
    print(f"  const INTERCEPT = {w_beta[0]:.6f};")
    print(f"  const COEFFICIENTS = {{")
    for i, f in enumerate(w_names):
        print(f"    '{f}': {w_beta[i+1]:.6f},")
    print(f"  }};")
    print(f"  // composite = INTERCEPT + sum(coeff * feature)")

    # Save full results
    output = {
        'winner': {
            'name': winner[0],
            'loo_pearson': winner[1],
            'features': w_names,
            'intercept': float(w_beta[0]),
            'coefficients': {f: float(w_beta[i+1]) for i, f in enumerate(w_names)},
        },
        'all_models': [
            {'name': m[0], 'loo_pearson': m[1], 'features': m[2],
             'intercept': float(m[3][0]),
             'coefficients': {f: float(m[3][i+1]) for i, f in enumerate(m[2])}}
            for m in models
        ],
        'individual_correlations': ind_corrs[:20],
        'top20_overlap': len(overlap20),
        'top10_overlap': len(overlap10),
        'predictions': [
            {'symbol': symbols[i], 'actual': float(actual[i]), 'predicted': float(w_pred[i])}
            for i in ranked_actual
        ],
    }
    outpath = os.path.join(os.path.dirname(__file__), 'best_model.json')
    with open(outpath, 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\n  Full results saved to {outpath}")


if __name__ == '__main__':
    main()

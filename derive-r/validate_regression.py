"""
Find optimal weights via OLS regression on 80 stocks.
Also test alternative models (spread-dominant, non-linear, etc.)
"""

import json
import os
import statistics
import numpy as np

def main():
    with open(os.path.join(os.path.dirname(__file__), 'engine_validation.json')) as f:
        data = json.load(f)

    results = data['results']
    n = len(results)
    print(f"Working with {n} stocks\n")

    # Extract arrays
    actual = np.array([r['actual_r'] for r in results])
    factors = ['fut_turnover', 'fut_volume', 'opt_volume', 'eq_trade_size', 'oi_change', 'spread']

    Z = np.zeros((n, len(factors)))
    for i, r in enumerate(results):
        for j, f in enumerate(factors):
            Z[i, j] = r['z_scores'][f]

    # ==============================
    # 1. OLS Regression (all 6 factors)
    # ==============================
    # Add intercept
    X = np.column_stack([np.ones(n), Z])
    beta = np.linalg.lstsq(X, actual, rcond=None)[0]
    pred = X @ beta
    residuals = actual - pred
    ss_res = np.sum(residuals ** 2)
    ss_tot = np.sum((actual - np.mean(actual)) ** 2)
    r2 = 1 - ss_res / ss_tot
    mae = np.mean(np.abs(residuals))
    corr = np.corrcoef(actual, pred)[0, 1]

    print("=" * 60)
    print("Model 1: OLS all 6 factors")
    print(f"  R² = {r2:.4f}, MAE = {mae:.4f}, Pearson = {corr:.4f}")
    print(f"  Intercept: {beta[0]:.4f}")
    for j, f in enumerate(factors):
        print(f"  {f:<20s}: {beta[j+1]:>+8.4f}")

    # Leave-one-out cross-validation
    loo_pred = np.zeros(n)
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        b = np.linalg.lstsq(X[mask], actual[mask], rcond=None)[0]
        loo_pred[i] = X[i] @ b
    loo_corr = np.corrcoef(actual, loo_pred)[0, 1]
    loo_mae = np.mean(np.abs(actual - loo_pred))
    print(f"  LOO CV: Pearson = {loo_corr:.4f}, MAE = {loo_mae:.4f}")

    # ==============================
    # 2. Spread only (best single predictor)
    # ==============================
    spread_z = Z[:, factors.index('spread')]
    X2 = np.column_stack([np.ones(n), spread_z])
    beta2 = np.linalg.lstsq(X2, actual, rcond=None)[0]
    pred2 = X2 @ beta2
    r2_2 = 1 - np.sum((actual - pred2)**2) / ss_tot
    corr2 = np.corrcoef(actual, pred2)[0, 1]
    print(f"\nModel 2: Spread only")
    print(f"  R = {beta2[0]:.4f} + {beta2[1]:.4f} * spread_z")
    print(f"  R² = {r2_2:.4f}, Pearson = {corr2:.4f}")

    # ==============================
    # 3. Top 3 factors by individual correlation
    # ==============================
    # Compute individual correlations
    print(f"\nIndividual factor correlations (80 stocks):")
    ind_corrs = []
    for j, f in enumerate(factors):
        c = np.corrcoef(actual, Z[:, j])[0, 1]
        ind_corrs.append((f, c, j))
        print(f"  {f:<20s}: Pearson = {c:.4f}")

    ind_corrs.sort(key=lambda x: abs(x[1]), reverse=True)
    top3 = ind_corrs[:3]
    top3_names = [t[0] for t in top3]
    top3_idx = [t[2] for t in top3]
    print(f"\nModel 3: Top 3 factors ({', '.join(top3_names)})")
    X3 = np.column_stack([np.ones(n)] + [Z[:, i] for i in top3_idx])
    beta3 = np.linalg.lstsq(X3, actual, rcond=None)[0]
    pred3 = X3 @ beta3
    r2_3 = 1 - np.sum((actual - pred3)**2) / ss_tot
    corr3 = np.corrcoef(actual, pred3)[0, 1]
    print(f"  R² = {r2_3:.4f}, Pearson = {corr3:.4f}")
    print(f"  Intercept: {beta3[0]:.4f}")
    for k, name in enumerate(top3_names):
        print(f"  {name:<20s}: {beta3[k+1]:>+8.4f}")

    # LOO for top 3
    loo_pred3 = np.zeros(n)
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        b = np.linalg.lstsq(X3[mask], actual[mask], rcond=None)[0]
        loo_pred3[i] = X3[i] @ b
    loo_corr3 = np.corrcoef(actual, loo_pred3)[0, 1]
    print(f"  LOO CV: Pearson = {loo_corr3:.4f}")

    # ==============================
    # 4. Try absolute values (non-linear)
    # ==============================
    print(f"\nModel 4: Using absolute Z-scores")
    Z_abs = np.abs(Z)
    X4 = np.column_stack([np.ones(n), Z_abs])
    beta4 = np.linalg.lstsq(X4, actual, rcond=None)[0]
    pred4 = X4 @ beta4
    r2_4 = 1 - np.sum((actual - pred4)**2) / ss_tot
    corr4 = np.corrcoef(actual, pred4)[0, 1]
    print(f"  R² = {r2_4:.4f}, Pearson = {corr4:.4f}")
    for j, f in enumerate(factors):
        print(f"  {f:<20s}: {beta4[j+1]:>+8.4f}")

    # ==============================
    # 5. Try ratios instead of Z-scores
    # ==============================
    print(f"\nModel 5: Using simple ratios (today/20d avg)")
    # Recompute ratios from engine_validation data
    # We need the raw values from bhavcopy_cache
    # Load all days
    cache_dir = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')
    import csv as csv_module
    import io

    fo_files = sorted([f for f in os.listdir(cache_dir) if f.startswith('fo_')])
    cm_files = sorted([f for f in os.listdir(cache_dir) if f.startswith('cm_')])

    # Re-parse to get raw values per stock per day
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
                        futures[sym] = row  # Take first (nearest expiry since sorted)
                elif inst == 'STO':
                    if sym not in options:
                        options[sym] = {'vol': 0, 'oi': 0, 'turn': 0}
                    options[sym]['vol'] += float(row.get('TtlTradgVol', 0) or 0)
                    options[sym]['oi'] += float(row.get('OpnIntrst', 0) or 0)
                    options[sym]['turn'] += float(row.get('TtlTrfVal', 0) or 0)
            result = {}
            for sym in futures:
                r = futures[sym]
                opt = options.get(sym, {'vol': 0, 'oi': 0, 'turn': 0})
                result[sym] = {
                    'fut_vol': float(r.get('TtlTradgVol', 0) or 0),
                    'fut_turn': float(r.get('TtlTrfVal', 0) or 0),
                    'fut_oi': float(r.get('OpnIntrst', 0) or 0),
                    'fut_oi_chg': float(r.get('ChngInOpnIntrst', 0) or 0),
                    'opt_vol': opt['vol'],
                    'opt_oi': opt['oi'],
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

    all_fo = [parse_fo(os.path.join(cache_dir, f)) for f in fo_files]
    all_cm = [parse_cm(os.path.join(cache_dir, f)) for f in cm_files]

    # Compute ratios (last day / avg of prior 20 days)
    ground_truth = {r['symbol']: r['actual_r'] for r in results}
    ratio_results = []

    for symbol in ground_truth:
        # Get time series
        fut_vol_ts = [d.get(symbol, {}).get('fut_vol', 0) for d in all_fo]
        fut_turn_ts = [d.get(symbol, {}).get('fut_turn', 0) for d in all_fo]
        opt_vol_ts = [d.get(symbol, {}).get('opt_vol', 0) for d in all_fo]
        opt_oi_ts = [d.get(symbol, {}).get('opt_oi', 0) for d in all_fo]
        eq_vol_ts = [d.get(symbol, {}).get('eq_vol', 0) for d in all_cm]
        eq_turn_ts = [d.get(symbol, {}).get('eq_turn', 0) for d in all_cm]
        spread_ts = [(d.get(symbol, {}).get('eq_high', 0) - d.get(symbol, {}).get('eq_low', 0)) / d.get(symbol, {}).get('eq_close', 1) for d in all_cm]

        if len(fut_vol_ts) < 21:
            continue

        def ratio(ts):
            today = ts[-1]
            avg = statistics.mean(ts[-21:-1]) if any(ts[-21:-1]) else 1
            return today / avg if avg > 0 else 0

        ratios = {
            'fut_vol_r': ratio(fut_vol_ts),
            'fut_turn_r': ratio(fut_turn_ts),
            'opt_vol_r': ratio(opt_vol_ts),
            'opt_oi_r': ratio(opt_oi_ts),
            'eq_vol_r': ratio(eq_vol_ts),
            'spread_r': ratio(spread_ts),
        }
        ratio_results.append({'symbol': symbol, 'actual': ground_truth[symbol], **ratios})

    # Regression on ratios
    ratio_names = ['fut_vol_r', 'fut_turn_r', 'opt_vol_r', 'opt_oi_r', 'eq_vol_r', 'spread_r']
    R = np.array([[r[f] for f in ratio_names] for r in ratio_results])
    Y = np.array([r['actual'] for r in ratio_results])
    X5 = np.column_stack([np.ones(len(Y)), R])
    beta5 = np.linalg.lstsq(X5, Y, rcond=None)[0]
    pred5 = X5 @ beta5
    r2_5 = 1 - np.sum((Y - pred5)**2) / np.sum((Y - np.mean(Y))**2)
    corr5 = np.corrcoef(Y, pred5)[0, 1]
    print(f"  R² = {r2_5:.4f}, Pearson = {corr5:.4f}")
    print(f"  Intercept: {beta5[0]:.4f}")
    for j, f in enumerate(ratio_names):
        rc = np.corrcoef(Y, R[:, j])[0, 1]
        print(f"  {f:<20s}: coeff={beta5[j+1]:>+8.4f}  individual_r={rc:.4f}")

    # LOO for ratio model
    loo_pred5 = np.zeros(len(Y))
    for i in range(len(Y)):
        mask = np.ones(len(Y), dtype=bool)
        mask[i] = False
        b = np.linalg.lstsq(X5[mask], Y[mask], rcond=None)[0]
        loo_pred5[i] = X5[i] @ b
    loo_corr5 = np.corrcoef(Y, loo_pred5)[0, 1]
    loo_mae5 = np.mean(np.abs(Y - loo_pred5))
    print(f"  LOO CV: Pearson = {loo_corr5:.4f}, MAE = {loo_mae5:.4f}")

    # ==============================
    # 6. Best combination search (exhaustive 2-3 feature)
    # ==============================
    print(f"\n{'='*60}")
    print("Exhaustive search: best 2-feature and 3-feature models")
    all_features = ratio_names + [f + '_z' for f in factors]
    all_data = np.column_stack([R, Z])

    from itertools import combinations

    best_2 = (0, None, None)
    best_3 = (0, None, None)

    for combo in combinations(range(all_data.shape[1]), 2):
        Xc = np.column_stack([np.ones(n), all_data[:, list(combo)]])
        bc = np.linalg.lstsq(Xc, actual, rcond=None)[0]
        pc = Xc @ bc
        cc = np.corrcoef(actual, pc)[0, 1]
        if cc > best_2[0]:
            best_2 = (cc, combo, bc)

    for combo in combinations(range(all_data.shape[1]), 3):
        Xc = np.column_stack([np.ones(n), all_data[:, list(combo)]])
        bc = np.linalg.lstsq(Xc, actual, rcond=None)[0]
        pc = Xc @ bc
        cc = np.corrcoef(actual, pc)[0, 1]
        if cc > best_3[0]:
            best_3 = (cc, combo, bc)

    print(f"\nBest 2-feature: Pearson = {best_2[0]:.4f}")
    print(f"  Features: {', '.join(all_features[i] for i in best_2[1])}")
    print(f"  Coefficients: intercept={best_2[2][0]:.4f}, " + ", ".join(f"{best_2[2][k+1]:.4f}" for k in range(2)))

    # LOO for best 2
    idx2 = list(best_2[1])
    Xb2 = np.column_stack([np.ones(n), all_data[:, idx2]])
    loo2 = np.zeros(n)
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        b = np.linalg.lstsq(Xb2[mask], actual[mask], rcond=None)[0]
        loo2[i] = Xb2[i] @ b
    print(f"  LOO CV: Pearson = {np.corrcoef(actual, loo2)[0, 1]:.4f}")

    print(f"\nBest 3-feature: Pearson = {best_3[0]:.4f}")
    print(f"  Features: {', '.join(all_features[i] for i in best_3[1])}")
    print(f"  Coefficients: intercept={best_3[2][0]:.4f}, " + ", ".join(f"{best_3[2][k+1]:.4f}" for k in range(3)))

    # LOO for best 3
    idx3 = list(best_3[1])
    Xb3 = np.column_stack([np.ones(n), all_data[:, idx3]])
    loo3 = np.zeros(n)
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        b = np.linalg.lstsq(Xb3[mask], actual[mask], rcond=None)[0]
        loo3[i] = Xb3[i] @ b
    print(f"  LOO CV: Pearson = {np.corrcoef(actual, loo3)[0, 1]:.4f}")


if __name__ == '__main__':
    main()

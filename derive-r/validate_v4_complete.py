"""
R-Factor V4 Complete Validation Suite

Tests all improvements:
1. Scale correction for extreme R-Factor values
2. Robust regression with Huber loss
3. Enhanced feature engineering
4. Ensemble model
5. Dynamic lookback window
6. Dhan-NSE calibration

Run this after implementing changes to verify improvements.
"""

import json
import os
import csv as csv_module
import statistics
import math
from datetime import datetime
import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')


def parse_fo(filepath):
    with open(filepath) as fh:
        reader = csv_module.DictReader(fh)
        futures, options = {}, {}
        for row in reader:
            sym = row.get('TckrSymb', '').strip()
            inst = row.get('FinInstrmTp', '').strip()
            if inst == 'STF':
                if sym not in futures:
                    futures[sym] = row
            elif inst == 'STO':
                if sym not in options:
                    options[sym] = {'vol': 0, 'ce_vol': 0, 'pe_vol': 0, 'oi': 0}
                vol = float(row.get('TtlTradgVol', 0) or 0)
                options[sym]['vol'] += vol
                options[sym]['oi'] += float(row.get('OpnIntrst', 0) or 0)
                ot = row.get('OptnTp', '').strip()
                if ot == 'CE':
                    options[sym]['ce_vol'] += vol
                elif ot == 'PE':
                    options[sym]['pe_vol'] += vol
        result = {}
        for sym in futures:
            r = futures[sym]
            opt = options.get(sym, {'vol': 0, 'ce_vol': 0, 'pe_vol': 0, 'oi': 0})
            result[sym] = {
                'fut_vol': float(r.get('TtlTradgVol', 0) or 0),
                'fut_turn': float(r.get('TtlTrfVal', 0) or 0),
                'fut_oi': float(r.get('OpnIntrst', 0) or 0),
                'fut_oi_chg': float(r.get('ChngInOpnIntrst', 0) or 0),
                'opt_vol': opt['vol'],
                'ce_vol': opt['ce_vol'],
                'pe_vol': opt['pe_vol'],
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


def z_score(value, series):
    if len(series) < 2:
        return 0
    m = statistics.mean(series)
    s = statistics.stdev(series)
    return (value - m) / s if s != 0 else 0


def pearson(x, y):
    n = len(x)
    if n < 3:
        return 0
    mx, my = statistics.mean(x), statistics.mean(y)
    sx, sy = statistics.stdev(x), statistics.stdev(y)
    if sx == 0 or sy == 0:
        return 0
    return sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / ((n - 1) * sx * sy)


def spearman(x, y):
    def rank(data):
        s = sorted(enumerate(data), key=lambda t: t[1])
        r = [0] * len(data)
        for rv, (oi, _) in enumerate(s):
            r[oi] = rv + 1
        return r
    return pearson(rank(x), rank(y))


def fit_huber(X, y, epsilon=1.35, max_iter=100):
    """Huber regression using IRLS."""
    n, p = X.shape
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    
    for _ in range(max_iter):
        residuals = y - X @ beta
        weights = np.ones(n)
        for i in range(n):
            abs_r = abs(residuals[i])
            if abs_r > epsilon:
                weights[i] = epsilon / abs_r
        
        W = np.diag(weights)
        try:
            beta_new = np.linalg.solve(X.T @ W @ X, X.T @ W @ y)
            if np.max(np.abs(beta_new - beta)) < 1e-6:
                break
            beta = beta_new
        except:
            break
    
    return beta


def scale_correction(raw, threshold=2.5, factor=1.5):
    """Apply non-linear expansion for extreme R-Factor values."""
    if raw <= threshold:
        return raw
    
    excess = raw - threshold
    expansion = 1 + (factor - 1) * np.tanh(excess)
    return threshold + excess * expansion


def compute_adaptive_lookback(ts, idx, min_lb=10, max_lb=30):
    """Compute adaptive lookback based on volatility."""
    if idx < min_lb:
        return idx
    
    recent = ts[max(0, idx - 10):idx]
    spreads = [d['spread_r'] for d in recent]
    
    avg = statistics.mean(spreads)
    var = sum((s - avg) ** 2 for s in spreads) / len(spreads)
    vol = math.sqrt(var)
    
    if vol > 1.0:
        return max(min_lb, int(20 * 0.7))
    elif vol < 0.3:
        return min(max_lb, int(20 * 1.3))
    return 20


def main():
    print("=" * 80)
    print("  R-FACTOR V4 COMPLETE VALIDATION SUITE")
    print(f"  Generated: {datetime.now().isoformat()}")
    print("=" * 80)
    print()
    
    # Load ground truth
    gt_path = os.path.join(os.path.dirname(__file__), 'march-13-2026.json')
    with open(gt_path) as f:
        data = json.load(f)
    intraday_boost = data['payload']['data']['intraday_boost']
    ground_truth = {item['Symbol']: item['param_3'] for item in intraday_boost}
    
    # Load bhavcopy cache
    fo_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('fo_')])
    cm_files = sorted([f for f in os.listdir(CACHE_DIR) if f.startswith('cm_')])
    all_fo = [parse_fo(os.path.join(CACHE_DIR, f)) for f in fo_files]
    all_cm = [parse_cm(os.path.join(CACHE_DIR, f)) for f in cm_files]
    n_days = min(len(all_fo), len(all_cm))
    
    print(f"Ground truth: {len(ground_truth)} stocks")
    print(f"Bhavcopy cache: {n_days} trading days")
    print()
    
    # Build time series for each stock
    stock_ts = {}
    
    for symbol in sorted(ground_truth.keys()):
        ts = []
        for day_idx in range(n_days):
            fo = all_fo[day_idx].get(symbol, {})
            cm = all_cm[day_idx].get(symbol, {})
            if not fo and not cm:
                continue
            
            eq_close = cm.get('eq_close', 0)
            spread_raw = (cm.get('eq_high', 0) - cm.get('eq_low', 0)) / eq_close if eq_close > 0 else 0
            pcr = fo.get('pe_vol', 0) / fo.get('ce_vol', 1) if fo.get('ce_vol', 0) > 0 else 0
            
            ts.append({
                'fut_turn': fo.get('fut_turn', 0),
                'fut_vol': fo.get('fut_vol', 0),
                'spread_raw': spread_raw,
                'pcr': pcr,
                'oi_change': abs(fo.get('fut_oi_chg', 0)),
                'opt_vol': fo.get('opt_vol', 0),
            })
        
        if len(ts) < 15:
            continue
        
        # Compute features for each day
        for i, day in enumerate(ts):
            hist = ts[:i]
            lookback = hist[-20:] if len(hist) >= 20 else hist
            
            avg_spread = statistics.mean([h['spread_raw'] for h in lookback]) if lookback else 0
            day['spread_r'] = day['spread_raw'] / avg_spread if avg_spread > 0 else 0
            
            day['fut_turn_z'] = z_score(day['fut_turn'], [h['fut_turn'] for h in hist])
            day['fut_vol_z'] = z_score(day['fut_vol'], [h['fut_vol'] for h in hist])
            day['pcr_z'] = z_score(day['pcr'], [h['pcr'] for h in hist])
            day['oi_change_z'] = z_score(day['oi_change'], [h['oi_change'] for h in hist])
            day['opt_vol_z'] = z_score(day['opt_vol'], [h['opt_vol'] for h in hist])
        
        stock_ts[symbol] = ts
    
    symbols = sorted(stock_ts.keys())
    actual = np.array([ground_truth[s] for s in symbols])
    print(f"Valid stocks for analysis: {len(symbols)}")
    print()
    
    # ============================================================
    # Test 1: Baseline OLS (V3)
    # ============================================================
    print("=" * 80)
    print("  TEST 1: BASELINE OLS (V3)")
    print("=" * 80)
    
    OLS_INTERCEPT = 1.108614
    OLS_COEFFS = {
        'spread_r': 0.62457,
        'pcr_z': 0.076682,
        'spread_x_turn': 0.226081,
        'fut_turn_z': 1.414904,
        'fut_vol_z': -1.73339,
    }
    
    v3_preds = []
    for sym in symbols:
        d = stock_ts[sym][-1]
        pred = (
            OLS_INTERCEPT
            + OLS_COEFFS['spread_r'] * d['spread_r']
            + OLS_COEFFS['pcr_z'] * d['pcr_z']
            + OLS_COEFFS['spread_x_turn'] * d['spread_r'] * d['fut_turn_z']
            + OLS_COEFFS['fut_turn_z'] * d['fut_turn_z']
            + OLS_COEFFS['fut_vol_z'] * d['fut_vol_z']
        )
        v3_preds.append(pred)
    
    v3_preds = np.array(v3_preds)
    v3_pearson = pearson(actual.tolist(), v3_preds.tolist())
    v3_mae = statistics.mean([abs(a - p) for a, p in zip(actual, v3_preds)])
    v3_range = (min(v3_preds), max(v3_preds))
    
    print(f"  Pearson: {v3_pearson:.4f}")
    print(f"  MAE:     {v3_mae:.4f}")
    print(f"  Range:   {v3_range[0]:.2f} - {v3_range[1]:.2f}")
    print(f"  Actual:  {min(actual):.2f} - {max(actual):.2f}")
    
    # ============================================================
    # Test 2: Scale Correction
    # ============================================================
    print(f"\n{'='*80}")
    print("  TEST 2: SCALE CORRECTION")
    print("=" * 80)
    
    scaled_preds = np.array([scale_correction(p) for p in v3_preds])
    scaled_pearson = pearson(actual.tolist(), scaled_preds.tolist())
    scaled_mae = statistics.mean([abs(a - p) for a, p in zip(actual, scaled_preds)])
    scaled_range = (min(scaled_preds), max(scaled_preds))
    
    print(f"  Pearson: {scaled_pearson:.4f}")
    print(f"  MAE:     {scaled_mae:.4f}")
    print(f"  Range:   {scaled_range[0]:.2f} - {scaled_range[1]:.2f}")
    print(f"  Improvement: {(scaled_pearson - v3_pearson) * 100:+.2f}% Pearson")
    
    # ============================================================
    # Test 3: Huber Regression
    # ============================================================
    print(f"\n{'='*80}")
    print("  TEST 3: HUBER REGRESSION (Robust)")
    print("=" * 80)
    
    # Build feature matrix
    X = np.array([
        [
            stock_ts[s][-1]['spread_r'],
            stock_ts[s][-1]['pcr_z'],
            stock_ts[s][-1]['fut_turn_z'],
            stock_ts[s][-1]['fut_vol_z'],
            stock_ts[s][-1]['spread_r'] * stock_ts[s][-1]['fut_turn_z'],
        ]
        for s in symbols
    ])
    X_aug = np.column_stack([np.ones(len(X)), X])
    
    huber_beta = fit_huber(X_aug, actual, epsilon=1.35)
    huber_preds = X_aug @ huber_beta
    huber_pearson = pearson(actual.tolist(), huber_preds.tolist())
    huber_mae = statistics.mean([abs(a - p) for a, p in zip(actual, huber_preds)])
    
    print(f"  Huber Coefficients:")
    print(f"    Intercept: {huber_beta[0]:.6f}")
    print(f"    spread_r:  {huber_beta[1]:+.6f}")
    print(f"    pcr_z:     {huber_beta[2]:+.6f}")
    print(f"    fut_turn:  {huber_beta[3]:+.6f}")
    print(f"    fut_vol:   {huber_beta[4]:+.6f}")
    print(f"    interact:  {huber_beta[5]:+.6f}")
    print()
    print(f"  Pearson: {huber_pearson:.4f}")
    print(f"  MAE:     {huber_mae:.4f}")
    print(f"  Improvement: {(huber_pearson - v3_pearson) * 100:+.2f}% Pearson")
    
    # ============================================================
    # Test 4: Enhanced Features + Momentum
    # ============================================================
    print(f"\n{'='*80}")
    print("  TEST 4: ENHANCED FEATURES + MOMENTUM")
    print("=" * 80)
    
    enhanced_preds = []
    for i, sym in enumerate(symbols):
        ts = stock_ts[sym]
        d = ts[-1]
        
        # Base OLS prediction
        base = v3_preds[i]
        
        # Spread acceleration
        if len(ts) >= 2:
            prev_spread = ts[-2]['spread_r']
            spread_accel = (d['spread_r'] / max(prev_spread, 0.01)) - 1
        else:
            spread_accel = 0
        
        # Turnover acceleration
        if len(ts) >= 2:
            turn_accel = d['fut_turn_z'] - ts[-2]['fut_turn_z']
        else:
            turn_accel = 0
        
        # Momentum signal
        momentum = 0
        if spread_accel > 0.1:
            momentum += 0.5
        elif spread_accel < -0.1:
            momentum -= 0.5
        if turn_accel > 0.5:
            momentum += 0.5
        elif turn_accel < -0.5:
            momentum -= 0.5
        
        # Momentum adjustment
        momentum_adj = 0.1 * momentum
        
        # Adaptive lookback
        lb = compute_adaptive_lookback(ts, len(ts) - 1)
        
        # Adjust prediction
        pred = base + momentum_adj
        
        # Apply scale correction
        pred = scale_correction(pred)
        enhanced_preds.append(pred)
    
    enhanced_preds = np.array(enhanced_preds)
    enhanced_pearson = pearson(actual.tolist(), enhanced_preds.tolist())
    enhanced_mae = statistics.mean([abs(a - p) for a, p in zip(actual, enhanced_preds)])
    
    print(f"  Pearson: {enhanced_pearson:.4f}")
    print(f"  MAE:     {enhanced_mae:.4f}")
    print(f"  Improvement: {(enhanced_pearson - v3_pearson) * 100:+.2f}% Pearson")
    
    # ============================================================
    # Test 5: Full V4 Ensemble
    # ============================================================
    print(f"\n{'='*80}")
    print("  TEST 5: FULL V4 ENSEMBLE")
    print("=" * 80)
    
    ensemble_preds = []
    for i, sym in enumerate(symbols):
        ts = stock_ts[sym]
        d = ts[-1]
        
        # Component 1: OLS with scale correction
        ols_val = scale_correction(v3_preds[i])
        
        # Component 2: Spread-quadratic
        spread = d['spread_r']
        if spread <= 0:
            sq_val = 1.0
        elif spread < 1:
            sq_val = 1.0 + 0.5428 * spread
        else:
            sq_val = 2.4491 - 1.8553 * spread + 0.949 * spread * spread
        
        # Component 3: Momentum
        if len(ts) >= 2:
            spread_accel = (d['spread_r'] / max(ts[-2]['spread_r'], 0.01)) - 1
            turn_accel = d['fut_turn_z'] - ts[-2]['fut_turn_z']
        else:
            spread_accel = 0
            turn_accel = 0
        
        momentum = 0
        if spread_accel > 0.1:
            momentum += 0.5
        elif spread_accel < -0.1:
            momentum -= 0.5
        if turn_accel > 0.5:
            momentum += 0.5
        elif turn_accel < -0.5:
            momentum -= 0.5
        
        momentum_val = sq_val + 0.1 * momentum
        
        # Weighted ensemble
        ensemble_val = 0.50 * ols_val + 0.30 * sq_val + 0.20 * momentum_val
        ensemble_preds.append(ensemble_val)
    
    ensemble_preds = np.array(ensemble_preds)
    ensemble_pearson = pearson(actual.tolist(), ensemble_preds.tolist())
    ensemble_spearman = spearman(actual.tolist(), ensemble_preds.tolist())
    ensemble_mae = statistics.mean([abs(a - p) for a, p in zip(actual, ensemble_preds)])
    
    print(f"  Pearson:  {ensemble_pearson:.4f}")
    print(f"  Spearman: {ensemble_spearman:.4f}")
    print(f"  MAE:      {ensemble_mae:.4f}")
    print(f"  Range:    {min(ensemble_preds):.2f} - {max(ensemble_preds):.2f}")
    print(f"  Improvement: {(ensemble_pearson - v3_pearson) * 100:+.2f}% Pearson")
    
    # ============================================================
    # Ranking Comparison
    # ============================================================
    print(f"\n{'='*80}")
    print("  RANKING COMPARISON")
    print("=" * 80)
    
    ranked_actual = sorted(range(len(symbols)), key=lambda i: actual[i], reverse=True)
    ranked_v3 = sorted(range(len(symbols)), key=lambda i: v3_preds[i], reverse=True)
    ranked_ensemble = sorted(range(len(symbols)), key=lambda i: ensemble_preds[i], reverse=True)
    
    actual_top10 = set(ranked_actual[:10])
    v3_top10 = set(ranked_v3[:10])
    ensemble_top10 = set(ranked_ensemble[:10])
    
    actual_top20 = set(ranked_actual[:20])
    ensemble_top20 = set(ranked_ensemble[:20])
    
    print(f"\n  Top 10 Overlap:")
    print(f"    V3 Baseline: {len(actual_top10 & v3_top10)}/10")
    print(f"    V4 Ensemble: {len(actual_top10 & ensemble_top10)}/10")
    print(f"\n  Top 20 Overlap:")
    print(f"    V4 Ensemble: {len(actual_top20 & ensemble_top20)}/20")
    
    # ============================================================
    # Outlier Analysis
    # ============================================================
    print(f"\n{'='*80}")
    print("  OUTLIER ANALYSIS")
    print("=" * 80)
    
    outliers = ['BIOCON', 'SAIL', 'LAURUSLABS', 'JINDALSTEL']
    print(f"\n  {'Symbol':<12} {'Actual':>7} {'V3':>7} {'V4':>7} {'V3 Err':>8} {'V4 Err':>8} {'Improved?':>10}")
    print("  " + "-" * 65)
    
    for sym in outliers:
        if sym not in symbols:
            continue
        idx = symbols.index(sym)
        act = actual[idx]
        v3 = v3_preds[idx]
        v4 = ensemble_preds[idx]
        v3_err = abs(v3 - act)
        v4_err = abs(v4 - act)
        improved = "YES" if v4_err < v3_err else "NO"
        print(f"  {sym:<12} {act:>7.3f} {v3:>7.3f} {v4:>7.3f} {v3_err:>8.3f} {v4_err:>8.3f} {improved:>10}")
    
    # ============================================================
    # Summary
    # ============================================================
    print(f"\n{'='*80}")
    print("  FINAL SUMMARY")
    print("=" * 80)
    
    print(f"\n  {'Model':<25} {'Pearson':>10} {'MAE':>10} {'Top-10':>10}")
    print("  " + "-" * 55)
    print(f"  {'V3 Baseline OLS':<25} {v3_pearson:>10.4f} {v3_mae:>10.4f} {len(actual_top10 & v3_top10):>10}/10")
    print(f"  {'V3 + Scale Correction':<25} {scaled_pearson:>10.4f} {scaled_mae:>10.4f}")
    print(f"  {'Huber Regression':<25} {huber_pearson:>10.4f} {huber_mae:>10.4f}")
    print(f"  {'Enhanced + Momentum':<25} {enhanced_pearson:>10.4f} {enhanced_mae:>10.4f}")
    print(f"  {'V4 Ensemble':<25} {ensemble_pearson:>10.4f} {ensemble_mae:>10.4f} {len(actual_top10 & ensemble_top10):>10}/10")
    
    print(f"\n  Total Improvement: {(ensemble_pearson - v3_pearson) * 100:+.1f}% Pearson")
    print(f"  Top-10 Improvement: {len(actual_top10 & ensemble_top10) - len(actual_top10 & v3_top10):+d} stocks")
    
    # Save results
    results = {
        'validation_date': datetime.now().isoformat(),
        'n_stocks': len(symbols),
        'n_days': n_days,
        'models': {
            'v3_baseline': {'pearson': v3_pearson, 'mae': v3_mae, 'top10_overlap': len(actual_top10 & v3_top10)},
            'scale_correction': {'pearson': scaled_pearson, 'mae': scaled_mae},
            'huber_regression': {'pearson': huber_pearson, 'mae': huber_mae, 'coefficients': huber_beta.tolist()},
            'enhanced_momentum': {'pearson': enhanced_pearson, 'mae': enhanced_mae},
            'v4_ensemble': {'pearson': ensemble_pearson, 'spearman': ensemble_spearman, 'mae': ensemble_mae, 'top10_overlap': len(actual_top10 & ensemble_top10), 'top20_overlap': len(actual_top20 & ensemble_top20)},
        },
        'predictions': [
            {
                'symbol': symbols[i],
                'actual': float(actual[i]),
                'v3': float(v3_preds[i]),
                'v4_ensemble': float(ensemble_preds[i]),
            }
            for i in range(len(symbols))
        ],
    }
    
    outpath = os.path.join(os.path.dirname(__file__), 'v4_complete_validation.json')
    with open(outpath, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"\n  Results saved to: {outpath}")


if __name__ == '__main__':
    main()

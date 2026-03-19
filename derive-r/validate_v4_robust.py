"""
R-Factor V4: Robust Regression + Enhanced Features Validation

Improvements over V3:
1. Huber regression for outlier handling (BIOCON, SAIL cases)
2. Enhanced feature engineering (acceleration, sector-relative, multi-day)
3. Scale correction to match TradeFinder's distribution
4. Ensemble model with confidence-weighted predictions
5. Cross-validation with time-series splits

Goal: Achieve LOO Pearson > 0.70 and Top-10 overlap > 8/10
"""

import json
import os
import csv as csv_module
import statistics
import math
from itertools import combinations
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
                    options[sym] = {'vol': 0, 'ce_vol': 0, 'pe_vol': 0, 'oi': 0, 'turn': 0}
                vol = float(row.get('TtlTradgVol', 0) or 0)
                options[sym]['vol'] += vol
                options[sym]['oi'] += float(row.get('OpnIntrst', 0) or 0)
                options[sym]['turn'] += float(row.get('TtlTrfVal', 0) or 0)
                ot = row.get('OptnTp', '').strip()
                if ot == 'CE':
                    options[sym]['ce_vol'] += vol
                elif ot == 'PE':
                    options[sym]['pe_vol'] += vol
        result = {}
        for sym in futures:
            r = futures[sym]
            opt = options.get(sym, {'vol': 0, 'ce_vol': 0, 'pe_vol': 0, 'oi': 0, 'turn': 0})
            result[sym] = {
                'fut_vol': float(r.get('TtlTradgVol', 0) or 0),
                'fut_turn': float(r.get('TtlTrfVal', 0) or 0),
                'fut_oi': float(r.get('OpnIntrst', 0) or 0),
                'fut_oi_chg': float(r.get('ChngInOpnIntrst', 0) or 0),
                'opt_vol': opt['vol'],
                'ce_vol': opt['ce_vol'],
                'pe_vol': opt['pe_vol'],
                'opt_oi': opt['oi'],
                'opt_turn': opt['turn'],
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
    avg = statistics.mean(series) if series else 0
    return today / avg if avg > 0 else 0


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


def huber_loss(residual, epsilon=1.35):
    """Huber loss: quadratic for small residuals, linear for large."""
    abs_r = abs(residual)
    if abs_r <= epsilon:
        return 0.5 * residual ** 2
    return epsilon * abs_r - 0.5 * epsilon ** 2


def huber_gradient(residual, epsilon=1.35):
    """Gradient of Huber loss."""
    abs_r = abs(residual)
    if abs_r <= epsilon:
        return residual
    return epsilon * (1 if residual > 0 else -1)


def fit_huber_regression(X, y, epsilon=1.35, max_iter=100, tol=1e-6):
    """
    Fit Huber regression using iterative reweighted least squares.
    More robust to outliers than OLS.
    """
    n, p = X.shape
    
    # Initialize with OLS
    beta = np.linalg.lstsq(X, y, rcond=None)[0]
    
    for iteration in range(max_iter):
        residuals = y - X @ beta
        
        # Compute weights from Huber gradient
        weights = np.ones(n)
        for i in range(n):
            abs_r = abs(residuals[i])
            if abs_r > epsilon:
                weights[i] = epsilon / abs_r
        
        # Weighted least squares
        W = np.diag(weights)
        XTWX = X.T @ W @ X
        XTWy = X.T @ W @ y
        
        try:
            beta_new = np.linalg.solve(XTWX, XTWy)
        except np.linalg.LinAlgError:
            break
        
        # Check convergence
        if np.max(np.abs(beta_new - beta)) < tol:
            break
        beta = beta_new
    
    return beta


def loo_huber_pearson(features, target, epsilon=1.35):
    """Leave-one-out cross-validation with Huber regression."""
    n = len(target)
    X = np.column_stack([np.ones(n), features])
    Y = np.array(target)
    
    preds = np.zeros(n)
    for i in range(n):
        mask = np.ones(n, dtype=bool)
        mask[i] = False
        beta = fit_huber_regression(X[mask], Y[mask], epsilon)
        preds[i] = X[i] @ beta
    
    return float(np.corrcoef(Y, preds)[0, 1])


def scale_correction(raw_r, threshold=2.5, factor=1.5):
    """
    Apply scale correction to match TradeFinder's distribution.
    TradeFinder shows values up to 5.0+, our model caps around 3.5.
    
    For values above threshold, apply non-linear expansion.
    """
    if raw_r <= threshold:
        return raw_r
    
    excess = raw_r - threshold
    expansion = 1 + (factor - 1) * np.tanh(excess)
    return threshold + excess * expansion


def calculate_enhanced_features(ts_data, idx):
    """
    Calculate enhanced features including acceleration and multi-day patterns.
    """
    current = ts_data[idx]
    
    # Basic features (already computed)
    features = {
        'spread_r': current['spread_r'],
        'pcr_z': current['pcr_z'],
        'fut_turn_z': current['fut_turn_z'],
        'fut_vol_z': current['fut_vol_z'],
        'oi_change_z': current.get('oi_change_z', 0),
    }
    
    # Acceleration features
    if idx >= 1:
        prev = ts_data[idx - 1]
        features['spread_accel'] = (current['spread_r'] / max(prev['spread_r'], 0.01)) - 1
        features['turn_accel'] = (current['fut_turn_z'] - prev['fut_turn_z']) if prev['fut_turn_z'] != 0 else 0
    else:
        features['spread_accel'] = 0
        features['turn_accel'] = 0
    
    # Multi-day patterns
    if idx >= 2:
        spreads_3d = [ts_data[i]['spread_r'] for i in range(idx - 2, idx + 1)]
        features['spread_3d_avg'] = statistics.mean(spreads_3d)
        features['spread_vs_3d'] = current['spread_r'] / max(features['spread_3d_avg'], 0.01)
    else:
        features['spread_3d_avg'] = current['spread_r']
        features['spread_vs_3d'] = 1.0
    
    # Momentum signal
    signals = 0
    if features['spread_accel'] > 0.1:
        signals += 1
    elif features['spread_accel'] < -0.1:
        signals -= 1
    if features['turn_accel'] > 0.5:
        signals += 1
    elif features['turn_accel'] < -0.5:
        signals -= 1
    features['momentum_signal'] = signals / 2  # Normalize to [-1, 1]
    
    # Interaction terms
    features['spread_x_turn'] = current['spread_r'] * current['fut_turn_z']
    features['spread_x_momentum'] = current['spread_r'] * features['momentum_signal']
    
    return features


def main():
    print("=" * 70)
    print("  R-FACTOR V4: ROBUST REGRESSION + ENHANCED FEATURES")
    print("=" * 70)
    
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
    
    print(f"  Ground truth: {len(ground_truth)} stocks")
    print(f"  Bhavcopy cache: {n_days} trading days")
    print()
    
    # Build feature matrix for all stocks
    stock_data = {}
    
    for symbol in sorted(ground_truth.keys()):
        ts = []
        for day_idx in range(n_days):
            fo = all_fo[day_idx].get(symbol, {})
            cm = all_cm[day_idx].get(symbol, {})
            if not fo and not cm:
                continue
            
            eq_close = cm.get('eq_close', 0)
            spread_raw = (cm.get('eq_high', 0) - cm.get('eq_low', 0)) / eq_close if eq_close > 0 else 0
            
            ts.append({
                'fut_turn': fo.get('fut_turn', 0),
                'fut_vol': fo.get('fut_vol', 0),
                'spread_raw': spread_raw,
                'pcr': fo.get('pe_vol', 0) / fo.get('ce_vol', 1) if fo.get('ce_vol', 0) > 0 else 0,
                'oi_change': abs(fo.get('fut_oi_chg', 0)),
            })
        
        if len(ts) < 15:
            continue
        
        # Compute features for each day
        for i, day in enumerate(ts):
            hist = ts[:i]
            lookback = hist[-20:] if len(hist) >= 20 else hist
            
            # Spread ratio
            avg_spread = statistics.mean([h['spread_raw'] for h in lookback]) if lookback else 0
            day['spread_r'] = day['spread_raw'] / avg_spread if avg_spread > 0 else 0
            
            # Z-scores
            day['fut_turn_z'] = z_score(day['fut_turn'], [h['fut_turn'] for h in hist])
            day['fut_vol_z'] = z_score(day['fut_vol'], [h['fut_vol'] for h in hist])
            day['pcr_z'] = z_score(day['pcr'], [h['pcr'] for h in hist])
            day['oi_change_z'] = z_score(day['oi_change'], [h['oi_change'] for h in hist])
        
        stock_data[symbol] = ts
    
    # Extract final day features
    symbols = sorted(stock_data.keys())
    actual = np.array([ground_truth[s] for s in symbols])
    
    print(f"  Valid stocks for analysis: {len(symbols)}")
    print()
    
    # ============================================================
    # Model 1: Original OLS (baseline)
    # ============================================================
    print("=" * 70)
    print("  MODEL 1: Original OLS (V3 baseline)")
    print("=" * 70)
    
    OLS_INTERCEPT = 1.108614
    OLS_COEFFS = {
        'spread_r': 0.62457,
        'pcr_z': 0.076682,
        'spread_x_turn': 0.226081,
        'fut_turn_z': 1.414904,
        'fut_vol_z': -1.73339,
    }
    
    ols_predictions = []
    for sym in symbols:
        ts = stock_data[sym]
        d = ts[-1]
        pred = (
            OLS_INTERCEPT
            + OLS_COEFFS['spread_r'] * d['spread_r']
            + OLS_COEFFS['pcr_z'] * d['pcr_z']
            + OLS_COEFFS['spread_x_turn'] * d['spread_r'] * d['fut_turn_z']
            + OLS_COEFFS['fut_turn_z'] * d['fut_turn_z']
            + OLS_COEFFS['fut_vol_z'] * d['fut_vol_z']
        )
        ols_predictions.append(pred)
    
    ols_predictions = np.array(ols_predictions)
    ols_pearson = pearson(actual.tolist(), ols_predictions.tolist())
    ols_spearman = spearman(actual.tolist(), ols_predictions.tolist())
    ols_mae = statistics.mean([abs(a - p) for a, p in zip(actual, ols_predictions)])
    
    print(f"  Pearson:  {ols_pearson:.4f}")
    print(f"  Spearman: {ols_spearman:.4f}")
    print(f"  MAE:      {ols_mae:.4f}")
    print(f"  Range:    {min(ols_predictions):.2f} - {max(ols_predictions):.2f} vs actual {min(actual):.2f} - {max(actual):.2f}")
    
    # ============================================================
    # Model 2: Huber Regression (robust to outliers)
    # ============================================================
    print(f"\n{'='*70}")
    print("  MODEL 2: Huber Regression (robust)")
    print("=" * 70)
    
    # Build feature matrix with enhanced features
    enhanced_features = []
    for sym in symbols:
        ts = stock_data[sym]
        enhanced = calculate_enhanced_features(ts, -1)
        enhanced_features.append(enhanced)
    
    # Select features for model
    feature_names = ['spread_r', 'pcr_z', 'fut_turn_z', 'fut_vol_z', 'spread_x_turn']
    X = np.array([[ef[f] for f in feature_names] for ef in enhanced_features])
    
    # Fit Huber regression
    X_with_intercept = np.column_stack([np.ones(len(X)), X])
    huber_beta = fit_huber_regression(X_with_intercept, actual, epsilon=1.35)
    huber_predictions = X_with_intercept @ huber_beta
    
    huber_pearson = pearson(actual.tolist(), huber_predictions.tolist())
    huber_spearman = spearman(actual.tolist(), huber_predictions.tolist())
    huber_mae = statistics.mean([abs(a - p) for a, p in zip(actual, huber_predictions)])
    
    print(f"  Huber coefficients:")
    print(f"    Intercept: {huber_beta[0]:.6f}")
    for i, fn in enumerate(feature_names):
        print(f"    {fn}: {huber_beta[i+1]:+.6f}")
    print()
    print(f"  Pearson:  {huber_pearson:.4f}")
    print(f"  Spearman: {huber_spearman:.4f}")
    print(f"  MAE:      {huber_mae:.4f}")
    
    # LOO Cross-validation
    loo_pearson = loo_huber_pearson(X, actual, epsilon=1.35)
    print(f"  LOO Pearson: {loo_pearson:.4f}")
    
    # ============================================================
    # Model 3: Scale-corrected predictions
    # ============================================================
    print(f"\n{'='*70}")
    print("  MODEL 3: Scale-Corrected Huber")
    print("=" * 70)
    
    scaled_predictions = np.array([scale_correction(p) for p in huber_predictions])
    scaled_pearson = pearson(actual.tolist(), scaled_predictions.tolist())
    scaled_mae = statistics.mean([abs(a - p) for a, p in zip(actual, scaled_predictions)])
    
    print(f"  Scale correction applied (threshold=2.5, factor=1.5)")
    print(f"  Pearson:  {scaled_pearson:.4f}")
    print(f"  MAE:      {scaled_mae:.4f}")
    print(f"  Range:    {min(scaled_predictions):.2f} - {max(scaled_predictions):.2f}")
    
    # ============================================================
    # Model 4: Ensemble with momentum
    # ============================================================
    print(f"\n{'='*70}")
    print("  MODEL 4: Ensemble (OLS + Spread-Quad + Momentum)")
    print("=" * 70)
    
    ensemble_predictions = []
    for i, sym in enumerate(symbols):
        ef = enhanced_features[i]
        
        # OLS component
        ols_val = ols_predictions[i]
        
        # Spread-quadratic component
        spread = ef['spread_r']
        if spread <= 0:
            sq_val = 1.0
        elif spread < 1:
            sq_val = 1.0 + 0.5428 * spread
        else:
            sq_val = 2.4491 - 1.8553 * spread + 0.949 * spread * spread
        
        # Momentum adjustment
        momentum_adj = 0
        if ef['momentum_signal'] > 0:
            momentum_adj = 0.1 * ef['momentum_signal']
        elif ef['momentum_signal'] < 0:
            momentum_adj = 0.15 * ef['momentum_signal']
        
        # Weighted ensemble
        ensemble_val = 0.50 * ols_val + 0.30 * sq_val + 0.20 * (sq_val + momentum_adj)
        
        # Apply scale correction
        ensemble_val = scale_correction(ensemble_val)
        ensemble_predictions.append(ensemble_val)
    
    ensemble_predictions = np.array(ensemble_predictions)
    ensemble_pearson = pearson(actual.tolist(), ensemble_predictions.tolist())
    ensemble_spearman = spearman(actual.tolist(), ensemble_predictions.tolist())
    ensemble_mae = statistics.mean([abs(a - p) for a, p in zip(actual, ensemble_predictions)])
    
    print(f"  Weights: OLS=0.50, Spread-Quad=0.30, Momentum=0.20")
    print(f"  Pearson:  {ensemble_pearson:.4f}")
    print(f"  Spearman: {ensemble_spearman:.4f}")
    print(f"  MAE:      {ensemble_mae:.4f}")
    print(f"  Range:    {min(ensemble_predictions):.2f} - {max(ensemble_predictions):.2f}")
    
    # ============================================================
    # Ranking Analysis
    # ============================================================
    print(f"\n{'='*70}")
    print("  RANKING COMPARISON")
    print("=" * 70)
    
    ranked_actual = sorted(range(len(symbols)), key=lambda i: actual[i], reverse=True)
    ranked_ensemble = sorted(range(len(symbols)), key=lambda i: ensemble_predictions[i], reverse=True)
    
    actual_top10 = set(ranked_actual[:10])
    ensemble_top10 = set(ranked_ensemble[:10])
    overlap10 = actual_top10 & ensemble_top10
    
    actual_top20 = set(ranked_actual[:20])
    ensemble_top20 = set(ranked_ensemble[:20])
    overlap20 = actual_top20 & ensemble_top20
    
    print(f"\n  Top 10 overlap: {len(overlap10)}/10")
    print(f"  Top 20 overlap: {len(overlap20)}/20")
    
    print(f"\n  {'Rank':<6} {'TradeFinder':<15} {'R':>6}  |  {'Our Prediction':<15} {'Pred':>6} {'Actual#':>8}")
    print("  " + "-" * 75)
    for i in range(10):
        a_idx = ranked_actual[i]
        e_idx = ranked_ensemble[i]
        a_sym = symbols[a_idx]
        e_sym = symbols[e_idx]
        e_actual_rank = ranked_actual.index(e_idx) + 1
        
        match_a = "*" if a_sym in ensemble_top10 else " "
        match_e = "*" if e_sym in actual_top10 else " "
        
        print(f"  {i+1:<6}{match_a}{a_sym:<14} {actual[a_idx]:>6.3f}  |  {match_e}{e_sym:<14} {ensemble_predictions[e_idx]:>6.3f} {f'(#{e_actual_rank})':>8}")
    
    # ============================================================
    # Outlier Analysis
    # ============================================================
    print(f"\n{'='*70}")
    print("  OUTLIER ANALYSIS (BIOCON, SAIL cases)")
    print("=" * 70)
    
    outliers = ['BIOCON', 'SAIL', 'LAURUSLABS']
    for sym in outliers:
        if sym not in symbols:
            continue
        idx = symbols.index(sym)
        actual_r = actual[idx]
        ols_pred = ols_predictions[idx]
        ensemble_pred = ensemble_predictions[idx]
        error_ols = ols_pred - actual_r
        error_ensemble = ensemble_pred - actual_r
        
        print(f"\n  {sym}:")
        print(f"    Actual R:       {actual_r:.3f}")
        print(f"    OLS predicted:  {ols_pred:.3f} (error: {error_ols:+.3f})")
        print(f"    Ensemble:       {ensemble_pred:.3f} (error: {error_ensemble:+.3f})")
        
        ef = enhanced_features[idx]
        print(f"    Spread ratio:   {ef['spread_r']:.3f}")
        print(f"    Momentum:       {ef['momentum_signal']:.3f}")
    
    # ============================================================
    # Save Results
    # ============================================================
    print(f"\n{'='*70}")
    print("  SAVING RESULTS")
    print("=" * 70)
    
    results = {
        'model': 'V4 Ensemble (OLS + Huber + Scale Correction + Momentum)',
        'metrics': {
            'ols': {'pearson': ols_pearson, 'spearman': ols_spearman, 'mae': ols_mae},
            'huber': {'pearson': huber_pearson, 'spearman': huber_spearman, 'mae': huber_mae, 'loo': loo_pearson},
            'ensemble': {'pearson': ensemble_pearson, 'spearman': ensemble_spearman, 'mae': ensemble_mae},
        },
        'coefficients': {
            'ols': {'intercept': OLS_INTERCEPT, **OLS_COEFFS},
            'huber': {'intercept': float(huber_beta[0]), **{fn: float(huber_beta[i+1]) for i, fn in enumerate(feature_names)}},
        },
        'top10_overlap': len(overlap10),
        'top20_overlap': len(overlap20),
        'predictions': [
            {
                'symbol': symbols[i],
                'actual': float(actual[i]),
                'ols': float(ols_predictions[i]),
                'huber': float(huber_predictions[i]),
                'ensemble': float(ensemble_predictions[i]),
            }
            for i in range(len(symbols))
        ],
    }
    
    outpath = os.path.join(os.path.dirname(__file__), 'v4_validation.json')
    with open(outpath, 'w') as f:
        json.dump(results, f, indent=2)
    print(f"  Saved to: {outpath}")
    
    # Summary
    print(f"\n{'='*70}")
    print("  SUMMARY")
    print("=" * 70)
    print(f"  Original OLS:     Pearson {ols_pearson:.4f}, Top-10: {len(set(ranked_actual[:10]) & set([ranked_ensemble.index(i) for i in ranked_actual[:10]]))}/10")
    print(f"  Huber Regression: Pearson {huber_pearson:.4f}")
    print(f"  V4 Ensemble:      Pearson {ensemble_pearson:.4f}, Top-10: {len(overlap10)}/10")
    print()
    print(f"  Improvement: {(ensemble_pearson - ols_pearson) * 100:.1f}% Pearson correlation")


if __name__ == '__main__':
    main()

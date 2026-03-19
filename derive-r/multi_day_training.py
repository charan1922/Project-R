"""
R-Factor Multi-Day Training Infrastructure

This module enables training R-Factor models on data from multiple trading days,
which provides:
1. More robust coefficient estimation
2. Better handling of day-specific anomalies
3. Time-series cross-validation for realistic performance estimates
4. Detection of regime-specific patterns

Usage:
1. Capture TradeFinder ground truth for multiple days
2. Build panel dataset with all features for each stock-day
3. Train models with time-series cross-validation
4. Select best model based on out-of-sample performance
"""

import json
import os
import csv as csv_module
import statistics
import math
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import numpy as np

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')
GROUND_TRUTH_DIR = os.path.join(os.path.dirname(__file__), 'ground_truth')


def parse_fo(filepath: str) -> Dict:
    """Parse F&O bhavcopy CSV."""
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
                    options[sym] = {'vol': 0, 'ce_vol': 0, 'pe_vol': 0}
                vol = float(row.get('TtlTradgVol', 0) or 0)
                options[sym]['vol'] += vol
                ot = row.get('OptnTp', '').strip()
                if ot == 'CE':
                    options[sym]['ce_vol'] += vol
                elif ot == 'PE':
                    options[sym]['pe_vol'] += vol
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


def parse_cm(filepath: str) -> Dict:
    """Parse equity bhavcopy CSV."""
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


class MultiDayTrainer:
    """
    Train R-Factor models on multi-day panel data.
    
    Features:
    - Panel dataset construction (stock × day matrix)
    - Time-series cross-validation (train on past, test on future)
    - Rolling window validation (mimics production usage)
    - Regime-specific model training
    """
    
    def __init__(self, cache_dir: str = CACHE_DIR):
        self.cache_dir = cache_dir
        self.bhavcopy_data = {}
        self.ground_truth = {}
        
    def load_bhavcopy_cache(self) -> None:
        """Load all bhavcopy data from cache."""
        fo_files = sorted([f for f in os.listdir(self.cache_dir) if f.startswith('fo_')])
        cm_files = sorted([f for f in os.listdir(self.cache_dir) if f.startswith('cm_')])
        
        for fo_file, cm_file in zip(fo_files, cm_files):
            date_str = fo_file.replace('fo_', '').replace('.csv', '')
            fo_data = parse_fo(os.path.join(self.cache_dir, fo_file))
            cm_data = parse_cm(os.path.join(self.cache_dir, cm_file))
            self.bhavcopy_data[date_str] = {'fo': fo_data, 'cm': cm_data}
        
        print(f"Loaded {len(self.bhavcopy_data)} days of bhavcopy data")
    
    def load_ground_truth(self, truth_dir: str = GROUND_TRUTH_DIR) -> None:
        """
        Load ground truth R-Factor values for multiple days.
        
        Expected format: JSON files named YYYYMMDD.json in ground_truth_dir
        Each file should contain TradeFinder's intraday_boost response.
        """
        if not os.path.exists(truth_dir):
            print(f"Ground truth directory not found: {truth_dir}")
            print("Creating directory structure...")
            os.makedirs(truth_dir, exist_ok=True)
            self._create_sample_ground_truth_template(truth_dir)
            return
        
        for filename in os.listdir(truth_dir):
            if filename.endswith('.json'):
                date_str = filename.replace('.json', '')
                filepath = os.path.join(truth_dir, filename)
                try:
                    with open(filepath) as f:
                        data = json.load(f)
                    
                    # Extract R-Factor from TradeFinder format
                    if 'payload' in data:
                        intraday_boost = data['payload']['data']['intraday_boost']
                        self.ground_truth[date_str] = {
                            item['Symbol']: item['param_3'] 
                            for item in intraday_boost
                        }
                except Exception as e:
                    print(f"Failed to load {filename}: {e}")
        
        print(f"Loaded ground truth for {len(self.ground_truth)} days")
    
    def _create_sample_ground_truth_template(self, truth_dir: str) -> None:
        """Create template for capturing ground truth."""
        template = {
            "_comment": "Capture TradeFinder's intraday_boost API response and save with date as filename",
            "_instructions": [
                "1. Open TradeFinder website during market hours",
                "2. Open browser dev tools, Network tab",
                "3. Find the intraday_boost API call",
                "4. Copy response and save as YYYYMMDD.json",
                "5. The param_3 field contains R-Factor values",
            ],
            "payload": {
                "data": {
                    "intraday_boost": [
                        {"Symbol": "EXAMPLE", "param_0": 0.0, "param_1": 0.0, "param_2": "BULL", "param_3": 2.5},
                    ]
                }
            }
        }
        
        template_path = os.path.join(truth_dir, 'TEMPLATE.json')
        with open(template_path, 'w') as f:
            json.dump(template, f, indent=2)
        print(f"Created template: {template_path}")
    
    def build_panel_dataset(self) -> Tuple[np.ndarray, np.ndarray, List[str], List[str]]:
        """
        Build panel dataset for multi-day training.
        
        Returns:
            X: Feature matrix (n_samples × n_features)
            y: Target R-Factor values
            sample_ids: List of "SYMBOL_DATE" identifiers
            feature_names: List of feature names
        """
        if not self.bhavcopy_data:
            self.load_bhavcopy_cache()
        
        feature_names = [
            'spread_r', 'pcr_z', 'fut_turn_z', 'fut_vol_z',
            'spread_accel', 'turn_accel', 'momentum_signal',
            'spread_x_turn', 'close_position',
        ]
        
        samples = []
        targets = []
        sample_ids = []
        
        dates = sorted(self.bhavcopy_data.keys())
        
        for date_idx, date_str in enumerate(dates):
            if date_str not in self.ground_truth:
                continue
            
            day_data = self.bhavcopy_data[date_str]
            day_truth = self.ground_truth[date_str]
            
            for symbol, r_factor in day_truth.items():
                fo = day_data['fo'].get(symbol, {})
                cm = day_data['cm'].get(symbol, {})
                
                if not fo or not cm:
                    continue
                
                # Compute features
                features = self._compute_features(symbol, date_str, fo, cm)
                if features is None:
                    continue
                
                samples.append([features.get(fn, 0) for fn in feature_names])
                targets.append(r_factor)
                sample_ids.append(f"{symbol}_{date_str}")
        
        X = np.array(samples)
        y = np.array(targets)
        
        print(f"Built panel dataset: {X.shape[0]} samples × {X.shape[1]} features")
        return X, y, sample_ids, feature_names
    
    def _compute_features(self, symbol: str, date_str: str, fo: Dict, cm: Dict) -> Optional[Dict]:
        """Compute features for a stock on a given day."""
        # Get historical data for this stock
        dates = sorted(self.bhavcopy_data.keys())
        try:
            current_idx = dates.index(date_str)
        except ValueError:
            return None
        
        # Build historical series
        hist_spreads = []
        hist_turns = []
        hist_vols = []
        hist_pcrs = []
        
        for prev_date in dates[:current_idx]:
            prev_fo = self.bhavcopy_data[prev_date]['fo'].get(symbol, {})
            prev_cm = self.bhavcopy_data[prev_date]['cm'].get(symbol, {})
            
            if prev_cm and prev_cm.get('eq_close', 0) > 0:
                spread = (prev_cm['eq_high'] - prev_cm['eq_low']) / prev_cm['eq_close']
                hist_spreads.append(spread)
            
            if prev_fo:
                hist_turns.append(prev_fo.get('fut_turn', 0))
                hist_vols.append(prev_fo.get('fut_vol', 0))
                ce = prev_fo.get('ce_vol', 0)
                pe = prev_fo.get('pe_vol', 0)
                hist_pcrs.append(pe / ce if ce > 0 else 0)
        
        if len(hist_spreads) < 10:
            return None
        
        # Current day values
        current_spread = (cm['eq_high'] - cm['eq_low']) / cm['eq_close'] if cm['eq_close'] > 0 else 0
        avg_spread = statistics.mean(hist_spreads[-20:]) if len(hist_spreads) >= 20 else statistics.mean(hist_spreads)
        spread_r = current_spread / avg_spread if avg_spread > 0 else 0
        
        current_turn = fo.get('fut_turn', 0)
        current_vol = fo.get('fut_vol', 0)
        ce = fo.get('ce_vol', 0)
        pe = fo.get('pe_vol', 0)
        current_pcr = pe / ce if ce > 0 else 0
        
        # Z-scores
        def z_score(val, series):
            if len(series) < 2:
                return 0
            m = statistics.mean(series)
            s = statistics.stdev(series)
            return (val - m) / s if s > 0 else 0
        
        turn_z = z_score(current_turn, hist_turns)
        vol_z = z_score(current_vol, hist_vols)
        pcr_z = z_score(current_pcr, hist_pcrs)
        
        # Acceleration features
        spread_accel = 0
        turn_accel = 0
        if len(hist_spreads) >= 2:
            prev_spread = hist_spreads[-1]
            spread_accel = (spread_r - (current_spread / prev_spread)) if prev_spread > 0 else 0
        if len(hist_turns) >= 2:
            turn_accel = turn_z - z_score(hist_turns[-1], hist_turns[:-1])
        
        # Momentum signal
        momentum = 0
        if spread_accel > 0.1:
            momentum += 1
        elif spread_accel < -0.1:
            momentum -= 1
        if turn_accel > 0.5:
            momentum += 1
        elif turn_accel < -0.5:
            momentum -= 1
        momentum = momentum / 2
        
        # Close position
        range_val = cm['eq_high'] - cm['eq_low']
        close_pos = (cm['eq_close'] - cm['eq_low']) / range_val if range_val > 0 else 0.5
        
        return {
            'spread_r': spread_r,
            'pcr_z': pcr_z,
            'fut_turn_z': turn_z,
            'fut_vol_z': vol_z,
            'spread_accel': spread_accel,
            'turn_accel': turn_accel,
            'momentum_signal': momentum,
            'spread_x_turn': spread_r * turn_z,
            'close_position': close_pos,
        }
    
    def train_with_time_series_cv(self, X: np.ndarray, y: np.ndarray, n_splits: int = 5) -> Dict:
        """
        Train model with time-series cross-validation.
        
        Unlike random CV, this respects temporal order:
        - Train on days 1..k, test on day k+1
        - Ensures model doesn't peek into future
        """
        n_samples = len(y)
        fold_size = n_samples // (n_splits + 1)
        
        results = []
        
        for i in range(n_splits):
            train_end = (i + 1) * fold_size
            test_start = train_end
            test_end = test_start + fold_size
            
            if test_end > n_samples:
                break
            
            X_train, y_train = X[:train_end], y[:train_end]
            X_test, y_test = X[test_start:test_end], y[test_start:test_end]
            
            # Fit OLS
            X_train_aug = np.column_stack([np.ones(len(X_train)), X_train])
            X_test_aug = np.column_stack([np.ones(len(X_test)), X_test])
            
            beta = np.linalg.lstsq(X_train_aug, y_train, rcond=None)[0]
            preds = X_test_aug @ beta
            
            # Evaluate
            corr = np.corrcoef(y_test, preds)[0, 1]
            mae = np.mean(np.abs(y_test - preds))
            
            results.append({
                'fold': i + 1,
                'train_size': len(y_train),
                'test_size': len(y_test),
                'pearson': corr,
                'mae': mae,
            })
        
        return {
            'folds': results,
            'avg_pearson': np.mean([r['pearson'] for r in results]),
            'avg_mae': np.mean([r['mae'] for r in results]),
        }
    
    def train_regime_specific_models(self, X: np.ndarray, y: np.ndarray, 
                                      regime_labels: np.ndarray) -> Dict:
        """
        Train separate models for different market regimes.
        
        Regimes: bull, bear, volatile, neutral
        This allows different coefficients for different market conditions.
        """
        models = {}
        
        for regime in np.unique(regime_labels):
            mask = regime_labels == regime
            X_regime = X[mask]
            y_regime = y[mask]
            
            if len(y_regime) < 20:
                continue
            
            X_aug = np.column_stack([np.ones(len(X_regime)), X_regime])
            beta = np.linalg.lstsq(X_aug, y_regime, rcond=None)[0]
            
            preds = X_aug @ beta
            corr = np.corrcoef(y_regime, preds)[0, 1] if len(y_regime) > 1 else 0
            
            models[regime] = {
                'n_samples': len(y_regime),
                'coefficients': beta.tolist(),
                'in_sample_pearson': corr,
            }
        
        return models


def capture_live_ground_truth(output_dir: str = GROUND_TRUTH_DIR) -> None:
    """
    Instructions for capturing live TradeFinder ground truth.
    
    Run this to get the current day's R-Factor values for training.
    """
    print("=" * 70)
    print("  CAPTURING TRADEFINDER GROUND TRUTH")
    print("=" * 70)
    print("""
    Steps to capture today's R-Factor values:
    
    1. Open TradeFinder website (tradefinder.in)
    2. Login and navigate to Intraday Boost page
    3. Open browser DevTools (F12) → Network tab
    4. Refresh the page
    5. Look for 'intraday_boost' API call
    6. Right-click → Copy → Copy Response
    7. Save the response as YYYYMMDD.json in the ground_truth folder
    
    Alternatively, use the API directly:
    
    curl -X GET "https://api.tradefinder.in/intraday_boost" \\
         -H "Authorization: Bearer YOUR_TOKEN" \\
         -o YYYYMMDD.json
    
    Ground truth directory: """ + output_dir)
    print()


def main():
    print("=" * 70)
    print("  R-FACTOR MULTI-DAY TRAINING")
    print("=" * 70)
    print()
    
    trainer = MultiDayTrainer()
    
    # Load ground truth (if available)
    trainer.load_ground_truth()
    
    if not trainer.ground_truth:
        print("\nNo ground truth data found.")
        print("To train on multiple days, capture TradeFinder R-Factor values:")
        capture_live_ground_truth()
        return
    
    # Build panel dataset
    X, y, sample_ids, feature_names = trainer.build_panel_dataset()
    
    if len(y) < 50:
        print(f"\nInsufficient data for training: only {len(y)} samples")
        print("Need ground truth for at least 3 different trading days")
        return
    
    # Train with time-series CV
    print("\n" + "=" * 70)
    print("  TIME-SERIES CROSS-VALIDATION")
    print("=" * 70)
    
    cv_results = trainer.train_with_time_series_cv(X, y, n_splits=5)
    
    print(f"\n  Average Pearson: {cv_results['avg_pearson']:.4f}")
    print(f"  Average MAE:     {cv_results['avg_mae']:.4f}")
    
    print("\n  Fold details:")
    for fold in cv_results['folds']:
        print(f"    Fold {fold['fold']}: Pearson={fold['pearson']:.4f}, MAE={fold['mae']:.4f} "
              f"(train={fold['train_size']}, test={fold['test_size']})")
    
    # Fit final model on all data
    print("\n" + "=" * 70)
    print("  FINAL MODEL (trained on all data)")
    print("=" * 70)
    
    X_aug = np.column_stack([np.ones(len(X)), X])
    final_beta = np.linalg.lstsq(X_aug, y, rcond=None)[0]
    
    print(f"\n  Intercept: {final_beta[0]:.6f}")
    for i, fn in enumerate(feature_names):
        print(f"  {fn}: {final_beta[i+1]:+.6f}")
    
    # Save model
    model_output = {
        'training_date': datetime.now().isoformat(),
        'n_samples': len(y),
        'n_days': len(trainer.ground_truth),
        'feature_names': feature_names,
        'coefficients': {
            'intercept': float(final_beta[0]),
            **{fn: float(final_beta[i+1]) for i, fn in enumerate(feature_names)}
        },
        'cv_results': cv_results,
    }
    
    outpath = os.path.join(os.path.dirname(__file__), 'multi_day_model.json')
    with open(outpath, 'w') as f:
        json.dump(model_output, f, indent=2)
    print(f"\n  Model saved to: {outpath}")


if __name__ == '__main__':
    main()

"""
Validate our 6-factor R-Factor engine against TradeFinder's ground truth.
Downloads 25 days of NSE F&O + equity bhavcopy, computes composite scores,
and compares with TradeFinder's R Factor (param_3) for 80 stocks.
"""

import json
import os
import io
import zipfile
import csv
import time
from datetime import datetime, timedelta
from collections import defaultdict
import statistics
import urllib.request

NSE_FO_URL = "https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_{date}_F_0000.csv.zip"
NSE_CM_URL = "https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{date}_F_0000.csv.zip"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.nseindia.com/',
}

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')

# Our 6-factor weights from derive-r research
WEIGHTS = {
    'fut_turnover': 0.30,
    'fut_volume': 0.25,
    'opt_volume': 0.18,
    'eq_trade_size': 0.12,
    'oi_change': 0.10,
    'spread': 0.05,
}


def download_bhavcopy(url, cache_key):
    """Download and cache a bhavcopy ZIP, extract CSV."""
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.csv")
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            return f.read()

    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
    except Exception as e:
        print(f"  Failed to download {cache_key}: {e}")
        return None

    try:
        z = zipfile.ZipFile(io.BytesIO(data))
        csv_name = [n for n in z.namelist() if n.endswith('.csv')][0]
        csv_data = z.read(csv_name).decode('utf-8')
    except Exception as e:
        print(f"  Failed to extract {cache_key}: {e}")
        return None

    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(cache_file, 'w') as f:
        f.write(csv_data)

    return csv_data


def parse_fo_bhavcopy(csv_data):
    """Parse F&O bhavcopy CSV. Returns {symbol: {fut_oi, fut_oi_change, fut_volume, fut_turnover, opt_oi, opt_volume, opt_turnover}}"""
    reader = csv.DictReader(io.StringIO(csv_data))

    # Group futures by symbol, find near-month
    futures_by_symbol = defaultdict(list)
    options_agg = defaultdict(lambda: {'opt_oi': 0, 'opt_volume': 0, 'opt_turnover': 0})

    for row in reader:
        symbol = row.get('TckrSymb', '').strip()
        inst_type = row.get('FinInstrmTp', '').strip()

        if inst_type == 'STF':
            futures_by_symbol[symbol].append(row)
        elif inst_type == 'STO':
            options_agg[symbol]['opt_oi'] += float(row.get('OpnIntrst', 0) or 0)
            options_agg[symbol]['opt_volume'] += float(row.get('TtlTradgVol', 0) or 0)
            options_agg[symbol]['opt_turnover'] += float(row.get('TtlTrfVal', 0) or 0)

    result = {}
    for symbol, fut_rows in futures_by_symbol.items():
        # Pick nearest expiry (near-month)
        sorted_rows = sorted(fut_rows, key=lambda r: r.get('XpryDt', ''))
        near = sorted_rows[0]

        opt = options_agg.get(symbol, {'opt_oi': 0, 'opt_volume': 0, 'opt_turnover': 0})

        result[symbol] = {
            'fut_oi': float(near.get('OpnIntrst', 0) or 0),
            'fut_oi_change': float(near.get('ChngInOpnIntrst', 0) or 0),
            'fut_volume': float(near.get('TtlTradgVol', 0) or 0),
            'fut_turnover': float(near.get('TtlTrfVal', 0) or 0),
            'opt_oi': opt['opt_oi'],
            'opt_volume': opt['opt_volume'],
            'opt_turnover': opt['opt_turnover'],
        }

    return result


def parse_eq_bhavcopy(csv_data):
    """Parse equity bhavcopy CSV. Returns {symbol: {eq_volume, eq_turnover, eq_high, eq_low, eq_close}}"""
    reader = csv.DictReader(io.StringIO(csv_data))
    result = {}

    for row in reader:
        symbol = row.get('TckrSymb', '').strip()
        series = row.get('SctySrs', '').strip()
        if series != 'EQ':
            continue

        result[symbol] = {
            'eq_volume': float(row.get('TtlTradgVol', 0) or 0),
            'eq_turnover': float(row.get('TtlTrfVal', 0) or 0),
            'eq_high': float(row.get('HghPric', 0) or 0),
            'eq_low': float(row.get('LwPric', 0) or 0),
            'eq_close': float(row.get('ClsPric', 0) or 0),
        }

    return result


def get_trading_dates(end_date, count=25):
    """Get last N weekdays before end_date (inclusive)."""
    dates = []
    current = end_date
    while len(dates) < count:
        if current.weekday() < 5:  # Mon-Fri
            dates.append(current)
        current -= timedelta(days=1)
    return list(reversed(dates))


def fetch_all_days(dates):
    """Download and parse bhavcopy for all dates. Returns [{symbol: merged_data}, ...]"""
    all_days = []

    for date in dates:
        date_str = date.strftime('%Y%m%d')
        date_label = date.strftime('%Y-%m-%d')

        print(f"  Fetching {date_label}...", end=' ')

        fo_csv = download_bhavcopy(
            NSE_FO_URL.format(date=date_str),
            f"fo_{date_str}"
        )
        eq_csv = download_bhavcopy(
            NSE_CM_URL.format(date=date_str),
            f"cm_{date_str}"
        )

        if not fo_csv or not eq_csv:
            print("SKIP (holiday/weekend)")
            continue

        fo_data = parse_fo_bhavcopy(fo_csv)
        eq_data = parse_eq_bhavcopy(eq_csv)

        # Merge
        merged = {}
        for symbol in fo_data:
            fo = fo_data[symbol]
            eq = eq_data.get(symbol, {})
            merged[symbol] = {
                'eq_volume': eq.get('eq_volume', 0),
                'eq_turnover': eq.get('eq_turnover', 0),
                'eq_high': eq.get('eq_high', 0),
                'eq_low': eq.get('eq_low', 0),
                'eq_close': eq.get('eq_close', 0),
                'fut_volume': fo['fut_volume'],
                'fut_oi': fo['fut_oi'],
                'fut_oi_change': fo['fut_oi_change'],
                'fut_turnover': fo['fut_turnover'],
                'opt_volume': fo['opt_volume'],
                'opt_oi': fo['opt_oi'],
                'opt_turnover': fo['opt_turnover'],
            }

        print(f"OK ({len(merged)} stocks)")
        all_days.append(merged)
        time.sleep(0.5)

    return all_days


def compute_factors(daily_data):
    """Transform raw daily data to factor inputs."""
    return {
        'fut_turnover': daily_data['fut_turnover'],
        'fut_volume': daily_data['fut_volume'],
        'opt_volume': daily_data['opt_volume'],
        'eq_trade_size': daily_data['eq_turnover'] / daily_data['eq_volume'] if daily_data['eq_volume'] > 0 else 0,
        'oi_change': abs(daily_data['fut_oi_change']),
        'spread': (daily_data['eq_high'] - daily_data['eq_low']) / daily_data['eq_close'] if daily_data['eq_close'] > 0 else 0,
    }


def z_score(value, series):
    """Compute Z-score."""
    if len(series) < 2:
        return 0
    m = statistics.mean(series)
    s = statistics.stdev(series)
    if s == 0:
        return 0
    return (value - m) / s


def compute_composite(symbol, all_days):
    """Compute our 6-factor composite R-Factor for a symbol."""
    # Get factor data for each day
    factor_series = []
    for day_data in all_days:
        if symbol in day_data:
            factors = compute_factors(day_data[symbol])
            factor_series.append(factors)

    if len(factor_series) < 15:
        return None, None

    # Current = last day, historical = all prior
    current = factor_series[-1]
    historical = factor_series[:-1]

    # Compute Z-scores
    z_scores = {}
    for factor in WEIGHTS:
        series = [h[factor] for h in historical]
        z_scores[factor] = z_score(current[factor], series)

    # Weighted composite
    composite = sum(z_scores[f] * WEIGHTS[f] for f in WEIGHTS)

    return composite, z_scores


def pearson_corr(x, y):
    """Compute Pearson correlation coefficient."""
    n = len(x)
    if n < 3:
        return 0
    mx, my = statistics.mean(x), statistics.mean(y)
    sx, sy = statistics.stdev(x), statistics.stdev(y)
    if sx == 0 or sy == 0:
        return 0
    return sum((xi - mx) * (yi - my) for xi, yi in zip(x, y)) / ((n - 1) * sx * sy)


def spearman_corr(x, y):
    """Compute Spearman rank correlation."""
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

    # Deduplicate (some symbols appear twice)
    ground_truth = {}
    for item in intraday_boost:
        symbol = item['Symbol']
        ground_truth[symbol] = item['param_3']

    print(f"Ground truth: {len(ground_truth)} unique stocks")
    print(f"R Factor range: {min(ground_truth.values()):.3f} to {max(ground_truth.values()):.3f}")
    print()

    # Fetch 25 trading days ending March 13, 2026
    end_date = datetime(2026, 3, 13)
    dates = get_trading_dates(end_date, count=30)  # Extra buffer for holidays

    print(f"Fetching bhavcopy data ({len(dates)} dates)...")
    all_days = fetch_all_days(dates)
    print(f"Got {len(all_days)} trading days of data")
    print()

    # Compute our composite for each ground truth stock
    results = []
    missing = []

    for symbol, actual_r in sorted(ground_truth.items()):
        composite, z_scores = compute_composite(symbol, all_days)
        if composite is not None:
            results.append({
                'symbol': symbol,
                'actual_r': actual_r,
                'our_composite': composite,
                'z_scores': z_scores,
            })
        else:
            missing.append(symbol)

    print(f"Computed scores for {len(results)} stocks, {len(missing)} missing")
    if missing:
        print(f"Missing: {', '.join(missing)}")
    print()

    # Compute correlations
    actual = [r['actual_r'] for r in results]
    ours = [r['our_composite'] for r in results]

    p_corr = pearson_corr(actual, ours)
    s_corr = spearman_corr(actual, ours)

    print("=" * 70)
    print(f"  VALIDATION: Our Engine vs TradeFinder R Factor")
    print(f"  Stocks: {len(results)}")
    print(f"  Pearson correlation:  {p_corr:.4f}")
    print(f"  Spearman correlation: {s_corr:.4f}")
    print("=" * 70)
    print()

    # Per-factor correlations
    print("Per-factor Z-score correlations with TradeFinder R:")
    print(f"{'Factor':<20} {'Pearson':>10} {'Spearman':>10} {'Weight':>8}")
    print("-" * 50)
    for factor in WEIGHTS:
        factor_z = [r['z_scores'][factor] for r in results]
        fp = pearson_corr(actual, factor_z)
        fs = spearman_corr(actual, factor_z)
        print(f"{factor:<20} {fp:>10.4f} {fs:>10.4f} {WEIGHTS[factor]:>8.0%}")
    print()

    # Show top/bottom comparison
    results.sort(key=lambda r: r['actual_r'], reverse=True)
    print(f"{'Symbol':<15} {'TF R Factor':>12} {'Our Score':>12} {'Diff':>8}")
    print("-" * 50)
    for r in results[:10]:
        diff = r['our_composite'] - r['actual_r']
        print(f"{r['symbol']:<15} {r['actual_r']:>12.3f} {r['our_composite']:>12.3f} {diff:>+8.3f}")
    print("  ...")
    for r in results[-5:]:
        diff = r['our_composite'] - r['actual_r']
        print(f"{r['symbol']:<15} {r['actual_r']:>12.3f} {r['our_composite']:>12.3f} {diff:>+8.3f}")

    # Save detailed results
    output = {
        'pearson': p_corr,
        'spearman': s_corr,
        'n_stocks': len(results),
        'results': results,
    }
    with open(os.path.join(os.path.dirname(__file__), 'engine_validation.json'), 'w') as f:
        json.dump(output, f, indent=2)
    print(f"\nDetailed results saved to engine_validation.json")


if __name__ == '__main__':
    main()

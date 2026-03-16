"""
Test the production R-Factor engine with real NSE bhavcopy data.
Downloads latest available trading days and computes R-Factor for all F&O stocks.
"""

import json
import os
import csv as csv_module
import io
import zipfile
import statistics
import urllib.request
from datetime import datetime, timedelta

CACHE_DIR = os.path.join(os.path.dirname(__file__), 'bhavcopy_cache')

NSE_FO_URL = "https://nsearchives.nseindia.com/content/fo/BhavCopy_NSE_FO_0_0_0_{date}_F_0000.csv.zip"
NSE_CM_URL = "https://nsearchives.nseindia.com/content/cm/BhavCopy_NSE_CM_0_0_0_{date}_F_0000.csv.zip"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
    'Accept': '*/*',
    'Referer': 'https://www.nseindia.com/',
}

# Production OLS coefficients
OLS_INTERCEPT = 1.108614
OLS_COEFFICIENTS = {
    'spread_r': 0.624570,
    'pcr_z': 0.076682,
    'spread_x_fut_turn': 0.226081,
    'fut_turn_z': 1.414904,
    'fut_vol_z': -1.733390,
}


def download_bhavcopy(url, cache_key):
    cache_file = os.path.join(CACHE_DIR, f"{cache_key}.csv")
    if os.path.exists(cache_file):
        with open(cache_file, 'r') as f:
            return f.read()
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
    except Exception as e:
        return None
    try:
        z = zipfile.ZipFile(io.BytesIO(data))
        csv_name = [n for n in z.namelist() if n.endswith('.csv')][0]
        csv_data = z.read(csv_name).decode('utf-8')
    except Exception:
        return None
    os.makedirs(CACHE_DIR, exist_ok=True)
    with open(cache_file, 'w') as f:
        f.write(csv_data)
    return csv_data


def parse_fo(csv_data):
    reader = csv_module.DictReader(io.StringIO(csv_data))
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


def parse_cm(csv_data):
    reader = csv_module.DictReader(io.StringIO(csv_data))
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


def get_trading_dates(end_date, count=30):
    dates = []
    current = end_date
    while len(dates) < count:
        if current.weekday() < 5:
            dates.append(current)
        current -= timedelta(days=1)
    return list(reversed(dates))


def main():
    # Find the latest available trading day
    today = datetime.now()
    print(f"Today: {today.strftime('%Y-%m-%d')} ({today.strftime('%A')})")
    print()

    # Get 30 trading days ending today (extra buffer for holidays)
    dates = get_trading_dates(today, count=35)

    print(f"Downloading bhavcopy for {len(dates)} dates...")
    all_fo, all_cm, valid_dates = [], [], []

    for date in dates:
        ds = date.strftime('%Y%m%d')
        dl = date.strftime('%Y-%m-%d')

        fo_csv = download_bhavcopy(NSE_FO_URL.format(date=ds), f"fo_{ds}")
        cm_csv = download_bhavcopy(NSE_CM_URL.format(date=ds), f"cm_{ds}")

        if not fo_csv or not cm_csv:
            print(f"  {dl} — SKIP (holiday)")
            continue

        fo = parse_fo(fo_csv)
        cm = parse_cm(cm_csv)
        all_fo.append(fo)
        all_cm.append(cm)
        valid_dates.append(dl)
        print(f"  {dl} — {len(fo)} F&O stocks, {len(cm)} equity stocks")

    n_days = len(all_fo)
    print(f"\nLoaded {n_days} trading days")
    print(f"Latest: {valid_dates[-1]}\n")

    if n_days < 21:
        print("ERROR: Need at least 21 days for reliable Z-scores")
        return

    # Get all F&O symbols from latest day
    latest_fo = all_fo[-1]
    latest_cm = all_cm[-1]
    all_symbols = sorted(set(latest_fo.keys()) & set(latest_cm.keys()))
    print(f"F&O stocks with equity data: {len(all_symbols)}")

    # Compute R-Factor for each symbol
    results = []
    for symbol in all_symbols:
        ts = []
        for day_idx in range(n_days):
            fo = all_fo[day_idx].get(symbol, {})
            cm = all_cm[day_idx].get(symbol, {})
            if not fo or not cm: continue
            ec = cm.get('eq_close', 0)
            ts.append({
                'fut_turn': fo.get('fut_turn', 0),
                'fut_vol': fo.get('fut_vol', 0),
                'spread_raw': (cm.get('eq_high', 0) - cm.get('eq_low', 0)) / ec if ec > 0 else 0,
                'pcr': fo.get('pe_vol', 0) / fo.get('ce_vol', 1) if fo.get('ce_vol', 0) > 0 else 0,
            })

        if len(ts) < 15: continue

        current = ts[-1]
        hist = ts[:-1]
        lookback = hist[-20:]

        avg_spread = statistics.mean([h['spread_raw'] for h in lookback]) if lookback else 0
        spread_r = current['spread_raw'] / avg_spread if avg_spread > 0 else 0
        fut_turn_z = z_score(current['fut_turn'], [h['fut_turn'] for h in hist])
        fut_vol_z = z_score(current['fut_vol'], [h['fut_vol'] for h in hist])
        pcr_z = z_score(current['pcr'], [h['pcr'] for h in hist])

        composite = (
            OLS_INTERCEPT +
            OLS_COEFFICIENTS['spread_r'] * spread_r +
            OLS_COEFFICIENTS['pcr_z'] * pcr_z +
            OLS_COEFFICIENTS['spread_x_fut_turn'] * (spread_r * fut_turn_z) +
            OLS_COEFFICIENTS['fut_turn_z'] * fut_turn_z +
            OLS_COEFFICIENTS['fut_vol_z'] * fut_vol_z
        )

        signal = "UP" if spread_r > 1.2 else "DOWN"
        regime = "Defensive"
        if spread_r > 1.5 and fut_vol_z > 1.0:
            regime = "Cheetah"
        if abs(z_score(current['fut_turn'], [h['fut_turn'] for h in hist])) > 1.0:
            if regime == "Cheetah":
                regime = "Hybrid"
            else:
                regime = "Elephant"

        results.append({
            'symbol': symbol,
            'r_factor': composite,
            'spread_r': spread_r,
            'pcr': current['pcr'],
            'pcr_z': pcr_z,
            'fut_turn_z': fut_turn_z,
            'fut_vol_z': fut_vol_z,
            'signal': signal,
            'regime': regime,
            'blast': composite >= 2.8,
        })

    results.sort(key=lambda r: r['r_factor'], reverse=True)

    # Print results
    print(f"\n{'='*80}")
    print(f"  INTRADAY BOOST — R-Factor Rankings ({valid_dates[-1]})")
    print(f"  {len(results)} F&O stocks scanned")
    print(f"{'='*80}\n")

    blasts = [r for r in results if r['blast']]
    if blasts:
        print(f"  BLAST TRADES ({len(blasts)}):")
        for r in blasts:
            print(f"    {r['symbol']:<15} R={r['r_factor']:.2f}  spread={r['spread_r']:.2f}  pcr={r['pcr']:.2f}  {r['regime']}")
        print()

    print(f"  {'#':<5} {'Symbol':<15} {'R.Factor':>9} {'Spread':>8} {'PCR':>7} {'Signal':>8} {'Regime':<12}")
    print("  " + "-" * 70)

    for i, r in enumerate(results[:30]):
        blast_mark = " *" if r['blast'] else "  "
        print(f"  {i+1:<5} {r['symbol']:<15} {r['r_factor']:>9.2f} {r['spread_r']:>8.2f} {r['pcr']:>7.2f} {r['signal']:>8} {r['regime']:<12}{blast_mark}")

    print(f"\n  ... {len(results) - 30} more stocks below\n")

    # Bottom 10
    print(f"  Bottom 10:")
    for i, r in enumerate(results[-10:]):
        rank = len(results) - 10 + i + 1
        print(f"  {rank:<5} {r['symbol']:<15} {r['r_factor']:>9.2f} {r['spread_r']:>8.2f} {r['pcr']:>7.2f} {r['signal']:>8} {r['regime']:<12}")

    # Summary
    up_count = sum(1 for r in results if r['signal'] == 'UP')
    print(f"\n  Summary:")
    print(f"    UP signals:   {up_count}/{len(results)}")
    print(f"    DOWN signals: {len(results) - up_count}/{len(results)}")
    print(f"    Blast trades: {len(blasts)}")
    print(f"    R-Factor range: {results[-1]['r_factor']:.2f} — {results[0]['r_factor']:.2f}")


if __name__ == '__main__':
    main()

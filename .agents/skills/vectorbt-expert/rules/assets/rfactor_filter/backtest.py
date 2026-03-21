"""
R-Factor Filter Strategy — Project-R

Entry: EMA crossover confirmed by R-Factor > threshold (institutional activity filter).
Exit: EMA crossunder OR trailing stop.

Uses Project-R adapter for Dhan data and R-Factor signals.
"""

import sys
from datetime import datetime, timedelta
from pathlib import Path

import numpy as np
import pandas as pd
import talib as tl
import vectorbt as vbt

# Add project root to path so `from projectr import ...` works
script_dir = Path(__file__).resolve().parent
project_root = script_dir
for _ in range(10):
    if (project_root / "package.json").exists():
        break
    project_root = project_root.parent
sys.path.insert(0, str(project_root / "backtesting"))

from projectr import bhavcopy, dhan_client, rfactor, signals, universe

# --- Config ---
SYMBOL = "SBIN"
INIT_CASH = 1_000_000
FEES = 0.00111              # Indian delivery equity (STT + statutory)
FIXED_FEES = 20             # Rs 20 per order
ALLOCATION = 0.75
EMA_FAST = 10
EMA_SLOW = 20
RFACTOR_THRESHOLD = 2.0     # Only enter when R-Factor > this

# --- Fetch Data ---
end_date = datetime.now().date()
start_date = end_date - timedelta(days=365 * 3)

df = dhan_client.fetch_historical(
    SYMBOL,
    start_date.strftime("%Y-%m-%d"),
    end_date.strftime("%Y-%m-%d"),
)
close = df["close"]

# --- Technical Indicators (TA-Lib) ---
ema_fast = pd.Series(tl.EMA(close.values, timeperiod=EMA_FAST), index=close.index)
ema_slow = pd.Series(tl.EMA(close.values, timeperiod=EMA_SLOW), index=close.index)

# --- R-Factor Entry Filter ---
# Load R-Factor signal from bhavcopy (True on days R > threshold)
rfactor_signal = rfactor.rfactor_entry_signal(SYMBOL, threshold=RFACTOR_THRESHOLD)

# Align R-Factor signal with price data (bhavcopy may have fewer dates)
rfactor_aligned = rfactor_signal.reindex(close.index).fillna(False)

# --- Generate Signals ---
ema_cross_up = signals.crossover(ema_fast, ema_slow)
ema_cross_dn = signals.crossunder(ema_fast, ema_slow)

# Entry: EMA crossover AND R-Factor confirms institutional activity
buy_raw = (ema_cross_up & rfactor_aligned).fillna(False)
sell_raw = ema_cross_dn.fillna(False)

entries = signals.exrem(buy_raw, sell_raw)
exits = signals.exrem(sell_raw, buy_raw)

# --- Backtest ---
pf = vbt.Portfolio.from_signals(
    close, entries, exits,
    init_cash=INIT_CASH, size=ALLOCATION, size_type="percent",
    fees=FEES, fixed_fees=FIXED_FEES, direction="longonly",
    min_size=1, size_granularity=1, freq="1D",
)

# --- Benchmark (NIFTY 50 via Dhan) ---
bench_df = dhan_client.fetch_benchmark(
    start_date.strftime("%Y-%m-%d"),
    end_date.strftime("%Y-%m-%d"),
)
bench_close = bench_df["close"].reindex(close.index).ffill().bfill()
pf_bench = vbt.Portfolio.from_holding(bench_close, init_cash=INIT_CASH, fees=FEES, freq="1D")

# --- Results ---
print(pf.stats())

# --- Strategy vs Benchmark ---
comparison = pd.DataFrame({
    "Strategy (R-Factor + EMA)": [
        f"{pf.total_return() * 100:.2f}%", f"{pf.sharpe_ratio():.2f}",
        f"{pf.sortino_ratio():.2f}", f"{pf.max_drawdown() * 100:.2f}%",
        f"{pf.trades.win_rate() * 100:.1f}%", f"{pf.trades.count()}",
        f"{pf.trades.profit_factor():.2f}",
    ],
    "Benchmark (NIFTY)": [
        f"{pf_bench.total_return() * 100:.2f}%", f"{pf_bench.sharpe_ratio():.2f}",
        f"{pf_bench.sortino_ratio():.2f}", f"{pf_bench.max_drawdown() * 100:.2f}%",
        "-", "-", "-",
    ],
}, index=["Total Return", "Sharpe Ratio", "Sortino Ratio", "Max Drawdown",
          "Win Rate", "Total Trades", "Profit Factor"])
print("\n--- Strategy vs Benchmark ---")
print(comparison.to_string())

# --- Explain ---
print(f"\n--- Report ---")
print(f"* R-Factor filter threshold: {RFACTOR_THRESHOLD}")
print(f"* Only entered trades when institutional activity (R-Factor) exceeded {RFACTOR_THRESHOLD}")
print(f"* Total Return: {pf.total_return() * 100:.2f}% vs NIFTY {pf_bench.total_return() * 100:.2f}%")
print(f"* Max Drawdown: {pf.max_drawdown() * 100:.2f}%")
print(f"  -> On Rs {INIT_CASH:,}, worst temporary loss = Rs {abs(pf.max_drawdown()) * INIT_CASH:,.0f}")

# --- R-Factor Stats ---
rfactor_days = rfactor_aligned.sum()
total_days = len(rfactor_aligned)
print(f"* R-Factor active days: {int(rfactor_days)}/{total_days} ({rfactor_days/total_days*100:.1f}%)")
print(f"* Trades taken: {pf.trades.count()} (filtered from {ema_cross_up.sum()} EMA crossovers)")

# --- Plot ---
fig = pf.plot(subplots=["value", "underwater", "cum_returns"], template="plotly_dark")
fig.show()

# --- Export ---
pf.positions.records_readable.to_csv(script_dir / f"{SYMBOL}_rfactor_trades.csv", index=False)
print(f"\nTrades exported to {SYMBOL}_rfactor_trades.csv")

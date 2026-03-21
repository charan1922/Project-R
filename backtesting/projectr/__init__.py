"""
Project-R Python adapter for VectorBT backtesting.

Bridges Project-R's Dhan V2 API, SQLite bhavcopy, and R-Factor engine
to Python backtesting scripts.

Usage:
    from projectr import dhan_client, bhavcopy, rfactor, universe, signals

    # Fetch OHLCV from Dhan
    df = dhan_client.fetch_historical("RELIANCE", "2025-01-01", "2026-03-20")

    # Load bhavcopy from SQLite
    df = bhavcopy.load_symbol("RELIANCE", days=25)

    # Compute R-Factor
    top_stocks = rfactor.rank_universe("2026-03-20", top_n=10)

    # R-Factor entry signal for vectorbt
    entries = rfactor.rfactor_entry_signal("RELIANCE", threshold=2.0)

    # F&O stock universe
    stocks = universe.get_fno_stocks()

    # Signal utilities
    clean_entries = signals.exrem(buy_raw, sell_raw)
"""

import importlib as _importlib


def __getattr__(name: str):
    """Lazy imports — modules are only loaded when accessed."""
    _modules = {"bhavcopy", "dhan_client", "rfactor", "signals", "universe", "config"}
    if name in _modules:
        return _importlib.import_module(f".{name}", __name__)
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")


__all__ = [
    "bhavcopy",
    "config",
    "dhan_client",
    "rfactor",
    "signals",
    "universe",
]

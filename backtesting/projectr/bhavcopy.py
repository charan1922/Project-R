"""
SQLite bhavcopy bridge — reads from Project-R's bhavcopy_days table.

Provides equity OHLCV + F&O columns (OI, volume, turnover, PCR) as pandas
DataFrames ready for R-Factor computation or direct backtesting.

Connects read-only to data/project-r.db via sqlite3 stdlib (no Prisma needed).
"""

import sqlite3

import pandas as pd

from .config import DB_PATH


def _connect() -> sqlite3.Connection:
    """Open read-only SQLite connection."""
    if not DB_PATH.exists():
        raise FileNotFoundError(
            f"Database not found at {DB_PATH}. "
            "Run bhavcopy sync from the web UI first (/trading-lab/bhavcopy)."
        )
    return sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)


def load_symbol(symbol: str, days: int = 25) -> pd.DataFrame:
    """
    Load bhavcopy data for a single symbol.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE")
        days: Number of most recent days to load

    Returns:
        DataFrame with DatetimeIndex and columns:
        - Equity OHLCV: high, low, close, volume, turnover
        - F&O: fut_oi, fut_oi_change, fut_volume, fut_turnover,
                opt_volume, opt_oi, opt_turnover, ce_volume, pe_volume, pcr
    """
    con = _connect()
    try:
        df = pd.read_sql_query(
            """
            SELECT date, eqHigh, eqLow, eqClose, eqVolume, eqTurnover,
                   futVolume, futOi, futOiChange, futTurnover,
                   optVolume, optOi, optTurnover, ceVolume, peVolume
            FROM bhavcopy_days
            WHERE symbol = ?
            ORDER BY date DESC
            LIMIT ?
            """,
            con,
            params=(symbol, days),
        )
    finally:
        con.close()

    if df.empty:
        return pd.DataFrame()

    # Reverse to chronological order
    df = df.iloc[::-1].reset_index(drop=True)

    # Rename to standard lowercase columns
    df = df.rename(columns={
        "eqHigh": "high",
        "eqLow": "low",
        "eqClose": "close",
        "eqVolume": "volume",
        "eqTurnover": "turnover",
        "futVolume": "fut_volume",
        "futOi": "fut_oi",
        "futOiChange": "fut_oi_change",
        "futTurnover": "fut_turnover",
        "optVolume": "opt_volume",
        "optOi": "opt_oi",
        "optTurnover": "opt_turnover",
        "ceVolume": "ce_volume",
        "peVolume": "pe_volume",
    })

    # Set date index
    df["date"] = pd.to_datetime(df["date"])
    df = df.set_index("date").sort_index()

    # Compute PCR
    df["pcr"] = df.apply(
        lambda r: r["pe_volume"] / r["ce_volume"] if r["ce_volume"] > 0 else 0, axis=1
    )

    return df


def load_date(date: str) -> pd.DataFrame:
    """
    Load bhavcopy data for all symbols on a given date.

    Args:
        date: "YYYY-MM-DD"

    Returns:
        DataFrame indexed by symbol with all bhavcopy columns.
    """
    con = _connect()
    try:
        df = pd.read_sql_query(
            """
            SELECT symbol, eqHigh, eqLow, eqClose, eqVolume, eqTurnover,
                   futVolume, futOi, futOiChange, futTurnover,
                   optVolume, optOi, optTurnover, ceVolume, peVolume
            FROM bhavcopy_days
            WHERE date = ?
            ORDER BY symbol
            """,
            con,
            params=(date,),
        )
    finally:
        con.close()

    if df.empty:
        return pd.DataFrame()

    df = df.rename(columns={
        "eqHigh": "high",
        "eqLow": "low",
        "eqClose": "close",
        "eqVolume": "volume",
        "eqTurnover": "turnover",
        "futVolume": "fut_volume",
        "futOi": "fut_oi",
        "futOiChange": "fut_oi_change",
        "futTurnover": "fut_turnover",
        "optVolume": "opt_volume",
        "optOi": "opt_oi",
        "optTurnover": "opt_turnover",
        "ceVolume": "ce_volume",
        "peVolume": "pe_volume",
    })

    df = df.set_index("symbol")
    df["pcr"] = df.apply(
        lambda r: r["pe_volume"] / r["ce_volume"] if r["ce_volume"] > 0 else 0, axis=1
    )

    return df


def available_dates() -> list[str]:
    """Return list of dates (YYYY-MM-DD) available in the bhavcopy table."""
    con = _connect()
    try:
        rows = con.execute(
            "SELECT DISTINCT date FROM bhavcopy_days ORDER BY date"
        ).fetchall()
        return [r[0] for r in rows]
    finally:
        con.close()

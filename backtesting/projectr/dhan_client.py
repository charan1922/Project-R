"""
Dhan V2 API client for Python backtesting.

Reads cached auth token from data/.dhan-token.json (shared with Next.js server).
Resolves symbol -> securityId via SQLite master_contracts table.
Returns pandas DataFrames in vectorbt-compatible format.
"""

import sqlite3
import time
from datetime import datetime, timedelta
from functools import lru_cache

import pandas as pd
import requests

from .config import DB_PATH, DHAN_BASE_URL, DHAN_CLIENT_ID, get_dhan_token

# Rate limit: 4 req/sec -> 0.25s between calls
_last_request_time = 0.0


def _rate_limit():
    global _last_request_time
    elapsed = time.time() - _last_request_time
    if elapsed < 0.25:
        time.sleep(0.25 - elapsed)
    _last_request_time = time.time()


def _headers() -> dict:
    return {
        "access-token": get_dhan_token(),
        "client-id": DHAN_CLIENT_ID,
        "Content-Type": "application/json",
    }


@lru_cache(maxsize=500)
def resolve_security_id(symbol: str, segment: str = "NSE_EQ") -> int | None:
    """
    Resolve symbol to Dhan securityId via master_contracts SQLite table.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE")
        segment: "NSE_EQ" for equity, "NSE_FNO" for futures
    """
    if not DB_PATH.exists():
        return None

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        row = con.execute(
            "SELECT securityId FROM master_contracts WHERE symbol = ? AND segment = ? LIMIT 1",
            (symbol, segment),
        ).fetchone()
        return int(row[0]) if row else None
    finally:
        con.close()


@lru_cache(maxsize=500)
def resolve_lot_size(symbol: str) -> int:
    """Get lot size for a symbol from master_contracts."""
    if not DB_PATH.exists():
        return 1

    con = sqlite3.connect(f"file:{DB_PATH}?mode=ro", uri=True)
    try:
        row = con.execute(
            "SELECT lotSize FROM master_contracts WHERE symbol = ? AND segment = 'NSE_FNO' LIMIT 1",
            (symbol,),
        ).fetchone()
        return int(row[0]) if row and row[0] else 1
    finally:
        con.close()


def fetch_historical(
    symbol: str,
    start_date: str,
    end_date: str,
    segment: str = "NSE_EQ",
    instrument: str = "EQUITY",
) -> pd.DataFrame:
    """
    Fetch daily OHLCV + OI candles from Dhan V2 charts/historical API.

    Args:
        symbol: Stock symbol (e.g., "RELIANCE")
        start_date: "YYYY-MM-DD"
        end_date: "YYYY-MM-DD"
        segment: "NSE_EQ" for equity, "NSE_FNO" for futures, "IDX_I" for index
        instrument: "EQUITY", "FUTIDX", "FUTSTK", "INDEX"

    Returns:
        DataFrame with DatetimeIndex and columns: open, high, low, close, volume, oi
    """
    sec_id = resolve_security_id(symbol, segment)
    if sec_id is None:
        raise ValueError(f"Symbol '{symbol}' not found in master_contracts (segment={segment}). Run master contract sync first.")

    _rate_limit()
    resp = requests.post(
        f"{DHAN_BASE_URL}/v2/charts/historical",
        headers=_headers(),
        json={
            "securityId": str(sec_id),
            "exchangeSegment": segment,
            "instrument": instrument,
            "expiryCode": 0,
            "fromDate": start_date,
            "toDate": end_date,
            "oi": True,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if not data.get("open"):
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume", "oi"])

    df = pd.DataFrame({
        "open": data["open"],
        "high": data["high"],
        "low": data["low"],
        "close": data["close"],
        "volume": data["volume"],
        "oi": data.get("oi", [0] * len(data["open"])),
    })

    # Dhan timestamps are epoch seconds
    df.index = pd.to_datetime(data["timestamp"], unit="s")
    df.index.name = None
    df = df.sort_index()

    # Remove timezone if present
    if df.index.tz is not None:
        df.index = df.index.tz_convert(None)

    return df


def fetch_intraday(
    symbol: str,
    start_date: str,
    end_date: str,
    interval: str = "5",
    segment: str = "NSE_EQ",
    instrument: str = "EQUITY",
) -> pd.DataFrame:
    """
    Fetch intraday candles from Dhan V2 charts/intraday API.

    Args:
        symbol: Stock symbol
        start_date: "YYYY-MM-DD"
        end_date: "YYYY-MM-DD"
        interval: "1", "5", "15", "25", "60"

    Returns:
        DataFrame with DatetimeIndex and columns: open, high, low, close, volume, oi
    """
    sec_id = resolve_security_id(symbol, segment)
    if sec_id is None:
        raise ValueError(f"Symbol '{symbol}' not found in master_contracts (segment={segment})")

    _rate_limit()
    resp = requests.post(
        f"{DHAN_BASE_URL}/v2/charts/intraday",
        headers=_headers(),
        json={
            "securityId": str(sec_id),
            "exchangeSegment": segment,
            "instrument": instrument,
            "interval": interval,
            "fromDate": start_date,
            "toDate": end_date,
            "oi": True,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if not data.get("open"):
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume", "oi"])

    df = pd.DataFrame({
        "open": data["open"],
        "high": data["high"],
        "low": data["low"],
        "close": data["close"],
        "volume": data["volume"],
        "oi": data.get("oi", [0] * len(data["open"])),
    })

    df.index = pd.to_datetime(data["timestamp"], unit="s")
    df.index.name = None
    df = df.sort_index()

    if df.index.tz is not None:
        df.index = df.index.tz_convert(None)

    return df


# NIFTY 50 securityId on Dhan
NIFTY_SECURITY_ID = 13


def fetch_benchmark(start_date: str, end_date: str) -> pd.DataFrame:
    """
    Fetch NIFTY 50 index daily OHLCV from Dhan.

    Returns:
        DataFrame with DatetimeIndex and columns: open, high, low, close, volume
    """
    _rate_limit()
    resp = requests.post(
        f"{DHAN_BASE_URL}/v2/charts/historical",
        headers=_headers(),
        json={
            "securityId": str(NIFTY_SECURITY_ID),
            "exchangeSegment": "IDX_I",
            "instrument": "INDEX",
            "expiryCode": 0,
            "fromDate": start_date,
            "toDate": end_date,
        },
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()

    if not data.get("open"):
        return pd.DataFrame(columns=["open", "high", "low", "close", "volume"])

    df = pd.DataFrame({
        "open": data["open"],
        "high": data["high"],
        "low": data["low"],
        "close": data["close"],
        "volume": data["volume"],
    })

    df.index = pd.to_datetime(data["timestamp"], unit="s")
    df.index.name = None
    df = df.sort_index()

    if df.index.tz is not None:
        df.index = df.index.tz_convert(None)

    return df

"""
R-Factor V4 engine ported to Python for backtesting.

Faithfully reproduces the TypeScript engine at lib/r-factor/engine.ts and
lib/r-factor/ensemble.ts. Three models:

1. Spread-Linear (90% weight): R = 1.56 * spread_ratio
2. OLS (5% weight): 5-feature regression (LOO Pearson 0.60)
3. Momentum (5% weight): Spread acceleration + turnover acceleration

Coefficients sourced from derive-r/test_live.py and lib/r-factor/ensemble.ts.
"""

import math
import statistics
from dataclasses import dataclass, field

import pandas as pd

from .bhavcopy import load_date, load_symbol


# ── OLS Coefficients (from 80-stock validation, Mar 13 2026) ─────────────────

OLS_INTERCEPT = 1.108614
OLS_COEFF = {
    "spread_r": 0.624570,
    "pcr_z": 0.076682,
    "spread_x_fut_turn": 0.226081,
    "fut_turn_z": 1.414904,
    "fut_vol_z": -1.733390,
}

# Spread-Linear coefficient (cross-validated on Mar 19+20, 158 samples)
SPREAD_LINEAR_COEFF = 1.5596

# Default ensemble weights (spread-quad dominant, matching TF 8/10 top-10)
DEFAULT_WEIGHTS = {"ols": 0.05, "spread_quad": 0.90, "momentum": 0.05}

# Scale correction parameters
SCALE_EXPANSION_THRESHOLD = 2.5
SCALE_EXPANSION_FACTOR = 1.5


# ── Data Types ────────────────────────────────────────────────────────────────

@dataclass
class ZScores:
    spread: float = 0.0
    fut_turnover: float = 0.0
    fut_volume: float = 0.0
    opt_volume: float = 0.0
    oi_change: float = 0.0
    oi_level: float = 0.0
    pcr: float = 0.0
    eq_trade_size: float = 0.0


@dataclass
class RFactorResult:
    symbol: str = ""
    r_factor: float = 0.0
    scaled_r: float = 0.0
    confidence: float = 0.0
    model_used: str = "ensemble"
    regime: str = "Defensive"
    is_blast: bool = False
    z_scores: ZScores = field(default_factory=ZScores)


# ── Core Computation ──────────────────────────────────────────────────────────

def _z_score(value: float, series: list[float]) -> float:
    """Compute Z-score of value against historical series."""
    if len(series) < 2:
        return 0.0
    m = statistics.mean(series)
    s = statistics.stdev(series)
    return (value - m) / s if s != 0 else 0.0


def _predict_ols(spread_r: float, pcr_z: float, fut_turn_z: float, fut_vol_z: float) -> float:
    """OLS 5-feature regression prediction."""
    return (
        OLS_INTERCEPT
        + OLS_COEFF["spread_r"] * spread_r
        + OLS_COEFF["pcr_z"] * pcr_z
        + OLS_COEFF["spread_x_fut_turn"] * (spread_r * fut_turn_z)
        + OLS_COEFF["fut_turn_z"] * fut_turn_z
        + OLS_COEFF["fut_vol_z"] * fut_vol_z
    )


def _predict_spread_linear(spread_r: float) -> float:
    """Spread-linear model: R = 1.56 * spread_ratio, floor at 1.0."""
    if spread_r <= 0:
        return 1.0
    return max(1.0, SPREAD_LINEAR_COEFF * spread_r)


def _predict_momentum(spread_r: float, spread_accel: float, turn_accel: float, close_pos: float) -> float:
    """Momentum model: base R + acceleration adjustments."""
    base_r = 2.0 + (spread_r - 1.0) * 0.5
    adj = 0.0

    if spread_accel > 0.2:
        adj += 0.3
    elif spread_accel < -0.2:
        adj -= 0.2

    if turn_accel > 0.5:
        adj += 0.2

    if close_pos > 0.7:
        adj += 0.1
    elif close_pos < 0.3:
        adj -= 0.1

    return max(1.0, base_r + adj)


def _apply_scale_correction(raw: float) -> float:
    """Non-linear expansion for extreme R-Factor values."""
    if raw <= SCALE_EXPANSION_THRESHOLD:
        return raw
    excess = raw - SCALE_EXPANSION_THRESHOLD
    expansion = 1 + (SCALE_EXPANSION_FACTOR - 1) * math.tanh(excess)
    return SCALE_EXPANSION_THRESHOLD + excess * expansion


def _classify_regime(z_scores: ZScores) -> str:
    """Classify market regime based on Z-scores."""
    if z_scores.spread > 1.5 and z_scores.fut_volume > 1.0:
        if abs(z_scores.fut_turnover) > 1.0:
            return "Hybrid"
        return "Cheetah"
    if abs(z_scores.fut_turnover) > 1.0:
        return "Elephant"
    return "Defensive"


def _compute_confidence(z_scores: ZScores, n_history: int) -> float:
    """Compute confidence score based on data quality."""
    conf = 1.0
    if n_history < 15:
        conf *= 0.7
    if z_scores.spread > 5 or z_scores.spread < 0.1:
        conf *= 0.8
    if z_scores.pcr > 5 or (0 < z_scores.pcr < 0.2):
        conf *= 0.9
    return max(0.1, conf)


# ── Public API ────────────────────────────────────────────────────────────────

def compute_rfactor(
    symbol_data: list[dict],
    weights: dict | None = None,
) -> RFactorResult:
    """
    Compute R-Factor V4 ensemble for a single symbol.

    Args:
        symbol_data: List of daily dicts (chronological order) with keys:
            fut_turn, fut_vol, spread_raw, pcr, opt_vol, fut_oi, eq_vol, eq_turn,
            eq_close, eq_high, eq_low
        weights: Ensemble weights (default: 90/5/5 spread-quad dominant)

    Returns:
        RFactorResult with r_factor, scaled_r, confidence, regime, z_scores
    """
    if len(symbol_data) < 15:
        return RFactorResult()

    w = weights or DEFAULT_WEIGHTS

    current = symbol_data[-1]
    hist = symbol_data[:-1]
    lookback = hist[-20:]

    # Compute spread ratio
    avg_spread = statistics.mean([h["spread_raw"] for h in lookback]) if lookback else 0
    spread_r = current["spread_raw"] / avg_spread if avg_spread > 0 else 0

    # Compute Z-scores
    fut_turn_z = _z_score(current.get("fut_turn", 0), [h.get("fut_turn", 0) for h in hist])
    fut_vol_z = _z_score(current.get("fut_vol", 0), [h.get("fut_vol", 0) for h in hist])
    pcr_z = _z_score(current.get("pcr", 0), [h.get("pcr", 0) for h in hist])
    opt_vol_z = _z_score(current.get("opt_vol", 0), [h.get("opt_vol", 0) for h in hist])
    oi_change_z = _z_score(
        abs(current.get("fut_oi_chg", 0)),
        [abs(h.get("fut_oi_chg", 0)) for h in hist],
    )

    # OI level ratio (today OI / 20d avg OI)
    oi_values = [h.get("fut_oi", 0) for h in lookback if h.get("fut_oi", 0) > 0]
    oi_level = (current.get("fut_oi", 0) / statistics.mean(oi_values)) if oi_values else 0

    # Equity trade size
    eq_vol = current.get("eq_vol", 0)
    eq_turn = current.get("eq_turn", 0)
    eq_trade_size = eq_turn / eq_vol if eq_vol > 0 else 0
    eq_ts_hist = [h.get("eq_turn", 0) / h.get("eq_vol", 1) for h in hist if h.get("eq_vol", 0) > 0]
    eq_trade_size_z = _z_score(eq_trade_size, eq_ts_hist) if eq_ts_hist else 0

    z = ZScores(
        spread=spread_r,
        fut_turnover=fut_turn_z,
        fut_volume=fut_vol_z,
        opt_volume=opt_vol_z,
        oi_change=oi_change_z,
        oi_level=oi_level,
        pcr=current.get("pcr", 0),
        eq_trade_size=eq_trade_size_z,
    )

    # Three-model ensemble
    ols_val = _predict_ols(spread_r, pcr_z, fut_turn_z, fut_vol_z)
    spread_val = _predict_spread_linear(spread_r)

    # Momentum: compute acceleration
    if len(lookback) >= 2:
        prev_spread_raw = lookback[-1].get("spread_raw", 0)
        prev_avg = statistics.mean([h["spread_raw"] for h in lookback[:-1]]) if len(lookback) > 1 else prev_spread_raw
        prev_spread_r = prev_spread_raw / prev_avg if prev_avg > 0 else 0
        spread_accel = (spread_r / prev_spread_r - 1) if prev_spread_r > 0 else 0

        prev_turn = lookback[-1].get("fut_turn", 0)
        turn_accel = (current.get("fut_turn", 0) / prev_turn - 1) if prev_turn > 0 else 0
    else:
        spread_accel = 0
        turn_accel = 0

    close_val = current.get("eq_close", 0)
    high_val = current.get("eq_high", 0)
    low_val = current.get("eq_low", 0)
    close_pos = (close_val - low_val) / (high_val - low_val) if (high_val - low_val) > 0 else 0.5

    mom_val = _predict_momentum(spread_r, spread_accel, turn_accel, close_pos)

    # Confidence-weighted ensemble
    ols_conf = _compute_confidence(z, len(hist))
    spread_conf = 1.0 if 0.5 <= spread_r <= 3.0 else 0.5
    mom_conf = 0.6  # Lower confidence for momentum

    cw = {
        "ols": w["ols"] * ols_conf,
        "spread_quad": w["spread_quad"] * spread_conf,
        "momentum": w["momentum"] * mom_conf,
    }
    total_w = sum(cw.values())
    if total_w > 0:
        raw_r = (ols_val * cw["ols"] + spread_val * cw["spread_quad"] + mom_val * cw["momentum"]) / total_w
    else:
        raw_r = spread_val

    scaled_r = _apply_scale_correction(raw_r)
    regime = _classify_regime(z)
    confidence = _compute_confidence(z, len(hist))

    return RFactorResult(
        r_factor=raw_r,
        scaled_r=scaled_r,
        confidence=confidence,
        model_used="ensemble",
        regime=regime,
        is_blast=scaled_r >= 2.8,
        z_scores=z,
    )


def rfactor_entry_signal(
    symbol: str,
    threshold: float = 2.0,
    lookback: int = 25,
) -> pd.Series:
    """
    Generate R-Factor entry signal as a boolean Series for vectorbt.

    True on days where R-Factor exceeds the threshold.
    Uses bhavcopy data from SQLite.

    Args:
        symbol: Stock symbol
        threshold: R-Factor threshold for entry (default 2.0)
        lookback: Days of history for Z-score baseline (default 25)

    Returns:
        Boolean pd.Series indexed by date, True when R-Factor > threshold
    """
    # Load extra days for Z-score computation
    df = load_symbol(symbol, days=lookback + 25)
    if df.empty or len(df) < 20:
        return pd.Series(dtype=bool)

    # Build daily dicts
    daily_data = []
    for _, row in df.iterrows():
        ec = row.get("close", 0)
        eh = row.get("high", 0)
        el = row.get("low", 0)
        daily_data.append({
            "eq_high": eh,
            "eq_low": el,
            "eq_close": ec,
            "eq_vol": row.get("volume", 0),
            "eq_turn": row.get("turnover", 0),
            "spread_raw": (eh - el) / ec if ec > 0 else 0,
            "fut_turn": row.get("fut_turnover", 0),
            "fut_vol": row.get("fut_volume", 0),
            "fut_oi": row.get("fut_oi", 0),
            "fut_oi_chg": row.get("fut_oi_change", 0),
            "opt_vol": row.get("opt_volume", 0),
            "pcr": row.get("pcr", 0),
        })

    # Compute rolling R-Factor
    dates = df.index.tolist()
    signals = []
    min_window = 20

    for i in range(min_window, len(daily_data)):
        window = daily_data[max(0, i - lookback):i + 1]
        result = compute_rfactor(window)
        signals.append(result.scaled_r > threshold)

    # Pad the beginning with False
    pad = [False] * min_window
    return pd.Series(pad + signals, index=dates, name=f"rfactor_{symbol}")


def rank_universe(
    date: str,
    top_n: int = 10,
    min_days: int = 20,
) -> pd.DataFrame:
    """
    Rank all F&O stocks by R-Factor for a given date.

    Args:
        date: Target date "YYYY-MM-DD"
        top_n: Number of top stocks to return
        min_days: Minimum days of history required

    Returns:
        DataFrame with columns: symbol, r_factor, scaled_r, confidence, regime, is_blast
    """
    from .universe import get_fno_stocks

    # We need historical data ending at the target date
    # Load all symbols for the date range
    from .bhavcopy import available_dates as _avail_dates

    avail = _avail_dates()
    if date not in avail:
        # Find nearest available date
        earlier = [d for d in avail if d <= date]
        if not earlier:
            return pd.DataFrame()
        date = earlier[-1]

    # Get index of target date and extract lookback window
    date_idx = avail.index(date)
    start_idx = max(0, date_idx - 24)  # 25 days of history
    date_range = avail[start_idx:date_idx + 1]

    if len(date_range) < min_days:
        return pd.DataFrame()

    # Load bhavcopy for all dates in range
    from .bhavcopy import _connect

    con = _connect()
    try:
        placeholders = ",".join("?" * len(date_range))
        rows = pd.read_sql_query(
            f"""
            SELECT date, symbol, eqHigh, eqLow, eqClose, eqVolume, eqTurnover,
                   futVolume, futOi, futOiChange, futTurnover,
                   optVolume, ceVolume, peVolume
            FROM bhavcopy_days
            WHERE date IN ({placeholders})
            ORDER BY date
            """,
            con,
            params=date_range,
        )
    finally:
        con.close()

    if rows.empty:
        return pd.DataFrame()

    # Group by symbol and compute R-Factor
    results = []
    fno_stocks = set(get_fno_stocks())

    for symbol, group in rows.groupby("symbol"):
        if symbol not in fno_stocks:
            continue
        if len(group) < min_days:
            continue

        daily = []
        for _, r in group.iterrows():
            ec = r.get("eqClose", 0) or 0
            eh = r.get("eqHigh", 0) or 0
            el = r.get("eqLow", 0) or 0
            ce_vol = r.get("ceVolume", 0) or 0
            pe_vol = r.get("peVolume", 0) or 0
            daily.append({
                "eq_high": eh,
                "eq_low": el,
                "eq_close": ec,
                "eq_vol": r.get("eqVolume", 0) or 0,
                "eq_turn": r.get("eqTurnover", 0) or 0,
                "spread_raw": (eh - el) / ec if ec > 0 else 0,
                "fut_turn": r.get("futTurnover", 0) or 0,
                "fut_vol": r.get("futVolume", 0) or 0,
                "fut_oi": r.get("futOi", 0) or 0,
                "fut_oi_chg": r.get("futOiChange", 0) or 0,
                "opt_vol": (ce_vol + pe_vol),
                "pcr": pe_vol / ce_vol if ce_vol > 0 else 0,
            })

        res = compute_rfactor(daily)
        res.symbol = symbol
        results.append(res)

    if not results:
        return pd.DataFrame()

    # Sort by scaled_r descending
    results.sort(key=lambda r: r.scaled_r, reverse=True)

    df = pd.DataFrame([
        {
            "symbol": r.symbol,
            "r_factor": round(r.r_factor, 3),
            "scaled_r": round(r.scaled_r, 3),
            "confidence": round(r.confidence, 2),
            "regime": r.regime,
            "is_blast": r.is_blast,
        }
        for r in results[:top_n]
    ])

    return df

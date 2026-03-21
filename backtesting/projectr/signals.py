"""
Signal utilities — standalone implementations so openalgo is not required.

Provides exrem, crossover, crossunder for cleaning trading signals.
"""

import pandas as pd


def exrem(signal1: pd.Series, signal2: pd.Series) -> pd.Series:
    """
    Remove redundant signals. After signal1 fires, suppress further signal1
    until signal2 fires (and vice versa). This ensures alternating buy/sell.

    Args:
        signal1: Boolean series (e.g., buy signals)
        signal2: Boolean series (e.g., sell signals)

    Returns:
        Cleaned signal1 with redundant entries removed.
    """
    result = signal1.copy().astype(bool)
    active = False
    for i in range(len(signal1)):
        if active:
            result.iloc[i] = False
        if signal1.iloc[i] and not active:
            active = True
        if signal2.iloc[i]:
            active = False
    return result


def crossover(s1: pd.Series, s2: pd.Series) -> pd.Series:
    """Detect where s1 crosses above s2."""
    return (s1 > s2) & (s1.shift(1) <= s2.shift(1))


def crossunder(s1: pd.Series, s2: pd.Series) -> pd.Series:
    """Detect where s1 crosses below s2."""
    return (s1 < s2) & (s1.shift(1) >= s2.shift(1))

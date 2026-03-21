"""
F&O stock universe and sector mappings.

Reads from lib/data/fno_stocks_list.json (207 stocks) and
lib/data/fno_sectors.json (symbol-to-sector mapping).
"""

import json
from functools import lru_cache

from .config import FNO_SECTORS_FILE, FNO_STOCKS_FILE


@lru_cache(maxsize=1)
def get_fno_stocks() -> list[str]:
    """Return list of 207 F&O-eligible stock symbols."""
    data = json.loads(FNO_STOCKS_FILE.read_text())
    # Format: {"source": "...", "total": 207, "stocks": ["360ONE", "ABB", ...]}
    if isinstance(data, dict) and "stocks" in data:
        return sorted(data["stocks"])
    # Fallback: plain list
    if isinstance(data, list):
        if data and isinstance(data[0], dict):
            return sorted(item.get("symbol", item.get("name", "")) for item in data)
        return sorted(data)
    return []


@lru_cache(maxsize=1)
def get_sector_map() -> dict[str, str]:
    """Return dict mapping symbol -> sector name."""
    data = json.loads(FNO_SECTORS_FILE.read_text())
    if isinstance(data, dict):
        return data
    return {}


def get_stocks_by_sector(sector: str) -> list[str]:
    """Return list of symbols belonging to a specific sector."""
    sector_map = get_sector_map()
    return sorted(sym for sym, sec in sector_map.items() if sec == sector)


def get_sectors() -> list[str]:
    """Return list of unique sector names."""
    sector_map = get_sector_map()
    return sorted(set(sector_map.values()))

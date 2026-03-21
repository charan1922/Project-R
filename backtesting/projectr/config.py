"""
Project-R configuration: environment loading, paths, and Dhan credentials.

Walks up from any script directory to find the project root (where package.json lives),
then loads .env.local (Next.js convention) with .env as fallback.
"""

import json
import os
import time
from pathlib import Path

try:
    from dotenv import load_dotenv
except ImportError:
    # python-dotenv not installed — env vars must be set manually or via .env.local
    def load_dotenv(*_args, **_kwargs):
        pass


def _find_project_root() -> Path:
    """Walk up from this file to find the directory containing package.json."""
    current = Path(__file__).resolve().parent
    for _ in range(10):
        if (current / "package.json").exists():
            return current
        parent = current.parent
        if parent == current:
            break
        current = parent
    raise FileNotFoundError("Could not find project root (no package.json found)")


PROJECT_ROOT = _find_project_root()
DATA_DIR = PROJECT_ROOT / "data"
DB_PATH = DATA_DIR / "project-r.db"
TOKEN_CACHE_FILE = DATA_DIR / ".dhan-token.json"
FNO_STOCKS_FILE = PROJECT_ROOT / "lib" / "data" / "fno_stocks_list.json"
FNO_SECTORS_FILE = PROJECT_ROOT / "lib" / "data" / "fno_sectors.json"

# Load environment: .env.local first (Next.js convention), then .env
_env_local = PROJECT_ROOT / ".env.local"
_env_file = PROJECT_ROOT / ".env"
if _env_local.exists():
    load_dotenv(_env_local, override=False)
if _env_file.exists():
    load_dotenv(_env_file, override=False)

DHAN_CLIENT_ID = os.getenv("DHAN_CLIENT_ID", "")
DHAN_ACCESS_TOKEN = os.getenv("DHAN_ACCESS_TOKEN", "")
DHAN_BASE_URL = "https://api.dhan.co"


def get_dhan_token() -> str:
    """
    Get a valid Dhan access token.

    Priority:
    1. Cached token from data/.dhan-token.json (shared with Next.js server)
    2. Static DHAN_ACCESS_TOKEN from .env.local
    """
    if TOKEN_CACHE_FILE.exists():
        try:
            data = json.loads(TOKEN_CACHE_FILE.read_text())
            token = data.get("token", "")
            expires_at = data.get("expiresAt", 0)
            # expiresAt is in milliseconds, check with 1hr buffer
            if token and expires_at > (time.time() * 1000) + 3_600_000:
                return token
        except (json.JSONDecodeError, KeyError):
            pass

    if DHAN_ACCESS_TOKEN:
        return DHAN_ACCESS_TOKEN

    raise RuntimeError(
        "No valid Dhan token found. Either:\n"
        "  1. Run the Next.js dev server (pnpm dev) to auto-generate a token, or\n"
        "  2. Set DHAN_ACCESS_TOKEN in .env.local"
    )

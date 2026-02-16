"""
Kalshi API client for Django dashboard.

Reuses the daemon's RSA authentication logic and adds caching for performance.
Credentials are loaded server-side only — never exposed to frontend.
"""
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict, Any, Optional, Tuple
from datetime import datetime, timedelta

# Import daemon's authentication code
KALSHI_DAEMON_DIR = os.getenv('KALSHI_DAEMON_DIR')
if not KALSHI_DAEMON_DIR:
    raise ValueError(
        "KALSHI_DAEMON_DIR environment variable is required. "
        "Set it to the directory containing kalshi_unified.py"
    )
sys.path.insert(0, KALSHI_DAEMON_DIR)
from kalshi_unified import kalshi_request, KALSHI_BASE

# Credential paths (loaded independently of daemon)
SECRETS_DIR = Path(os.getenv('KALSHI_SECRETS_DIR', os.path.expanduser('~/.openclaw/.secrets')))
KALSHI_JSON = SECRETS_DIR / 'kalshi.json'
KALSHI_PEM = SECRETS_DIR / 'kalshi_private.pem'


class KalshiClientError(Exception):
    """Raised when Kalshi API call fails."""
    pass


class CachedKalshiClient:
    """
    Cached wrapper around daemon's kalshi_request().
    
    TTL-based caching:
    - balance: 60s
    - positions: 30s
    - orders: 30s
    - events: 60s
    - markets: 60s
    """
    
    def __init__(self):
        self._cache: Dict[str, Tuple[float, Any]] = {}  # key -> (expiry_timestamp, data)
        self._verify_credentials()
    
    def _verify_credentials(self):
        """Verify credential files exist at startup."""
        if not KALSHI_JSON.exists():
            raise FileNotFoundError(f"Kalshi credentials not found: {KALSHI_JSON}")
        if not KALSHI_PEM.exists():
            raise FileNotFoundError(f"Kalshi private key not found: {KALSHI_PEM}")
    
    def _get_cached(self, key: str, ttl_seconds: int, fetch_fn) -> Any:
        """Get from cache or fetch and cache."""
        now = time.time()
        
        # Check cache
        if key in self._cache:
            expiry, data = self._cache[key]
            if now < expiry:
                return data
        
        # Cache miss or expired — fetch fresh
        try:
            data = fetch_fn()
            self._cache[key] = (now + ttl_seconds, data)
            return data
        except Exception as e:
            # If fetch fails, return stale cache if available
            if key in self._cache:
                _, stale_data = self._cache[key]
                return stale_data
            raise KalshiClientError(f"Kalshi API error: {str(e)}") from e
    
    def get_balance(self) -> Dict[str, Any]:
        """
        Get account balance (60s cache).
        
        Returns:
            {"balance": <cents>}
        """
        def fetch():
            result = kalshi_request('GET', '/trade-api/v2/portfolio/balance')
            balance_cents = result.get('balance', 0)
            return {"balance": balance_cents}
        
        return self._get_cached('balance', ttl_seconds=60, fetch_fn=fetch)
    
    def get_positions(self) -> Dict[str, Any]:
        """
        Get portfolio positions (30s cache).
        
        Returns:
            {"event_positions": [...]}
        """
        def fetch():
            result = kalshi_request('GET', '/trade-api/v2/portfolio/positions')
            return {"event_positions": result.get('event_positions', [])}
        
        return self._get_cached('positions', ttl_seconds=30, fetch_fn=fetch)
    
    def get_orders(self, status: Optional[str] = None, limit: int = 100) -> Dict[str, Any]:
        """
        Get portfolio orders (30s cache).
        
        Args:
            status: Optional filter (e.g., 'open', 'resting')
            limit: Max orders to return
        
        Returns:
            {"orders": [...], "cursor": <str or null>}
        """
        # Build cache key with params
        cache_key = f"orders_{status}_{limit}"
        
        def fetch():
            path = f'/trade-api/v2/portfolio/orders?limit={limit}'
            if status:
                path += f'&status={status}'
            result = kalshi_request('GET', path)
            return {
                "orders": result.get('orders', []),
                "cursor": result.get('cursor')
            }
        
        return self._get_cached(cache_key, ttl_seconds=30, fetch_fn=fetch)
    
    def get_events(self, series_ticker: Optional[str] = None, status: str = 'open', 
                   with_nested_markets: bool = True, limit: int = 100) -> Dict[str, Any]:
        """
        Get events (60s cache).
        
        Args:
            series_ticker: Optional series filter (e.g., 'KXHIGHTPHX')
            status: Event status filter (default: 'open')
            with_nested_markets: Include market details
            limit: Max events to return
        
        Returns:
            {"events": [...], "cursor": <str or null>}
        """
        # Build cache key
        cache_key = f"events_{series_ticker}_{status}_{with_nested_markets}_{limit}"
        
        def fetch():
            path = f'/trade-api/v2/events?status={status}&limit={limit}'
            if series_ticker:
                path += f'&series_ticker={series_ticker}'
            if with_nested_markets:
                path += '&with_nested_markets=true'
            result = kalshi_request('GET', path)
            return {
                "events": result.get('events', []),
                "cursor": result.get('cursor')
            }
        
        return self._get_cached(cache_key, ttl_seconds=60, fetch_fn=fetch)
    
    def get_market(self, ticker: str) -> Dict[str, Any]:
        """
        Get market details (60s cache).
        
        Args:
            ticker: Market ticker (e.g., 'KXHIGHTPHX-26FEB12-T84')
        
        Returns:
            {"market": {...}}
        """
        cache_key = f"market_{ticker}"
        
        def fetch():
            result = kalshi_request('GET', f'/trade-api/v2/markets/{ticker}')
            return {"market": result.get('market', {})}
        
        return self._get_cached(cache_key, ttl_seconds=60, fetch_fn=fetch)
    
    def clear_cache(self):
        """Clear all cached data (useful for testing/debugging)."""
        self._cache.clear()


# Singleton instance
_client = None

def get_client() -> CachedKalshiClient:
    """Get or create singleton Kalshi client."""
    global _client
    if _client is None:
        _client = CachedKalshiClient()
    return _client

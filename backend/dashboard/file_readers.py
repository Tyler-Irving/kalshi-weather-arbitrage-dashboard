"""
File reader layer for daemon data files with mtime-based caching.
Per TICK-002 §7: Reads JSON/JSONL files written by kalshi_unified.py.
"""
import json
import os
from pathlib import Path
from datetime import datetime, date
from typing import Optional
from collections import deque
from django.conf import settings


class CachedFileReader:
    """Reads daemon JSON files with mtime-based cache invalidation."""
    
    def __init__(self):
        self._cache = {}  # path -> (mtime, data)
        self.trading_dir = Path(settings.TRADING_DIR)
    
    def read_json(self, filename: str) -> dict:
        """
        Read JSON file with mtime-based caching.
        Returns empty dict if file doesn't exist (graceful degradation).
        """
        path = self.trading_dir / filename
        
        if not path.exists():
            return {}
        
        try:
            mtime = path.stat().st_mtime
            
            # Check cache
            if path in self._cache and self._cache[path][0] == mtime:
                return self._cache[path][1]
            
            # Read and cache
            with open(path, 'r') as f:
                data = json.load(f)
            
            self._cache[path] = (mtime, data)
            return data
            
        except (json.JSONDecodeError, IOError) as e:
            print(f"Error reading {filename}: {e}")
            return {}
    
    def read_jsonl(self, filename: str, date_filter: Optional[str] = None) -> list:
        """
        Read JSONL with optional date prefix filter.
        date_filter format: 'YYYY-MM-DD'
        Returns empty list if file doesn't exist.
        """
        path = self.trading_dir / filename
        
        if not path.exists():
            return []
        
        entries = []
        
        try:
            with open(path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if not line:
                        continue
                    
                    try:
                        entry = json.loads(line)
                        
                        # Apply date filter if provided
                        if date_filter:
                            ts = entry.get('ts') or entry.get('timestamp') or ''
                            if not ts.startswith(date_filter):
                                continue
                        
                        entries.append(entry)
                        
                    except json.JSONDecodeError:
                        continue  # Skip malformed lines
                        
        except IOError as e:
            print(f"Error reading {filename}: {e}")
            return []
        
        return entries
    
    def read_log_tail(self, filename: str, lines: int = 50) -> list[str]:
        """
        Read last N lines from log file using deque for memory efficiency.
        Returns empty list if file doesn't exist.
        """
        path = self.trading_dir / filename
        
        if not path.exists():
            return []
        
        try:
            with open(path, 'r') as f:
                # Use deque to efficiently keep only last N lines
                # This avoids loading entire file into memory
                tail_lines = deque(f, maxlen=lines)
            return [line.strip() for line in tail_lines]
            
        except IOError as e:
            print(f"Error reading {filename}: {e}")
            return []
    
    def get_file_mtime(self, filename: str) -> Optional[float]:
        """Get modification time of a file, or None if it doesn't exist."""
        path = self.trading_dir / filename
        
        if not path.exists():
            return None
        
        try:
            return path.stat().st_mtime
        except OSError:
            return None


def normalize_paper_trade(entry: dict) -> dict:
    """
    Normalize both paper trade formats into one consistent schema.
    
    Format A: ts, price_cents, cost_cents, action, order_id
    Format B: timestamp, price, cost, + extra fields (forecast, fair_cents, etc.)
    
    Returns normalized dict with timestamp, price_cents, cost_cents, and all extra fields preserved.
    """
    normalized = {}
    
    # Handle timestamp field (ts → timestamp)
    if 'timestamp' in entry:
        normalized['timestamp'] = entry['timestamp']
    elif 'ts' in entry:
        normalized['timestamp'] = entry['ts']
    else:
        normalized['timestamp'] = None
    
    # Handle price field (price → price_cents)
    if 'price_cents' in entry:
        normalized['price_cents'] = entry['price_cents']
    elif 'price' in entry:
        normalized['price_cents'] = entry['price']  # Already in cents
    else:
        normalized['price_cents'] = None
    
    # Handle cost field (cost → cost_cents)
    if 'cost_cents' in entry:
        normalized['cost_cents'] = entry['cost_cents']
    elif 'cost' in entry:
        normalized['cost_cents'] = entry['cost']  # Already in cents
    else:
        normalized['cost_cents'] = None
    
    # Standard fields (present in both formats or one format)
    normalized['ticker'] = entry.get('ticker')
    normalized['side'] = entry.get('side')
    normalized['count'] = entry.get('count')
    
    # Format A specific fields
    normalized['order_id'] = entry.get('order_id')
    normalized['action'] = entry.get('action')
    
    # Format B specific fields (preserved if present)
    normalized['city'] = entry.get('city')
    normalized['forecast'] = entry.get('forecast')
    normalized['fair_cents'] = entry.get('fair_cents')
    normalized['edge'] = entry.get('edge')
    normalized['confidence'] = entry.get('confidence')
    normalized['settlement_date'] = entry.get('settlement_date')
    normalized['description'] = entry.get('description')
    normalized['status'] = entry.get('status')
    normalized['reason'] = entry.get('reason')
    
    return normalized


# Singleton instance
file_reader = CachedFileReader()

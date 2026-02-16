# Kalshi API Proxy

Server-side Django proxy for Kalshi API calls. Handles RSA authentication and caching while keeping credentials secure.

## Overview

This app proxies Kalshi API requests through Django, keeping RSA private keys and API credentials server-side. The frontend never touches Kalshi directly.

## Architecture

```
React Frontend
     |
     v
Django REST endpoints (/api/v1/kalshi/*)
     |
     v
kalshi_client.py (caching layer)
     |
     v
kalshi_unified.py (daemon's auth code)
     |
     v
Kalshi API (api.elections.kalshi.com)
```

## Components

### `kalshi_client.py`
- Imports daemon's `kalshi_request()` for RSA authentication
- Wraps API calls with TTL-based caching:
  - Balance: 60s
  - Positions: 30s
  - Orders: 30s
  - Events: 60s
  - Markets: 60s
- Handles errors gracefully (returns stale cache on failure)
- Singleton pattern for credential reuse

### `views.py`
- Django REST framework views for 5 endpoints
- Error handling: returns JSON errors (not 500 tracebacks)
- Query parameter support for filtering

### `urls.py`
- URL routing for `/api/v1/kalshi/*` endpoints

## Endpoints

### GET `/api/v1/kalshi/balance/`
Returns account balance from Kalshi API.

**Response:**
```json
{"balance": 123456}  // cents
```

**Cache:** 60s

---

### GET `/api/v1/kalshi/positions/`
Returns portfolio positions.

**Response:**
```json
{
  "event_positions": [
    {
      "event_ticker": "KXHIGHTPHX-26FEB12",
      "event_exposure": 800,
      "positions": [...]
    }
  ]
}
```

**Cache:** 30s

---

### GET `/api/v1/kalshi/orders/`
Returns portfolio orders.

**Query params:**
- `status` (optional): Filter by status ('open', 'resting', etc.)
- `limit` (optional): Max orders to return (default: 100)

**Response:**
```json
{
  "orders": [...],
  "cursor": "..." // for pagination
}
```

**Cache:** 30s

---

### GET `/api/v1/kalshi/events/`
Returns events from Kalshi API.

**Query params:**
- `series_ticker` (optional): Filter by series (e.g., 'KXHIGHTPHX')
- `status` (optional): Event status (default: 'open')
- `with_nested_markets` (optional): Include markets (default: true)
- `limit` (optional): Max events (default: 100)

**Response:**
```json
{
  "events": [...],
  "cursor": "..."
}
```

**Cache:** 60s

---

### GET `/api/v1/kalshi/markets/<ticker>/`
Returns market details for a specific ticker.

**Path params:**
- `ticker`: Market ticker (e.g., 'KXHIGHTPHX-26FEB12-T84')

**Response:**
```json
{
  "market": {
    "ticker": "KXHIGHTPHX-26FEB12-T84",
    "yes_ask": 2,
    "yes_bid": 1,
    ...
  }
}
```

**Cache:** 60s

## Credentials

**Required files:**
- `~/.secrets/kalshi.json`
- `~/.secrets/kalshi_private.pem`

These are **never** exposed to API responses. The client verifies they exist at startup.

## Error Handling

All endpoints return proper JSON errors instead of 500 tracebacks:

**503 Service Unavailable:** Kalshi API error
```json
{"error": "Kalshi API error: connection timeout"}
```

**500 Internal Server Error:** Unexpected error
```json
{"error": "Internal server error"}
```

**400 Bad Request:** Invalid query params
```json
{"error": "Invalid query parameter: limit must be an integer"}
```

## Integration with Daemon

This app **imports** the daemon's authentication code directly:

```python
sys.path.insert(0, '~/trading')
from kalshi_unified import kalshi_request
```

Benefits:
- No code duplication
- Daemon's auth logic is single source of truth
- Changes to auth propagate automatically

**Note:** The daemon doesn't need to be running. Credentials are loaded independently.

## Caching Strategy

Cache keys are built from endpoint + params (e.g., `events_KXHIGHTPHX_open_true_100`).

**Stale cache fallback:** If a fresh fetch fails, the client returns the last cached value (even if expired). This ensures the dashboard remains responsive during Kalshi API outages.

To clear cache manually (useful for testing):
```python
from kalshi.kalshi_client import get_client
get_client().clear_cache()
```

## Testing

Manual test:
```bash
# Start Django dev server
cd ~/trading/dashboard/backend
python manage.py runserver

# Test endpoints
curl http://localhost:8000/api/v1/kalshi/balance/
curl http://localhost:8000/api/v1/kalshi/positions/
curl http://localhost:8000/api/v1/kalshi/orders/?limit=10
curl http://localhost:8000/api/v1/kalshi/events/?series_ticker=KXHIGHTPHX
curl http://localhost:8000/api/v1/kalshi/markets/KXHIGHTPHX-26FEB12-T84/
```

## Security

✅ RSA private key stays on disk, loaded once  
✅ No credentials in API responses  
✅ Frontend has zero Kalshi access  
✅ Django session auth (for multi-user future)  
✅ CORS restricted to localhost in development  

## Future Enhancements

- [ ] Rate limiting per IP/user
- [ ] Request logging for audit trail
- [ ] Prometheus metrics (cache hit rate, API latency)
- [ ] Websocket for real-time market updates
- [ ] POST endpoints for placing orders (write path)

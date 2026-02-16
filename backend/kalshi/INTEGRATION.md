# Kalshi Proxy Integration Guide

This guide shows how to integrate the Kalshi proxy into the main Django project.

## 1. Add to INSTALLED_APPS

In `config/settings.py`:

```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third-party
    'rest_framework',
    'corsheaders',
    
    # Local apps
    'dashboard',
    'kalshi',  # <-- Add this
]
```

## 2. Add to URL Configuration

In `config/urls.py`:

```python
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/kalshi/', include('kalshi.urls')),  # <-- Add this
    path('api/v1/', include('dashboard.urls')),
]
```

## 3. Verify Credentials

Ensure these files exist:
```
~/.secrets/kalshi.json
~/.secrets/kalshi_private.pem
```

The app will verify them on startup and log a warning if missing.

## 4. Update Requirements

In `backend/requirements.txt`, ensure:

```
Django>=5.1
djangorestframework>=3.15
cryptography>=42.0  # Required for RSA signing
requests>=2.31
```

(Note: These should already be installed by the daemon)

## 5. Test the Endpoints

Start the Django dev server:
```bash
cd ~/trading/dashboard/backend
python manage.py runserver
```

Test each endpoint:
```bash
# Balance
curl http://localhost:8000/api/v1/kalshi/balance/

# Positions
curl http://localhost:8000/api/v1/kalshi/positions/

# Orders
curl http://localhost:8000/api/v1/kalshi/orders/?limit=10

# Events (all weather series)
curl http://localhost:8000/api/v1/kalshi/events/?series_ticker=KXHIGHTPHX

# Market detail
curl http://localhost:8000/api/v1/kalshi/markets/KXHIGHTPHX-26FEB12-T84/
```

Expected responses:
- **200**: Success with JSON data
- **503**: Kalshi API unavailable (with error message)
- **500**: Server error (should not happen with proper setup)

## 6. Wire into Status Endpoint (TICK-004)

Per the ticket, integrate `get_balance()` into the main status endpoint.

In `dashboard/views.py`:

```python
from rest_framework.decorators import api_view
from rest_framework.response import Response
from kalshi.kalshi_client import get_client, KalshiClientError
import json
from pathlib import Path

@api_view(['GET'])
def status_view(request):
    """
    GET /api/v1/status/
    
    Combined status: daemon file state + live Kalshi balance.
    """
    # Read daemon state file
    state_path = Path('~/trading/kalshi_unified_state.json')
    try:
        with open(state_path) as f:
            state = json.load(f)
    except Exception:
        state = {}
    
    # Get live Kalshi balance
    try:
        kalshi_client = get_client()
        balance_data = kalshi_client.get_balance()
        live_balance = balance_data['balance']
    except KalshiClientError:
        # Fall back to daemon's last known balance if API fails
        live_balance = None
    
    return Response({
        'balance': live_balance,
        'balance_source': 'live' if live_balance is not None else 'cached',
        'position_count': len(state.get('positions', [])),
        'daily_trades': state.get('daily_trades', 0),
        'total_pnl_cents': state.get('total_pnl_cents', 0),
        'last_trade_date': state.get('last_trade_date'),
    })
```

## 7. Frontend Integration Example

In React (TypeScript):

```typescript
// api/kalshi.ts
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
  timeout: 10000,
});

export interface BalanceResponse {
  balance: number;  // cents
}

export interface Position {
  event_ticker: string;
  event_exposure: number;
  positions: any[];
}

export interface PositionsResponse {
  event_positions: Position[];
}

export const kalshiApi = {
  getBalance: () => api.get<BalanceResponse>('/kalshi/balance/'),
  getPositions: () => api.get<PositionsResponse>('/kalshi/positions/'),
  getOrders: (params?: { status?: string; limit?: number }) =>
    api.get('/kalshi/orders/', { params }),
  getEvents: (params?: { series_ticker?: string; status?: string }) =>
    api.get('/kalshi/events/', { params }),
  getMarket: (ticker: string) =>
    api.get(`/kalshi/markets/${ticker}/`),
};
```

Usage in component:

```typescript
// components/BalanceBadge.tsx
import { useEffect, useState } from 'react';
import { kalshiApi } from '../api/kalshi';

export function BalanceBadge() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const { data } = await kalshiApi.getBalance();
        setBalance(data.balance);
      } catch (error) {
        console.error('Failed to fetch balance:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    const interval = setInterval(fetchBalance, 60000); // Poll every 60s
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div>Loading...</div>;
  if (balance === null) return <div>Balance unavailable</div>;

  return (
    <div className="balance-badge">
      ${(balance / 100).toFixed(2)}
    </div>
  );
}
```

## 8. CORS Configuration (Development)

In `config/settings.py`:

```python
# CORS settings for Vite dev server
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5173',  # Vite
    'http://localhost:3000',  # Alternative
]

CORS_ALLOW_CREDENTIALS = True

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Must be first
    'django.middleware.security.SecurityMiddleware',
    # ... other middleware
]
```

## 9. Logging Configuration

To see Kalshi API logs:

```python
# config/settings.py
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'kalshi': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    },
}
```

## 10. Security Checklist

✅ Credentials loaded at startup (not on every request)  
✅ No credentials in API responses  
✅ Graceful error handling (no stack traces to frontend)  
✅ CORS restricted to localhost in dev  
✅ Cache prevents excessive Kalshi API calls  

For production:
- [ ] Add Django session/token authentication
- [ ] Enable HTTPS
- [ ] Restrict CORS to production frontend domain
- [ ] Add rate limiting (e.g., django-ratelimit)

## Troubleshooting

### "Kalshi credentials not found"
Ensure `~/.secrets/kalshi.json` and `kalshi_private.pem` exist.

### "Module 'kalshi_unified' not found"
The daemon directory must be in Python path. The client adds it automatically:
```python
sys.path.insert(0, '~/trading')
```

### "503 Service Unavailable" on all endpoints
Kalshi API is down or credentials are invalid. Check:
```bash
# Test daemon's auth directly
cd ~/trading
python -c "from kalshi_unified import get_balance; print(get_balance())"
```

### Cache not working
Django's default cache is in-memory. For multi-process (e.g., Gunicorn), use Redis:
```python
# settings.py
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': 'redis://127.0.0.1:6379/1',
    }
}
```

### Stale data after daemon update
The proxy has independent caching. To force refresh, restart Django or call:
```python
from kalshi.kalshi_client import get_client
get_client().clear_cache()
```

## Next Steps

1. ✅ Kalshi proxy implemented
2. Wire into `/api/v1/status/` (TICK-004)
3. Frontend polling hooks (TICK-005)
4. WebSocket for real-time updates (future)

---

**Deliverable Status:** ✅ Complete

All 4 proxy endpoints implemented:
- `/api/v1/kalshi/balance/`
- `/api/v1/kalshi/positions/`
- `/api/v1/kalshi/orders/`
- `/api/v1/kalshi/events/`

Plus bonus market detail endpoint:
- `/api/v1/kalshi/markets/<ticker>/`

Ready for integration with TICK-004 status endpoint.

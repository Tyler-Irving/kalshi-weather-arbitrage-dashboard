# API Documentation

Complete reference for all REST API endpoints and WebSocket channels in the Kalshi Weather Trading Dashboard.

**Base URL**: `http://localhost:8000/api/v1/`

**Content Type**: `application/json`

**Authentication**: None (read-only file-based API)

---

## Table of Contents

- [Health & Status](#health--status)
- [Positions](#positions)
- [P&L (Profit & Loss)](#pl-profit--loss)
- [Backtest](#backtest)
- [Logs](#logs)
- [Cities](#cities)
- [Paper Trading](#paper-trading)
- [Reliability Analytics](#reliability-analytics)
- [Cost Analytics](#cost-analytics)
- [Edge Analytics](#edge-analytics)
- [Provider Analytics](#provider-analytics)
- [WebSocket](#websocket)

---

## Health & Status

### GET /api/v1/health/

Health check endpoint for monitoring uptime and daemon availability.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-16T12:00:00.123456"
}
```

**Fields:**
- `status` (string): Always `"ok"` if API is responding
- `timestamp` (string): ISO 8601 timestamp of response

**Use Case**: Monitoring tools, uptime checks, load balancer health probes

**Example:**
```bash
curl http://localhost:8000/api/v1/health/
```

---

### GET /api/v1/status/

Dashboard summary with balance, P&L, position count, and daemon health.

**Response:**
```json
{
  "balance": 12500,
  "starting_balance": 10000,
  "total_pnl_cents": 2500,
  "today_pnl_cents": 350,
  "position_count": 8,
  "daily_trades": 12,
  "daemon_running": true,
  "last_update": "2026-02-16T11:45:32",
  "win_rate_today": 66.67
}
```

**Fields:**
- `balance` (int): Current account balance in cents
- `starting_balance` (int): Initial balance when trading began (cents)
- `total_pnl_cents` (int): Total profit/loss = balance - starting_balance
- `today_pnl_cents` (int): Today's profit/loss in cents
- `position_count` (int): Number of active positions
- `daily_trades` (int): Trades made today (resets at midnight)
- `daemon_running` (bool): `true` if log file updated in last 20 minutes
- `last_update` (string|null): ISO timestamp of last log file modification
- `win_rate_today` (float): Today's win rate percentage (0-100)

**Data Source**: `kalshi_unified_state.json`, `kalshi_pnl.json`, `kalshi_unified_log.txt` (mtime)

**Example:**
```bash
curl http://localhost:8000/api/v1/status/
```

---

## Positions

### GET /api/v1/positions/

Retrieve all active live trading positions (excludes paper trades).

**Response:**
```json
{
  "positions": [
    {
      "ticker": "KXHIGHTSFO-26FEB17-55",
      "city": "SFO",
      "side": "yes",
      "strike": 55,
      "settlement_date": "2026-02-17",
      "quantity": 5,
      "avg_price": 47,
      "cost_cents": 235,
      "edge": 18.5,
      "confidence": 0.872,
      "opened_at": "2026-02-16T10:30:00",
      "ensemble_details": {
        "ensemble_forecast": 59.2,
        "provider_count": 5,
        "noaa_stale": false,
        "noaa_weight": 1.5,
        "gfs_forecast": 58.8,
        "icon_forecast": 59.5,
        "ecmwf_forecast": 59.3,
        "gem_forecast": 58.9
      },
      "paper_trade": false
    }
  ],
  "count": 8
}
```

**Fields (per position):**
- `ticker` (string): Kalshi market ticker symbol
- `city` (string): City code (PHX, SFO, SEA, DC, HOU, NOLA, DAL, BOS, OKC, ATL, MIN)
- `side` (string): `"yes"` or `"no"`
- `strike` (int): Temperature strike price (°F)
- `settlement_date` (string): Date when market settles (YYYY-MM-DD)
- `quantity` (int): Number of contracts held
- `avg_price` (int): Average entry price in cents (0-100)
- `cost_cents` (int): Total cost = quantity × avg_price
- `edge` (float): Estimated edge in cents at entry
- `confidence` (float): Forecast confidence score (0-1)
- `opened_at` (string): ISO timestamp of position entry
- `ensemble_details` (object): Forecast breakdown by provider
- `paper_trade` (bool): Always `false` (paper trades filtered out)

**Query Parameters**: None

**Example:**
```bash
curl http://localhost:8000/api/v1/positions/
```

---

## P&L (Profit & Loss)

### GET /api/v1/pnl/

Full P&L data by day and week.

**Response:**
```json
{
  "daily": {
    "2026-02-16": {
      "pnl_cents": 350,
      "trades": 6,
      "wins": 4,
      "losses": 2
    },
    "2026-02-15": {
      "pnl_cents": -120,
      "trades": 8,
      "wins": 5,
      "losses": 3
    }
  },
  "weeks": {
    "2026-W07": {
      "pnl_cents": 1280,
      "trades": 32,
      "wins": 21,
      "losses": 11
    }
  }
}
```

**Fields:**
- `daily` (object): P&L by date (ISO format YYYY-MM-DD)
  - `pnl_cents` (int): Net profit/loss for the day
  - `trades` (int): Total trades settled that day
  - `wins` (int): Winning trades
  - `losses` (int): Losing trades
- `weeks` (object): P&L by ISO week (YYYY-Wxx format)
  - Same subfields as daily

**Data Source**: `kalshi_pnl.json`

**Example:**
```bash
curl http://localhost:8000/api/v1/pnl/
```

---

### GET /api/v1/pnl/summary/

Aggregated P&L statistics across all trades.

**Response:**
```json
{
  "total_pnl_cents": 2500,
  "total_trades": 124,
  "total_wins": 78,
  "total_losses": 46,
  "win_rate": 62.90,
  "best_day": {
    "date": "2026-02-10",
    "pnl_cents": 580
  },
  "worst_day": {
    "date": "2026-02-08",
    "pnl_cents": -320
  }
}
```

**Fields:**
- `total_pnl_cents` (int): Sum of all daily P&L
- `total_trades` (int): Total trades across all days
- `total_wins` (int): Total winning trades
- `total_losses` (int): Total losing trades
- `win_rate` (float): Percentage win rate (0-100)
- `best_day` (object): Highest single-day P&L
- `worst_day` (object): Lowest single-day P&L

**Example:**
```bash
curl http://localhost:8000/api/v1/pnl/summary/
```

---

### GET /api/v1/pnl/by-city/

P&L breakdown by city with win rates.

**Response:**
```json
[
  {
    "city": "PHX",
    "pnl_cents": 680,
    "trades": 28,
    "wins": 19,
    "losses": 9,
    "win_rate": 67.86
  },
  {
    "city": "SFO",
    "pnl_cents": 420,
    "trades": 22,
    "wins": 14,
    "losses": 8,
    "win_rate": 63.64
  }
]
```

**Fields (per city):**
- `city` (string): City code
- `pnl_cents` (int): Total P&L for this city
- `trades` (int): Total trades
- `wins` (int): Winning trades
- `losses` (int): Losing trades
- `win_rate` (float): Win rate percentage (0-100)

**Sorting**: Descending by `pnl_cents` (most profitable first)

**Data Source**: `kalshi_settlement_log.jsonl` (aggregated)

**Example:**
```bash
curl http://localhost:8000/api/v1/pnl/by-city/
```

---

## Backtest

### GET /api/v1/backtest/

Retrieve backtest log entries (all evaluated opportunities).

**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD, defaults to today)
- `city` (optional): Filter by city code (e.g., `PHX`)
- `action` (optional): Filter by action (`trade` or `skip`)

**Response:**
```json
{
  "entries": [
    {
      "timestamp": "2026-02-16T10:15:23",
      "city": "PHX",
      "ticker": "KXHIGHTPHX-26FEB17-75",
      "strike": 75,
      "side": "yes",
      "action": "trade",
      "skip_reason": null,
      "edge": 22.3,
      "confidence": 0.845,
      "market_yes_price": 52,
      "ensemble_forecast": 78.4,
      "provider_count": 5
    },
    {
      "timestamp": "2026-02-16T10:15:28",
      "city": "SFO",
      "ticker": "KXHIGHTSFO-26FEB17-60",
      "strike": 60,
      "side": "no",
      "action": "skip",
      "skip_reason": "spread_too_wide",
      "edge": 8.5,
      "confidence": 0.712,
      "market_yes_price": 78,
      "ensemble_forecast": 56.2,
      "provider_count": 4
    }
  ],
  "count": 245,
  "date": "2026-02-16"
}
```

**Fields (per entry):**
- `timestamp` (string): ISO timestamp of evaluation
- `city` (string): City code
- `ticker` (string): Market ticker
- `strike` (int): Strike temperature
- `side` (string): `"yes"` or `"no"`
- `action` (string): `"trade"` or `"skip"`
- `skip_reason` (string|null): Reason if skipped (see below)
- `edge` (float): Calculated edge in cents
- `confidence` (float): Forecast confidence (0-1)
- `market_yes_price` (int): Market price for yes side (0-100)
- `ensemble_forecast` (float): Weighted average forecast
- `provider_count` (int): Number of providers contributing

**Skip Reasons:**
- `edge_too_low`: Edge below minimum threshold
- `spread_too_wide`: Bid-ask spread too large
- `near_strike`: Forecast too close to strike (uncertainty)
- `stale_market`: Market hasn't updated recently
- `disagreement`: Models disagree significantly
- `liquidity`: Insufficient volume/open interest
- `ratio_filter`: Fair/market price ratio exceeds limit

**Data Source**: `kalshi_backtest_log.jsonl`

**Example:**
```bash
# Today's trades only
curl http://localhost:8000/api/v1/backtest/?action=trade

# Phoenix skips on Feb 15
curl "http://localhost:8000/api/v1/backtest/?date=2026-02-15&city=PHX&action=skip"
```

---

### GET /api/v1/backtest/stats/

Summary statistics for backtest log (funnel analysis).

**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD, defaults to today)

**Response:**
```json
{
  "date": "2026-02-16",
  "scanned": 245,
  "traded": 12,
  "skipped": 233,
  "skip_reasons": {
    "edge_too_low": 145,
    "spread_too_wide": 52,
    "near_strike": 28,
    "stale_market": 8
  }
}
```

**Fields:**
- `date` (string): Date of data
- `scanned` (int): Total opportunities evaluated
- `traded` (int): Opportunities that resulted in trades
- `skipped` (int): Opportunities skipped
- `skip_reasons` (object): Breakdown of skip reasons with counts

**Example:**
```bash
curl http://localhost:8000/api/v1/backtest/stats/
```

---

## Logs

### GET /api/v1/logs/

Retrieve the last N lines from the daemon log file.

**Query Parameters:**
- `lines` (optional): Number of lines to return (default: 50, max: 500)

**Response:**
```json
{
  "lines": [
    "2026-02-16 10:30:15 [INFO] Poll cycle 1247 starting",
    "2026-02-16 10:30:18 [INFO] Fetching NOAA forecasts for 11 cities",
    "2026-02-16 10:30:22 [INFO] Ensemble forecast PHX: 78.4°F (5 providers)",
    "2026-02-16 10:30:25 [TRADE] OPENED yes KXHIGHTPHX-26FEB17-75 qty=5 @47¢ edge=22.3¢",
    "2026-02-16 10:30:30 [INFO] Circuit breaker check: OK (daily loss: -120¢ / -500¢)"
  ],
  "count": 5
}
```

**Fields:**
- `lines` (array): Log lines (most recent last)
- `count` (int): Number of lines returned

**Data Source**: `kalshi_unified_log.txt` (tail)

**Example:**
```bash
# Last 100 lines
curl "http://localhost:8000/api/v1/logs/?lines=100"
```

---

## Cities

### GET /api/v1/cities/

City-level forecast data aggregated from current positions.

**Response:**
```json
{
  "cities": [
    {
      "city": "PHX",
      "ensemble_forecast": 78.4,
      "active_positions": 2,
      "confidence": 0.845,
      "noaa_stale": false,
      "provider_count": 5
    },
    {
      "city": "SFO",
      "ensemble_forecast": 59.2,
      "active_positions": 1,
      "confidence": 0.812,
      "noaa_stale": false,
      "provider_count": 5
    }
  ],
  "count": 11
}
```

**Fields (per city):**
- `city` (string): City code
- `ensemble_forecast` (float|null): Latest ensemble forecast (°F)
- `active_positions` (int): Number of open positions for this city
- `confidence` (float|null): Highest confidence score among positions
- `noaa_stale` (bool): True if NOAA data is stale (>6 hours old)
- `provider_count` (int): Number of providers contributing to forecast

**Sorting**: By confidence (descending, highest confidence first)

**Data Source**: `kalshi_unified_state.json` (positions aggregated by city)

**Example:**
```bash
curl http://localhost:8000/api/v1/cities/
```

---

## Paper Trading

### GET /api/v1/paper-trades/

All paper trades (simulated positions) with normalized schema.

**Query Parameters:**
- `date` (optional): Filter by date (YYYY-MM-DD)

**Response:**
```json
{
  "trades": [
    {
      "timestamp": "2026-02-16T09:15:42",
      "city": "PHX",
      "ticker": "KXHIGHTPHX-26FEB17-72",
      "side": "yes",
      "strike": 72,
      "quantity": 8,
      "price": 45,
      "cost_cents": 360,
      "edge": 19.2,
      "confidence": 0.823,
      "ensemble_forecast": 75.8,
      "market_yes_price": 45,
      "settlement_date": "2026-02-17"
    }
  ],
  "count": 47
}
```

**Fields (per trade):**
- `timestamp` (string): ISO timestamp of trade
- `city` (string): City code
- `ticker` (string): Market ticker
- `side` (string): `"yes"` or `"no"`
- `strike` (int): Strike temperature
- `quantity` (int): Contracts traded (simulated)
- `price` (int): Entry price (cents, 0-100)
- `cost_cents` (int): Total cost = quantity × price
- `edge` (float): Estimated edge at entry
- `confidence` (float): Forecast confidence (0-1)
- `ensemble_forecast` (float): Ensemble forecast (°F)
- `market_yes_price` (int): Market yes price
- `settlement_date` (string): Settlement date (YYYY-MM-DD)

**Sorting**: Newest first (by timestamp descending)

**Data Source**: `paper_trades.jsonl`

**Note**: This endpoint normalizes two historical schema formats for compatibility.

**Example:**
```bash
# All paper trades
curl http://localhost:8000/api/v1/paper-trades/

# Today's paper trades
curl "http://localhost:8000/api/v1/paper-trades/?date=2026-02-16"
```

---

### GET /api/v1/paper-trades/summary/

Aggregated paper trading metrics.

**Response:**
```json
{
  "total_trades": 47,
  "total_cost_cents": 18560,
  "cities": ["PHX", "SFO", "SEA", "DC", "HOU", "NOLA", "DAL"],
  "by_side": {
    "yes": 28,
    "no": 19
  },
  "avg_edge": 16.8,
  "avg_confidence": 0.784
}
```

**Fields:**
- `total_trades` (int): Total paper trades
- `total_cost_cents` (int): Sum of all paper trade costs
- `cities` (array): Unique city codes traded
- `by_side` (object): Count of yes vs no trades
- `avg_edge` (float): Average edge across all trades
- `avg_confidence` (float): Average confidence score

**Example:**
```bash
curl http://localhost:8000/api/v1/paper-trades/summary/
```

---

## Reliability Analytics

### GET /api/v1/reliability/summary/

Win rates by city, side, confidence bucket, and edge bracket with streak tracking.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city code
- `min_trades` (optional): Minimum trades per bucket (default: 0)

**Response:**
```json
{
  "by_city": {
    "PHX": {
      "trades": 28,
      "wins": 19,
      "losses": 9,
      "win_rate": 67.86
    },
    "SFO": {
      "trades": 22,
      "wins": 14,
      "losses": 8,
      "win_rate": 63.64
    }
  },
  "by_side": {
    "yes": {
      "trades": 72,
      "wins": 46,
      "losses": 26,
      "win_rate": 63.89
    },
    "no": {
      "trades": 52,
      "wins": 32,
      "losses": 20,
      "win_rate": 61.54
    }
  },
  "by_confidence": {
    "0.6-0.7": {
      "trades": 18,
      "wins": 10,
      "losses": 8,
      "win_rate": 55.56
    },
    "0.7-0.8": {
      "trades": 42,
      "wins": 26,
      "losses": 16,
      "win_rate": 61.90
    },
    "0.8-0.9": {
      "trades": 38,
      "wins": 27,
      "losses": 11,
      "win_rate": 71.05
    },
    "0.9-1.0": {
      "trades": 26,
      "wins": 21,
      "losses": 5,
      "win_rate": 80.77
    }
  },
  "by_edge": {
    "10-15": {
      "trades": 35,
      "wins": 20,
      "losses": 15,
      "win_rate": 57.14
    },
    "15-25": {
      "trades": 48,
      "wins": 31,
      "losses": 17,
      "win_rate": 64.58
    },
    "25-40": {
      "trades": 28,
      "wins": 19,
      "losses": 9,
      "win_rate": 67.86
    },
    "40-100": {
      "trades": 13,
      "wins": 10,
      "losses": 3,
      "win_rate": 76.92
    }
  },
  "streaks": {
    "current_streak": 3,
    "current_streak_type": "win",
    "longest_win_streak": 8,
    "longest_loss_streak": 4
  },
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Fields:**
- `by_city` (object): Win rate breakdown by city
- `by_side` (object): Win rate for yes vs no trades
- `by_confidence` (object): Win rate by confidence bucket
- `by_edge` (object): Win rate by edge bracket
- `streaks` (object): Current and longest win/loss streaks
- `filters` (object): Applied query parameters

**Data Source**: `kalshi_settlement_log.jsonl`

**Example:**
```bash
# Last 30 days, all cities
curl "http://localhost:8000/api/v1/reliability/summary/?days=30"

# Phoenix only, min 5 trades per bucket
curl "http://localhost:8000/api/v1/reliability/summary/?city=PHX&min_trades=5"
```

---

### GET /api/v1/reliability/by-city/

Per-city reliability breakdown with average edge.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `min_trades` (optional): Minimum trades per city (default: 0)

**Response:**
```json
{
  "cities": [
    {
      "city": "PHX",
      "trades": 28,
      "wins": 19,
      "losses": 9,
      "win_rate": 67.86,
      "avg_edge": 21.4
    },
    {
      "city": "SFO",
      "trades": 22,
      "wins": 14,
      "losses": 8,
      "win_rate": 63.64,
      "avg_edge": 18.2
    }
  ],
  "count": 11,
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Sorting**: Descending by `win_rate` (best performing cities first)

**Example:**
```bash
curl "http://localhost:8000/api/v1/reliability/by-city/?min_trades=10"
```

---

### GET /api/v1/reliability/streaks/

Current and longest win/loss streaks.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city

**Response:**
```json
{
  "current_streak": 3,
  "current_streak_type": "win",
  "longest_win_streak": 8,
  "longest_loss_streak": 4,
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Example:**
```bash
curl http://localhost:8000/api/v1/reliability/streaks/
```

---

## Cost Analytics

### GET /api/v1/cost/summary/

Average cost, profit, ROI, and break-even win rate.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city

**Response:**
```json
{
  "avg_cost_cents": 298,
  "avg_profit_cents": 32,
  "total_cost_cents": 37250,
  "total_profit_cents": 4050,
  "roi": 10.87,
  "break_even_win_rate": 54.2,
  "actual_win_rate": 62.9,
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Fields:**
- `avg_cost_cents` (int): Average cost per trade
- `avg_profit_cents` (int): Average profit per trade
- `total_cost_cents` (int): Total invested
- `total_profit_cents` (int): Total profit (sum of P&L)
- `roi` (float): Return on investment (%)
- `break_even_win_rate` (float): Win rate needed to break even (%)
- `actual_win_rate` (float): Actual win rate achieved (%)

**Example:**
```bash
curl http://localhost:8000/api/v1/cost/summary/
```

---

### GET /api/v1/cost/by-edge-bucket/

ROI by edge bracket.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city
- `min_trades` (optional): Minimum trades per bucket (default: 0)

**Response:**
```json
{
  "edge_buckets": [
    {
      "edge_bucket": "10-15",
      "roi": 3.2,
      "avg_pnl": 9.5,
      "count": 35
    },
    {
      "edge_bucket": "15-20",
      "roi": 8.7,
      "avg_pnl": 26.3,
      "count": 28
    },
    {
      "edge_bucket": "20-30",
      "roi": 14.5,
      "avg_pnl": 43.1,
      "count": 22
    },
    {
      "edge_bucket": "30-100",
      "roi": 22.3,
      "avg_pnl": 67.8,
      "count": 13
    }
  ],
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Example:**
```bash
curl "http://localhost:8000/api/v1/cost/by-edge-bucket/?min_trades=15"
```

---

## Edge Analytics

### GET /api/v1/edge/calibration/

Edge calibration curve (predicted edge vs actual win rate).

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city
- `min_trades` (optional): Minimum trades per bucket (default: 0)
- `bucket_size` (optional): Edge bucket width (default: 5)

**Response:**
```json
{
  "calibration": [
    {
      "edge_bucket": "10-15",
      "predicted_edge": 12.5,
      "actual_win_rate": 58.3,
      "expected_win_rate": 62.5,
      "count": 24
    },
    {
      "edge_bucket": "15-20",
      "predicted_edge": 17.5,
      "actual_win_rate": 64.7,
      "expected_win_rate": 67.5,
      "count": 31
    },
    {
      "edge_bucket": "20-25",
      "predicted_edge": 22.5,
      "actual_win_rate": 71.2,
      "expected_win_rate": 72.5,
      "count": 18
    }
  ],
  "bucket_size": 5,
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Use Case**: Plot calibration curve to verify edge prediction accuracy. Well-calibrated models have `actual_win_rate ≈ expected_win_rate`.

**Example:**
```bash
curl "http://localhost:8000/api/v1/edge/calibration/?bucket_size=10"
```

---

### GET /api/v1/edge/confidence-calibration/

Confidence calibration curve (predicted confidence vs actual win rate).

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city
- `min_trades` (optional): Minimum trades per bucket (default: 0)
- `bucket_size` (optional): Confidence bucket width (default: 0.05)

**Response:**
```json
{
  "calibration": [
    {
      "confidence_bucket": "0.60-0.65",
      "predicted_confidence": 0.625,
      "actual_win_rate": 61.2,
      "count": 15
    },
    {
      "confidence_bucket": "0.75-0.80",
      "predicted_confidence": 0.775,
      "actual_win_rate": 74.3,
      "count": 28
    },
    {
      "confidence_bucket": "0.85-0.90",
      "predicted_confidence": 0.875,
      "actual_win_rate": 83.1,
      "count": 22
    }
  ],
  "bucket_size": 0.05,
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Use Case**: Verify confidence scores are well-calibrated (e.g., 80% confidence should win ~80% of the time).

**Example:**
```bash
curl http://localhost:8000/api/v1/edge/confidence-calibration/
```

---

### GET /api/v1/edge/bias/

Systematic bias indicator (over/under-estimation of edge).

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city

**Response:**
```json
{
  "bias": -2.3,
  "avg_predicted_edge": 18.7,
  "avg_actual_edge": 16.4,
  "color": "green",
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Fields:**
- `bias` (float): Average difference between predicted and actual edge (cents)
- `avg_predicted_edge` (float): Average predicted edge
- `avg_actual_edge` (float): Average realized edge based on win rate
- `color` (string): `"green"` (well-calibrated, |bias| < 5), `"amber"` (slight bias, |bias| < 15), `"red"` (miscalibrated, |bias| ≥ 15)

**Interpretation:**
- **Positive bias**: Overestimating edge (too optimistic)
- **Negative bias**: Underestimating edge (too conservative)
- **Near zero**: Well-calibrated

**Example:**
```bash
curl http://localhost:8000/api/v1/edge/bias/
```

---

## Provider Analytics

### GET /api/v1/providers/accuracy/

Per-provider forecast accuracy statistics.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city
- `min_trades` (optional): Minimum trades per provider (default: 0)

**Response:**
```json
{
  "providers": [
    {
      "provider": "ECMWF",
      "trades": 98,
      "wins": 67,
      "losses": 31,
      "win_rate": 68.37,
      "avg_forecast_error": 1.8
    },
    {
      "provider": "ICON",
      "trades": 102,
      "wins": 66,
      "losses": 36,
      "win_rate": 64.71,
      "avg_forecast_error": 2.1
    },
    {
      "provider": "NOAA",
      "trades": 95,
      "wins": 61,
      "losses": 34,
      "win_rate": 64.21,
      "avg_forecast_error": 2.3
    },
    {
      "provider": "GFS",
      "trades": 104,
      "wins": 65,
      "losses": 39,
      "win_rate": 62.50,
      "avg_forecast_error": 2.5
    },
    {
      "provider": "GEM",
      "trades": 89,
      "wins": 54,
      "losses": 35,
      "win_rate": 60.67,
      "avg_forecast_error": 2.7
    }
  ],
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Fields (per provider):**
- `provider` (string): Provider name (NOAA, GFS, ICON, ECMWF, GEM)
- `trades` (int): Trades where this provider contributed
- `wins` (int): Winning trades
- `losses` (int): Losing trades
- `win_rate` (float): Win rate percentage (0-100)
- `avg_forecast_error` (float): Average absolute error (°F)

**Sorting**: Descending by `win_rate` (best performing first)

**Example:**
```bash
curl "http://localhost:8000/api/v1/providers/accuracy/?days=30"
```

---

### GET /api/v1/providers/staleness/

NOAA staleness impact on win rate.

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city

**Response:**
```json
{
  "staleness_impact": {
    "fresh": {
      "trades": 82,
      "wins": 56,
      "losses": 26,
      "win_rate": 68.29
    },
    "stale": {
      "trades": 42,
      "wins": 24,
      "losses": 18,
      "win_rate": 57.14
    },
    "win_rate_delta": -11.15
  },
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Fields:**
- `fresh` (object): Stats when NOAA data is fresh (<6 hours old)
- `stale` (object): Stats when NOAA data is stale (≥6 hours old)
- `win_rate_delta` (float): Difference in win rate (stale - fresh)

**Use Case**: Quantify performance degradation when NOAA forecasts are stale.

**Example:**
```bash
curl http://localhost:8000/api/v1/providers/staleness/
```

---

### GET /api/v1/providers/dropout/

Performance by provider count (missing data scenarios).

**Query Parameters:**
- `days` (optional): Limit to last N days
- `city` (optional): Filter by city

**Response:**
```json
{
  "dropout_impact": {
    "5": {
      "trades": 78,
      "wins": 54,
      "losses": 24,
      "win_rate": 69.23
    },
    "4": {
      "trades": 32,
      "wins": 19,
      "losses": 13,
      "win_rate": 59.38
    },
    "3": {
      "trades": 14,
      "wins": 7,
      "losses": 7,
      "win_rate": 50.00
    }
  },
  "filters": {
    "days": null,
    "city": null,
    "min_trades": 0
  }
}
```

**Fields:**
- Key (string): Number of providers (5 = all providers, 4 = one missing, etc.)
- `trades` (int): Trades with this provider count
- `wins`, `losses`, `win_rate`: Performance stats

**Use Case**: Assess reliability when provider data is unavailable.

**Example:**
```bash
curl http://localhost:8000/api/v1/providers/dropout/
```

---

## WebSocket

### WS /ws/logs/

Real-time log streaming via WebSocket.

**Connection:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/logs/');
```

**Message Format (Server → Client):**
```json
{
  "type": "log_line",
  "line": "2026-02-16 10:30:25 [TRADE] OPENED yes KXHIGHTPHX-26FEB17-75 qty=5 @47¢ edge=22.3¢",
  "timestamp": "2026-02-16T10:30:25.123456"
}
```

**Message Types:**
- `log_line`: New log line appended to file
- `connection_established`: Sent immediately after connection
- `error`: Server-side error (rare)

**Client Implementation Example:**
```javascript
const ws = new WebSocket('ws://localhost:8000/ws/logs/');

ws.onopen = () => {
  console.log('WebSocket connected');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'log_line') {
    console.log(data.line);
    // Append to UI log viewer
  }
};

ws.onerror = (error) => {
  console.error('WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log('WebSocket disconnected:', event.code, event.reason);
  // Implement reconnection logic
};
```

**Reconnection Strategy:**
```javascript
let reconnectDelay = 1000; // Start with 1 second

function connect() {
  const ws = new WebSocket('ws://localhost:8000/ws/logs/');
  
  ws.onopen = () => {
    reconnectDelay = 1000; // Reset delay on successful connection
  };
  
  ws.onclose = () => {
    console.log(`Reconnecting in ${reconnectDelay}ms...`);
    setTimeout(connect, reconnectDelay);
    reconnectDelay = Math.min(reconnectDelay * 2, 30000); // Exponential backoff, max 30s
  };
  
  return ws;
}

const ws = connect();
```

**Data Source**: `kalshi_unified_log.txt` (tailed in real-time)

**Performance Notes:**
- WebSocket pushes new lines only (not entire file on each update)
- Log file is polled every 1 second for new lines (configurable in consumer)
- Maximum 100 lines pushed per batch to avoid overwhelming client

---

## Error Responses

All endpoints return standard error responses on failure:

**Format:**
```json
{
  "error": "Description of what went wrong",
  "status_code": 400
}
```

**Common Error Codes:**
- `400 Bad Request`: Invalid query parameters
- `404 Not Found`: Endpoint does not exist
- `500 Internal Server Error`: Backend error (file read failure, JSON parse error)
- `503 Service Unavailable`: Backend cannot access data files (TRADING_DIR misconfigured)

**Example Error:**
```json
{
  "error": "File not found: kalshi_unified_state.json",
  "status_code": 503
}
```

**Graceful Degradation:**
Most endpoints return empty arrays/objects rather than errors when data files are missing:
- Missing JSON file: `{}`
- Missing JSONL file: `[]`
- Missing log file: `[]`

---

## Rate Limits

**None** — This is a read-only file-based API with no external service dependencies. There are no rate limits.

**Best Practices:**
- Frontend polling intervals: 10-30 seconds for status/positions, 60 seconds for P&L
- WebSocket log streaming: Use for real-time updates instead of polling `/logs/` endpoint

---

## Versioning

**Current Version**: `v1`

All endpoints are prefixed with `/api/v1/`. Future breaking changes will increment version (e.g., `/api/v2/`).

**Backward Compatibility:**
- `v1` endpoints will remain stable and supported indefinitely
- New features added to `v1` will be non-breaking (additive only)
- Deprecated fields will be marked in documentation 6 months before removal

---

## Testing API Endpoints

**Using cURL:**
```bash
# Health check
curl http://localhost:8000/api/v1/health/

# Get positions
curl http://localhost:8000/api/v1/positions/

# P&L summary
curl http://localhost:8000/api/v1/pnl/summary/

# Backtest stats for today
curl http://localhost:8000/api/v1/backtest/stats/

# Analytics: Phoenix reliability (last 30 days)
curl "http://localhost:8000/api/v1/reliability/by-city/?days=30&city=PHX"
```

**Using HTTPie:**
```bash
http GET localhost:8000/api/v1/status/
http GET localhost:8000/api/v1/backtest/ city==PHX action==trade
```

**Using Postman:**
Import collection: `http://localhost:8000/api/v1/` (all endpoints discoverable)

**Using Browser:**
Navigate to `http://localhost:8000/api/v1/positions/` (JSON response rendered in browser)

---

## Summary

The Kalshi Weather Trading Dashboard API provides **27 REST endpoints** and **1 WebSocket channel** for comprehensive monitoring and analytics:

- **7 Core Endpoints**: Status, positions, P&L, backtest, logs, cities, paper trades
- **11 Reliability Endpoints**: Win rates, calibration, streaks, bias detection
- **5 Cost Endpoints**: ROI analysis, profit tracking, break-even calculations
- **3 Edge Endpoints**: Calibration curves, confidence analysis, systematic bias
- **3 Provider Endpoints**: Accuracy comparison, staleness impact, dropout analysis
- **1 WebSocket Channel**: Real-time log streaming

All endpoints are **read-only**, **stateless**, and **file-based** (no database required). Data refreshes every 15 minutes as the trading daemon updates files.

For questions or issues, see the main [README.md](./README.md) or open an issue on GitHub.

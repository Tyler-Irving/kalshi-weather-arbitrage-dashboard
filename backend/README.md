# Kalshi Dashboard Backend

Django REST API backend for the Kalshi weather trading dashboard.

## Architecture

- **Django 5.1** with Django REST Framework
- **Django Channels** for WebSocket support (log streaming in TICK-009)
- **File-based data source**: Reads daemon's JSON/JSONL files (no DB duplication)
- **SQLite**: For dashboard-specific models (settings, annotations, alerts)

## Setup

```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Create superuser (optional)
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

## API Endpoints

All endpoints under `/api/v1/`:

### Dashboard Data (reads daemon files)

| Method | Endpoint | Source | Description |
|--------|----------|--------|-------------|
| `GET` | `/api/v1/status/` | `state.json` + log mtime | Balance, position count, daemon status |
| `GET` | `/api/v1/positions/` | `state.json` | Open positions with ensemble details |
| `GET` | `/api/v1/pnl/` | `pnl.json` | Daily/weekly P&L breakdown |
| `GET` | `/api/v1/pnl/summary/` | `pnl.json` | Aggregate stats (win rate, total) |
| `GET` | `/api/v1/backtest/` | `backtest.jsonl` | Today's opportunity log |
| `GET` | `/api/v1/backtest/stats/` | `backtest.jsonl` | Funnel stats |
| `GET` | `/api/v1/logs/` | `log.txt` | Last N log lines (`?lines=50`) |

### Query Parameters

- `/api/v1/backtest/?date=YYYY-MM-DD&city=PHX&action=trade`
- `/api/v1/backtest/stats/?date=YYYY-MM-DD`
- `/api/v1/logs/?lines=100`

## Configuration

Environment variables:

- `DJANGO_SECRET_KEY`: Django secret key (optional, has default for dev)
- `TRADING_DIR`: Path to daemon files directory (default: `~/trading/kalshi-weather-bot`)

## Daemon Status Logic

Status endpoint checks `kalshi_unified_log.txt` modification time:

- **Active** 🟢: Updated within 20 minutes
- **Stale** 🟡: 20-60 minutes old
- **Down** 🔴: >60 minutes or missing

## Models

### DashboardSettings
User preferences: refresh interval, log lines, dark mode, telegram alerts.

### TradeAnnotation
User notes attached to specific trades (by ticker).

### AlertRule
Configurable alert conditions (future feature).

## File Reader Layer

`dashboard/file_readers.py` implements:

- `read_json(filename)` — mtime-based cache for state/pnl files
- `read_jsonl(filename, date_filter=None)` — for backtest log
- `read_log_tail(filename, lines=50)` — for log viewing
- Graceful degradation: returns empty data if files missing (no 500 errors)

## Testing

```bash
# Run all tests
python manage.py test

# Test specific endpoints
curl http://localhost:8000/api/v1/status/
curl http://localhost:8000/api/v1/positions/
curl http://localhost:8000/api/v1/backtest/?date=2026-02-12
```

## CORS

Configured for Vite dev server on `localhost:5173`.

## Next Steps

- **TICK-009**: WebSocket log streaming consumer
- **TICK-010**: Kalshi API proxy endpoints
- **TICK-011**: Settings/annotations CRUD endpoints

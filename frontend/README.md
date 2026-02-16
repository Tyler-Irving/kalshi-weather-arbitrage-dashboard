# Kalshi Weather Trading Dashboard - Frontend

React + TypeScript frontend for the Kalshi weather arbitrage trading dashboard.

## Tech Stack

- **Framework**: React 19 + TypeScript 5.6
- **Build Tool**: Vite 6
- **State Management**: Zustand 5
- **Styling**: Tailwind CSS 4
- **HTTP Client**: Axios

## Architecture

Per [TICK-002 Architecture](../../../.openclaw/shared/docs/TICK-002-architecture.md):
- **Data Source**: Reads daemon state files via Django REST API
- **API Proxy**: All Kalshi API calls go through Django backend (`/api/v1/*`)
- **Real-Time**: Polling for status/positions (30s), WebSocket for logs
- **State**: Zustand store with derived alerts

## Project Structure

```
src/
├── api/
│   └── client.ts          # Axios instance, base URL /api/v1
├── hooks/
│   └── usePolling.ts      # Generic polling hook (30s default)
├── stores/
│   └── dashboardStore.ts  # Zustand: status, positions, pnl, alerts
├── components/
│   ├── layout/
│   │   └── Header.tsx     # Top navigation bar
│   ├── HeroBanner.tsx     # KPI strip (balance, P&L, positions, daemon status)
│   └── AlertBanner.tsx    # Dismissible alerts (daemon down, limits)
├── types/
│   ├── position.ts        # Position, EnsembleDetails
│   ├── pnl.ts             # PnLData, PnLBucket
│   └── backtest.ts        # BacktestEntry
├── styles/
│   └── globals.css        # Tailwind + dark theme
├── App.tsx                # Main layout with panel grid
└── main.tsx               # React entry point
```

## Setup

```bash
# Install dependencies
npm install

# Start dev server (proxies /api -> :8000, /ws -> ws://:8000)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Development

- Dev server runs on `http://localhost:5173`
- Backend must be running on `http://localhost:8000`
- Vite proxy forwards `/api/*` and `/ws/*` to Django

## Dark Theme

Custom Tailwind colors per TICK-001 §6:
- Background: `#0d1117` (near-black)
- Text: `#c9d1d9` (light gray)
- Monospace for data
- Green/red for P&L, amber for warnings

## Responsive Layout

- Desktop (≥1024px): 2-column grid
- Tablet (≥768px): 2-column grid
- Mobile (<768px): Single column stacked

## Acceptance Criteria

- [x] Vite + React + TypeScript scaffold
- [x] Proxy `/api/*` → `:8000`
- [x] Hero banner with 7 KPIs (balance, P&L, positions, trades, daemon, win rate)
- [x] Alert banner with derived alerts (dismissible)
- [x] Zustand store with status, positions, pnl state
- [x] Polling hook (30s default, auto-cleanup on unmount)
- [x] Dark theme (Tailwind custom colors)
- [x] TypeScript types (Position, EnsembleDetails, PnLData, BacktestEntry)
- [x] Responsive grid layout (panels stack on mobile)
- [x] Panel placeholders for future tickets (Positions, P&L, Logs, Backtest, Heatmap)

## Next Steps (Follow-on Tickets)

- **TICK-006**: Positions table with ensemble detail expansion
- **TICK-007**: P&L chart (Recharts time-series)
- **TICK-008**: Log feed with WebSocket streaming
- **TICK-009**: Backtest stats and opportunity funnel
- **TICK-010**: City heatmap (11 cities, forecast vs market)

## Backend Integration

This frontend expects the following Django REST endpoints:

- `GET /api/v1/status/` → `{ balance, total_pnl_cents, today_pnl_cents, position_count, daily_trades, daemon_running, win_rate_today }`
- `GET /api/v1/positions/` → `{ positions: Position[] }`
- `GET /api/v1/pnl/` → `{ weeks: {}, daily: {} }`

When backend is unavailable, the app uses mock data (balance: 0, P&L: 0, positions: 0).

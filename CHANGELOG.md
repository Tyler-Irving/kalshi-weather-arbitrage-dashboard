# Changelog

All notable changes to the Kalshi Weather Trading Dashboard will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned
- Dark mode theme toggle
- Advanced filtering (date range picker, multi-city selection)
- Export to CSV (positions, P&L, analytics)
- Email/SMS alerts for trade events
- Historical performance comparison (month-over-month)
- Provider forecast accuracy timeline chart
- Redis channel layer for horizontal scaling
- PostgreSQL integration for analytics caching
- Mobile responsive improvements
- Docker Compose production setup
- Kubernetes deployment manifests

---

## [1.0.0] - 2026-02-16

### Initial Public Release

The first stable release of the Kalshi Weather Trading Dashboard—a professional real-time monitoring and analytics platform for automated weather prediction market trading on Kalshi.

### Added

#### Core Dashboard Features
- **Real-time Status Panel**: Balance, daily P&L, position count, daemon health indicator
- **Position Table**: Sortable table of active positions with ensemble forecast details, edge calculations, and settlement dates
- **P&L Chart**: Interactive time-series visualization of daily profit/loss with Recharts
- **City Heatmap**: Geographical performance breakdown showing which cities are most profitable
- **Backtest Log Viewer**: Paginated table of all evaluated opportunities with filters for date, city, and action
- **Paper Trading Monitor**: Dedicated tab for paper trades with trade history and summary metrics
- **Settings Drawer**: Configurable API endpoint, WebSocket toggle, and refresh interval controls

#### Backend (Django 4.2 + DRF)
- **7 Core REST Endpoints**:
  - `GET /api/v1/health/` - Health check and uptime monitoring
  - `GET /api/v1/status/` - Dashboard summary with balance, P&L, position count
  - `GET /api/v1/positions/` - All active trading positions (excludes paper trades)
  - `GET /api/v1/pnl/` - Full P&L data by day and week
  - `GET /api/v1/backtest/` - Backtest log entries with filters
  - `GET /api/v1/logs/` - Last N lines from daemon log file
  - `GET /api/v1/cities/` - City-level forecast data and position aggregations

- **27 Analytics Endpoints**:
  - **Reliability Analytics** (11 endpoints): Win rates by city/side/confidence/edge, streaks, calibration
  - **Cost Analytics** (5 endpoints): ROI, profit per trade, break-even win rate
  - **Edge Analytics** (5 endpoints): Edge calibration curve, confidence calibration, systematic bias detection
  - **Provider Analytics** (6 endpoints): Per-provider accuracy, staleness impact, dropout analysis

- **File Reader Architecture**:
  - Stateless, file-based data layer (no database required)
  - JSON/JSONL parsers with date filtering
  - Graceful degradation for missing files
  - Log tail utility for real-time streaming

- **WebSocket Support**:
  - Django Channels 4.0 with Daphne ASGI server
  - Real-time log streaming via `/ws/logs/`
  - Automatic reconnection with exponential backoff

#### Frontend (React 19 + TypeScript)
- **Modern Stack**:
  - React 19.0 with Concurrent Mode
  - TypeScript 5.6 for full type safety
  - Vite 6.0 for fast HMR and optimized builds
  - Tailwind CSS 4.0 with custom Frost theme
  - Zustand 5.0 for lightweight state management
  - Recharts 3.7 for declarative charts
  - Axios 1.7 for HTTP requests

- **Component Library**:
  - Reusable UI components: PositionsTable, PnLChart, CityHeatmap, BacktestStats
  - Layout components: Header, NavBar, HeroBanner, SettingsDrawer
  - Alert system: ErrorBanner, AlertBanner, Toast notifications

- **State Management**:
  - Zustand stores: `dashboardStore`, `paperStore`
  - Centralized API calls with error handling
  - Auto-refresh with configurable intervals (10-60 seconds)

- **Real-time Updates**:
  - WebSocket client for log streaming
  - Reconnection logic with exponential backoff (1s → 30s max)
  - HTTP polling for structured data (positions, P&L)

#### Documentation
- **README.md**: Comprehensive overview with quick start, features, architecture, configuration, deployment, and troubleshooting
- **API.md**: Complete REST API reference with request/response examples for all 27 endpoints
- **ARCHITECTURE.md**: Technical deep-dive into system design, data flow, component interactions, and technology choices
- **DEPLOYMENT.md**: Production deployment guide (systemd + Nginx, Docker, cloud platforms, SSL setup, monitoring, security hardening)
- **CONTRIBUTING.md**: GitHub contribution guidelines (code style, commit messages, PR process, testing)
- **CHANGELOG.md**: Version history and release notes

#### Developer Experience
- **Hot Reload**: Backend auto-reload (Django) and frontend HMR (Vite)
- **Type Safety**: Full TypeScript coverage in frontend, type hints in backend
- **Code Quality**:
  - Python: Black formatter, Flake8 linter
  - TypeScript: Prettier formatter, ESLint with React hooks rules
- **Environment Configuration**: `.env` files for backend, Vite env vars for frontend

#### Deployment Ready
- **Production Configuration**:
  - Systemd service files for Daphne ASGI server
  - Nginx reverse proxy config (HTTP/HTTPS, WebSocket support, gzip compression)
  - SSL/TLS setup with Let's Encrypt
  - Security best practices (SECRET_KEY rotation, CORS restrictions, HTTPS-only cookies)
- **Docker Support**:
  - Multi-stage Dockerfiles for backend and frontend
  - Docker Compose configuration for containerized deployment
  - Health checks for all services
- **Monitoring**:
  - Health check endpoint for uptime monitoring
  - Systemd journal logging
  - Nginx access/error logs
  - Log rotation configuration

### Technical Details

#### Data Sources
All data is read from files generated by the [Kalshi Weather Arbitrage Bot](https://github.com/Tyler-Irving/kalshi-weather-bot):
- `kalshi_unified_state.json` - Current positions and balance
- `kalshi_pnl.json` - Daily/weekly P&L aggregations
- `kalshi_unified_log.txt` - Timestamped log entries
- `kalshi_backtest_log.jsonl` - All evaluated opportunities
- `kalshi_settlement_log.jsonl` - Settled positions with outcomes
- `paper_trades.jsonl` - Simulated trades (paper trading mode)

#### Architecture Highlights
- **File-Reader Architecture**: No database required—all data read on-demand from daemon output files
- **Stateless API**: Backend holds no state, reads files on every request for eventual consistency
- **Real-time Where Needed**: WebSockets for log streaming, HTTP polling for structured data
- **Separation of Concerns**: Trading logic (daemon) completely decoupled from visualization (dashboard)

#### Performance
- **Frontend Bundle Size**: ~500KB gzipped (including React, Recharts, Tailwind)
- **API Response Times**: <50ms for status/positions, <200ms for analytics (file I/O bound)
- **WebSocket Latency**: <100ms for log line delivery (1-second polling interval)

#### Browser Compatibility
- **Modern Browsers**: Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- **Responsive Design**: Optimized for desktop (1920px), laptop (1440px), tablet (1024px)

### Known Limitations

- **No Authentication**: Read-only dashboard with no user accounts (single-user deployment)
- **No Database**: All data is file-based (no historical data persistence beyond daemon files)
- **Single-Node**: No horizontal scaling (WebSocket connections tied to single Daphne instance)
- **File Locking**: Concurrent reads may be slow on networked filesystems (NFS, SMB)

### Migration Notes

This is the initial release. No migration required.

### Breaking Changes

None (initial release)

### Deprecations

None (initial release)

### Security

- **SECRET_KEY**: Django secret key for CSRF protection (must be configured in `.env`)
- **CORS**: Cross-Origin Resource Sharing restricted to specified origins
- **HTTPS**: Recommended for production (Let's Encrypt configuration included)
- **File Permissions**: Dashboard user must have read access to daemon files
- **No Sensitive Data**: Dashboard is read-only and exposes no secrets (Kalshi API keys stored separately)

### Contributors

- Tyler Irving ([@Tyler-Irving](https://github.com/Tyler-Irving)) - Initial development and release

---

## Version History

- **[1.0.0]** - 2026-02-16 - Initial public release

---

## Links

- [Repository](https://github.com/Tyler-Irving/kalshi-dashboard)
- [Issues](https://github.com/Tyler-Irving/kalshi-dashboard/issues)
- [Releases](https://github.com/Tyler-Irving/kalshi-dashboard/releases)
- [Trading Daemon](https://github.com/Tyler-Irving/kalshi-weather-bot)

---

## Changelog Format

This changelog follows these conventions:

### Categories
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be-removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

### Version Format
- **[X.Y.Z]** - YYYY-MM-DD
- **X (major)**: Breaking changes
- **Y (minor)**: New features (backward compatible)
- **Z (patch)**: Bug fixes (backward compatible)

### Reference Style
- Issues: `#123`
- Pull Requests: `#456`
- Commits: `abc1234`

---

**Note**: This changelog is maintained manually. For a complete list of changes, see the [commit history](https://github.com/Tyler-Irving/kalshi-dashboard/commits/main).

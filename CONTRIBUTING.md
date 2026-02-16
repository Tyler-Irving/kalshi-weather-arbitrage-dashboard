# Contributing to Kalshi Weather Trading Dashboard

Thank you for your interest in contributing! This document provides guidelines for contributing code, documentation, bug reports, and feature requests.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Improving Documentation](#improving-documentation)
  - [Contributing Code](#contributing-code)
- [Development Setup](#development-setup)
- [Coding Standards](#coding-standards)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing Guidelines](#testing-guidelines)
- [Release Process](#release-process)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors, regardless of experience level, gender identity, sexual orientation, disability, personal appearance, race, ethnicity, age, religion, or nationality.

### Expected Behavior

- **Be respectful**: Treat all contributors with respect and kindness
- **Be constructive**: Provide helpful feedback focused on the work, not the person
- **Be collaborative**: Work together to find the best solutions
- **Be patient**: Remember that everyone was a beginner once

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing others' private information without permission
- Any conduct that would be inappropriate in a professional setting

### Enforcement

Violations of the Code of Conduct should be reported to [maintainer email]. All complaints will be reviewed and investigated promptly and fairly.

---

## How Can I Contribute?

### Reporting Bugs

**Before submitting a bug report:**
1. Check the [existing issues](https://github.com/Tyler-Irving/kalshi-dashboard/issues) to avoid duplicates
2. Verify the bug exists in the latest version
3. Collect relevant information (logs, screenshots, environment details)

**How to submit a good bug report:**

Use the **Bug Report** issue template and include:

- **Title**: Brief, specific description (e.g., "P&L chart shows incorrect data for Feb 15")
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Steps to reproduce**:
  1. Go to '...'
  2. Click on '...'
  3. Scroll down to '...'
  4. See error
- **Environment**:
  - OS: Ubuntu 22.04 / macOS 14.2 / Windows 11
  - Browser: Chrome 121 / Firefox 122 / Safari 17
  - Python version: 3.11.7
  - Node version: 20.11.0
- **Screenshots**: If applicable
- **Logs**: Relevant error messages or stack traces

**Example:**
```markdown
## Bug: P&L Chart Shows Negative Values as Positive

**Expected**: Losing days should display as negative bars (below zero line)
**Actual**: All bars display above zero line, regardless of P&L sign

**Steps to Reproduce**:
1. Navigate to Dashboard tab
2. Scroll to P&L Chart section
3. Observe Feb 15 entry (should be -$3.20 loss)
4. Chart shows +$3.20 (positive bar)

**Environment**:
- OS: Ubuntu 22.04
- Browser: Chrome 121
- Dashboard version: 1.0.0

**Screenshot**: [attached]

**Suspected Cause**: `Math.abs()` applied to `pnl_cents` in PnLChart.tsx line 42
```

---

### Suggesting Features

**Before submitting a feature request:**
1. Check the [roadmap](README.md#project-status) to see if it's already planned
2. Search existing [issues](https://github.com/Tyler-Irving/kalshi-dashboard/issues?q=is%3Aissue+label%3Aenhancement) to avoid duplicates
3. Consider whether it aligns with the project's scope

**How to submit a good feature request:**

Use the **Feature Request** issue template and include:

- **Title**: Clear, concise description (e.g., "Add dark mode toggle")
- **Problem statement**: What user need does this address?
- **Proposed solution**: How should it work?
- **Alternatives considered**: Other approaches you've thought about
- **Use case**: Concrete examples of when this would be useful
- **Priority**: Low / Medium / High (from your perspective)
- **Willingness to contribute**: Are you willing to implement this?

**Example:**
```markdown
## Feature Request: Dark Mode Theme

**Problem**: Dashboard is hard to read in low-light environments (evening trading sessions)

**Proposed Solution**:
- Add a theme toggle button in the header (sun/moon icon)
- Store preference in localStorage
- Implement dark color palette:
  - Background: #1a1a1a
  - Text: #e0e0e0
  - Cards: #2a2a2a
  - Accents: Keep Frost blue (#3b82f6)

**Alternatives Considered**:
- System theme detection (`prefers-color-scheme`)
- Time-based auto-switching (dark after 8pm)

**Use Case**:
As a trader monitoring positions at night, I want a dark theme so my eyes don't get fatigued from bright screens.

**Priority**: Medium

**I'm willing to contribute**: Yes (familiar with Tailwind dark mode)
```

---

### Improving Documentation

Documentation improvements are always welcome! This includes:

- **Fixing typos or unclear wording**
- **Adding examples**
- **Expanding API documentation**
- **Writing tutorials or guides**
- **Translating documentation** (future)

**How to contribute documentation:**

1. Fork the repository
2. Edit the relevant `.md` file (README.md, API.md, ARCHITECTURE.md, etc.)
3. Preview your changes locally
4. Submit a pull request with prefix `docs:` in title

**Example PR title:** `docs: Add troubleshooting section for WebSocket disconnections`

---

### Contributing Code

See [Development Setup](#development-setup) and [Pull Request Process](#pull-request-process) below.

---

## Development Setup

### Prerequisites

- **Python 3.10+** (3.11 or 3.12 recommended)
- **Node.js 18+** (20 LTS recommended)
- **Git 2.30+**

### Initial Setup

```bash
# Fork repository on GitHub, then clone your fork
git clone https://github.com/YourUsername/kalshi-dashboard.git
cd kalshi-dashboard

# Add upstream remote
git remote add upstream https://github.com/Tyler-Irving/kalshi-dashboard.git

# Fetch upstream
git fetch upstream
```

### Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Install development dependencies
pip install -r requirements-dev.txt  # If exists

# Create .env file
cp .env.example .env
# Edit .env with your TRADING_DIR path

# Generate SECRET_KEY
python manage.py generate_secret_key

# Run migrations (no-op currently, but good practice)
python manage.py migrate

# Run development server
python manage.py runserver
# Backend available at http://localhost:8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
# Frontend available at http://localhost:5173
```

### WebSocket Development

For testing WebSocket features, use Daphne instead of Django's `runserver`:

```bash
cd backend
source venv/bin/activate
daphne -b 0.0.0.0 -p 8000 config.asgi:application
```

### Running Tests

**Backend tests:**
```bash
cd backend
python manage.py test dashboard.tests
```

**Frontend tests:**
```bash
cd frontend
npm run test  # When test suite is added
```

---

## Coding Standards

### Python (Backend)

**Style Guide**: [PEP 8](https://pep8.org/) with Black formatter

**Formatter**: Black (line length 120)
```bash
black backend/ --line-length 120
```

**Linter**: Flake8
```bash
flake8 backend/ --max-line-length 120 --exclude=venv,migrations
```

**Type Hints**: Encouraged but not required
```python
def calculate_edge(forecast: float, market_price: int) -> float:
    return forecast - market_price
```

**Imports**: Organized with isort
```bash
isort backend/ --profile black
```

Order:
1. Standard library
2. Third-party packages
3. Django modules
4. Local modules

**Naming Conventions**:
- Variables/functions: `snake_case`
- Classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Private methods: `_leading_underscore`

**Example:**
```python
from datetime import datetime
from typing import List, Optional

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from dashboard.file_readers import FileReader

FILE_READER = FileReader(settings.TRADING_DIR)

@api_view(['GET'])
def get_positions(request) -> Response:
    """
    Retrieve all active trading positions.
    
    Returns:
        Response: JSON containing positions array and count
    """
    state = FILE_READER.read_json('kalshi_unified_state.json')
    positions = state.get('positions', [])
    
    # Filter out paper trades
    live_positions = [p for p in positions if not p.get('paper_trade', False)]
    
    return Response({
        'positions': live_positions,
        'count': len(live_positions)
    })
```

### TypeScript/React (Frontend)

**Style Guide**: [Airbnb React/JSX Style Guide](https://github.com/airbnb/javascript/tree/master/react)

**Formatter**: Prettier (2 spaces, single quotes)
```bash
npx prettier --write "src/**/*.{ts,tsx}"
```

**Linter**: ESLint
```bash
npm run lint
npm run lint -- --fix  # Auto-fix
```

**Configuration** (`.eslintrc.cjs`):
```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    'react-hooks/exhaustive-deps': 'warn',
  },
};
```

**Naming Conventions**:
- Components: `PascalCase` (e.g., `PositionsTable.tsx`)
- Hooks: `use` prefix (e.g., `useDashboardStore`)
- Utility functions: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Types/Interfaces: `PascalCase`

**Component Structure**:
```typescript
import { useEffect, useState } from 'react';
import { fetchPositions } from '../config/api';
import { Position } from '../types/position';

interface PositionsTableProps {
  refreshInterval?: number;
}

export const PositionsTable = ({ refreshInterval = 10000 }: PositionsTableProps) => {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPositions = async () => {
      try {
        const response = await fetchPositions();
        setPositions(response.data.positions);
      } catch (error) {
        console.error('Failed to fetch positions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPositions();
    const interval = setInterval(loadPositions, refreshInterval);
    return () => clearInterval(interval);
  }, [refreshInterval]);

  if (loading) return <div>Loading...</div>;

  return (
    <table className="min-w-full divide-y divide-gray-200">
      {/* Table content */}
    </table>
  );
};
```

**TypeScript Best Practices**:
- Always define prop types with `interface` or `type`
- Use `unknown` instead of `any` when type is uncertain
- Define return types for complex functions
- Use generics for reusable components

---

## Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/) for clear, structured commit history.

### Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: New feature (e.g., `feat(analytics): add provider accuracy endpoint`)
- **fix**: Bug fix (e.g., `fix(chart): correct negative P&L display`)
- **docs**: Documentation only (e.g., `docs(readme): add deployment section`)
- **style**: Code style/formatting (no logic change)
- **refactor**: Code restructuring (no behavior change)
- **perf**: Performance improvement
- **test**: Adding or updating tests
- **chore**: Build process, dependencies, tooling

### Scope (optional)

The part of the codebase affected:
- `backend`, `frontend`, `api`, `ui`, `charts`, `analytics`, `docs`

### Subject

- Use imperative mood ("add" not "added" or "adds")
- Don't capitalize first letter
- No period at the end
- Limit to 50 characters

### Body (optional)

- Explain **what** and **why** (not how)
- Wrap at 72 characters
- Separate from subject with blank line

### Footer (optional)

- Reference issues: `Closes #123`, `Fixes #456`
- Breaking changes: `BREAKING CHANGE: description`

### Examples

**Good commits:**
```
feat(api): add edge calibration endpoint

Implements /api/v1/edge/calibration/ with configurable bucket size.
Returns predicted vs actual win rate for model calibration analysis.

Closes #42
```

```
fix(chart): handle missing P&L data gracefully

Previously crashed when kalshi_pnl.json was missing.
Now displays empty state with helpful message.

Fixes #58
```

```
docs(contributing): add commit message guidelines

Explains Conventional Commits format with examples
to help new contributors write clear commit messages.
```

**Bad commits:**
```
Updated files
Fixed bug
WIP
asdfasdf
```

---

## Pull Request Process

### Before Submitting

1. **Create a feature branch** from `main`:
   ```bash
   git checkout -b feature/my-feature-name
   ```

2. **Keep commits focused**: One logical change per commit

3. **Test your changes**:
   - Backend: `python manage.py test`
   - Frontend: `npm run lint`
   - Manual testing: Verify feature works in browser

4. **Update documentation** if adding features:
   - Update README.md if user-facing
   - Add/update docstrings for new functions
   - Update API.md for new endpoints

5. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

### Submitting the PR

1. **Push to your fork**:
   ```bash
   git push origin feature/my-feature-name
   ```

2. **Open Pull Request** on GitHub

3. **Fill out PR template** with:
   - **Title**: Brief description (follows commit message format)
   - **Description**:
     - What changed and why
     - How to test it
     - Screenshots (if UI changes)
     - Breaking changes (if any)
   - **Related Issues**: Link with `Closes #123` or `Relates to #456`

**PR Template Example:**
```markdown
## Description
Adds a dark mode theme toggle to the dashboard header.

## Changes
- Added theme toggle button (sun/moon icon) in Header component
- Implemented dark color palette with Tailwind dark: variants
- Stored theme preference in localStorage
- Added smooth transition animations

## Testing
1. Click theme toggle in header
2. Verify colors switch to dark mode
3. Refresh page and confirm preference persists
4. Test all pages (Dashboard, Backtest, Paper Trading)

## Screenshots
[Light mode screenshot]
[Dark mode screenshot]

## Breaking Changes
None

Closes #78
```

### Review Process

1. **Automated checks** will run (lint, tests)
2. **Maintainer review** (may take 1-3 days)
3. **Address feedback**:
   - Make requested changes
   - Push new commits to your branch
   - Respond to comments
4. **Approval and merge** by maintainer

### After Merge

1. **Delete your branch**:
   ```bash
   git branch -d feature/my-feature-name
   git push origin --delete feature/my-feature-name
   ```

2. **Sync your fork**:
   ```bash
   git checkout main
   git pull upstream main
   git push origin main
   ```

---

## Testing Guidelines

### Backend Tests

**Location**: `backend/dashboard/tests/`

**Framework**: Django TestCase

**Example test:**
```python
from django.test import TestCase
from dashboard.file_readers import FileReader

class FileReaderTests(TestCase):
    def test_read_json_returns_dict(self):
        """Test that read_json returns a dictionary"""
        reader = FileReader('/tmp/test_data')
        result = reader.read_json('test.json')
        self.assertIsInstance(result, dict)
    
    def test_read_json_handles_missing_file(self):
        """Test graceful handling of missing files"""
        reader = FileReader('/tmp/nonexistent')
        result = reader.read_json('missing.json')
        self.assertEqual(result, {})
```

**Run specific test:**
```bash
python manage.py test dashboard.tests.FileReaderTests.test_read_json_returns_dict
```

### Frontend Tests (Future)

**Framework**: Vitest + React Testing Library

**Example test** (to be implemented):
```typescript
import { render, screen } from '@testing-library/react';
import { PositionsTable } from '../PositionsTable';

describe('PositionsTable', () => {
  it('displays loading state initially', () => {
    render(<PositionsTable />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders positions when data loaded', async () => {
    render(<PositionsTable />);
    const table = await screen.findByRole('table');
    expect(table).toBeInTheDocument();
  });
});
```

### Manual Testing Checklist

Before submitting PR, verify:

- [ ] Backend `/api/v1/health/` returns 200
- [ ] All API endpoints return expected data structure
- [ ] WebSocket connection establishes successfully
- [ ] Frontend loads without console errors
- [ ] All tabs (Dashboard, Backtest, Paper Trading) render correctly
- [ ] Charts display data properly
- [ ] Responsive layout works on different screen sizes
- [ ] No regressions (existing features still work)

---

## Release Process

**For Maintainers:**

### Semantic Versioning

We follow [SemVer](https://semver.org/): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (e.g., 1.0.0 → 2.0.0)
- **MINOR**: New features, backward compatible (e.g., 1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, backward compatible (e.g., 1.0.0 → 1.0.1)

### Release Steps

1. **Update CHANGELOG.md**:
   ```markdown
   ## [1.1.0] - 2026-02-20
   
   ### Added
   - Dark mode theme toggle (#78)
   - Provider accuracy timeline chart (#82)
   
   ### Fixed
   - Negative P&L display in charts (#58)
   - WebSocket reconnection logic (#65)
   
   ### Changed
   - Improved error messages for missing files (#71)
   ```

2. **Update version numbers**:
   - `backend/config/settings.py`: `VERSION = '1.1.0'`
   - `frontend/package.json`: `"version": "1.1.0"`

3. **Create release commit**:
   ```bash
   git add CHANGELOG.md backend/config/settings.py frontend/package.json
   git commit -m "chore: release v1.1.0"
   ```

4. **Tag release**:
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin main --tags
   ```

5. **Create GitHub Release**:
   - Go to [Releases](https://github.com/Tyler-Irving/kalshi-dashboard/releases)
   - Click "Draft a new release"
   - Select tag `v1.1.0`
   - Title: `v1.1.0`
   - Description: Copy from CHANGELOG.md
   - Attach binaries (if applicable)
   - Publish release

---

## Recognition

Contributors will be:
- Listed in CHANGELOG.md for their contributions
- Added to GitHub Contributors page
- Mentioned in release notes for significant features
- Eligible for "Contributor" badge (future)

---

## Questions?

- **General questions**: Open a [GitHub Discussion](https://github.com/Tyler-Irving/kalshi-dashboard/discussions)
- **Bug reports**: Open an [Issue](https://github.com/Tyler-Irving/kalshi-dashboard/issues)
- **Security issues**: Email [security contact] (do not open public issue)

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to the Kalshi Weather Trading Dashboard!** 🎉

Your help makes this project better for everyone.

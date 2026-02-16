#!/bin/bash
# VERIFY_BEFORE_PUSH.sh - Pre-commit sanitization check for Dashboard Release
# Ensures no personal data, secrets, or state files before GitHub push

set -e
ERRORS=0
WARNINGS=0

echo "=================================================="
echo "  Dashboard Release - Pre-Push Verification"
echo "=================================================="
echo ""

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Change to script directory
cd "$(dirname "$0")"

echo "[1/8] Checking for personal paths..."
PERSONAL_PATHS=$(grep -r "tirving" . 2>/dev/null | grep -v ".git" | grep -v "VERIFY_BEFORE_PUSH.sh" || true)
if [ -n "$PERSONAL_PATHS" ]; then
    echo -e "${RED}✗ FAIL${NC}: Found 'tirving' references:"
    echo "$PERSONAL_PATHS"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No 'tirving' references found"
fi

HOME_PATHS=$(grep -r "/home/" . 2>/dev/null | grep -v ".git" | grep -v "VERIFY_BEFORE_PUSH.sh" | grep -v "node_modules" | grep -v "/home/user/" | grep -v "/home/trading/" || true)
if [ -n "$HOME_PATHS" ]; then
    echo -e "${RED}✗ FAIL${NC}: Found '/home/' absolute paths (excluding example paths /home/user/ and /home/trading/):"
    echo "$HOME_PATHS"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No personal '/home/' absolute paths found (example paths OK)"
fi

MNT_PATHS=$(grep -r "/mnt/c" . 2>/dev/null | grep -v ".git" | grep -v "VERIFY_BEFORE_PUSH.sh" || true)
if [ -n "$MNT_PATHS" ]; then
    echo -e "${RED}✗ FAIL${NC}: Found '/mnt/c' Windows paths:"
    echo "$MNT_PATHS"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No '/mnt/c' Windows paths found"
fi

echo ""
echo "[2/8] Checking for secrets and sensitive data..."

# Check for .env files (excluding .env.example files)
ENV_FILES=$(find . -name ".env*" -not -name "*.example" -not -path "*/node_modules/*" -not -path "*/.git/*" 2>/dev/null || true)
if [ -n "$ENV_FILES" ]; then
    echo -e "${RED}✗ FAIL${NC}: Found .env files that should not be committed:"
    echo "$ENV_FILES"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No .env files found (*.example files are OK)"
fi

# Check for API keys patterns
API_KEYS=$(grep -r -i "api[_-]key\s*=\s*['\"][^'\"]\+" . 2>/dev/null | grep -v ".git" | grep -v "VERIFY_BEFORE_PUSH.sh" | grep -v "node_modules" || true)
if [ -n "$API_KEYS" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Found potential API key patterns:"
    echo "$API_KEYS"
    WARNINGS=$((WARNINGS+1))
fi

# Check for hardcoded secrets patterns
SECRETS=$(grep -r -E "(password|secret|token)\s*=\s*['\"][^'\"]{8,}" . 2>/dev/null | grep -v ".git" | grep -v "VERIFY_BEFORE_PUSH.sh" | grep -v "node_modules" | grep -v "SECRET_KEY.*get_random" || true)
if [ -n "$SECRETS" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Found potential hardcoded secrets:"
    echo "$SECRETS"
    WARNINGS=$((WARNINGS+1))
fi

echo ""
echo "[3/8] Verifying .gitignore exists..."
if [ ! -f ".gitignore" ]; then
    echo -e "${RED}✗ FAIL${NC}: .gitignore file missing"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: .gitignore exists"
    
    # Check for essential entries
    REQUIRED_IGNORES=(".env" "venv/" "node_modules/" "__pycache__/" "*.pyc" "dist/" "db.sqlite3")
    for item in "${REQUIRED_IGNORES[@]}"; do
        if ! grep -q "$item" .gitignore; then
            echo -e "${RED}✗ FAIL${NC}: .gitignore missing required entry: $item"
            ERRORS=$((ERRORS+1))
        fi
    done
fi

echo ""
echo "[4/8] Verifying LICENSE exists..."
if [ ! -f "LICENSE" ]; then
    echo -e "${RED}✗ FAIL${NC}: LICENSE file missing"
    ERRORS=$((ERRORS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: LICENSE exists"
    if grep -q "MIT License" LICENSE && grep -q "2026" LICENSE; then
        echo -e "${GREEN}✓ PASS${NC}: LICENSE format verified (MIT, 2026)"
    else
        echo -e "${YELLOW}⚠ WARNING${NC}: LICENSE format may be incorrect"
        WARNINGS=$((WARNINGS+1))
    fi
fi

echo ""
echo "[5/8] Verifying documentation files..."
REQUIRED_DOCS=("README.md" "API.md" "ARCHITECTURE.md" "DEPLOYMENT.md" "CONTRIBUTING.md" "CHANGELOG.md")
for doc in "${REQUIRED_DOCS[@]}"; do
    if [ ! -f "$doc" ]; then
        echo -e "${RED}✗ FAIL${NC}: Missing documentation: $doc"
        ERRORS=$((ERRORS+1))
    else
        echo -e "${GREEN}✓ PASS${NC}: $doc exists"
    fi
done

echo ""
echo "[6/8] Checking for state files and databases..."
STATE_FILES=$(find . -name "*.db" -o -name "*.sqlite*" -o -name "*.json" 2>/dev/null | grep -v "node_modules" | grep -v "package.json" | grep -v "package-lock.json" | grep -v "tsconfig.json" | grep -v ".git" || true)
if [ -n "$STATE_FILES" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Found potential state files:"
    echo "$STATE_FILES"
    WARNINGS=$((WARNINGS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No state files found"
fi

echo ""
echo "[7/8] Checking for log files..."
LOG_FILES=$(find . -name "*.log" -o -name "*.jsonl" 2>/dev/null | grep -v ".git" || true)
if [ -n "$LOG_FILES" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Found log files:"
    echo "$LOG_FILES"
    WARNINGS=$((WARNINGS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No log files found"
fi

echo ""
echo "[8/8] Checking for Python cache and build artifacts..."
ARTIFACTS=$(find . -name "__pycache__" -o -name "*.pyc" -o -name "*.egg-info" 2>/dev/null | grep -v ".git" || true)
if [ -n "$ARTIFACTS" ]; then
    echo -e "${YELLOW}⚠ WARNING${NC}: Found build artifacts (should be in .gitignore):"
    echo "$ARTIFACTS"
    WARNINGS=$((WARNINGS+1))
else
    echo -e "${GREEN}✓ PASS${NC}: No build artifacts found"
fi

echo ""
echo "=================================================="
echo "  Verification Summary"
echo "=================================================="
if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✓ ALL CHECKS PASSED${NC}"
    echo "Repository is ready for push to GitHub"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠ PASSED WITH $WARNINGS WARNING(S)${NC}"
    echo "Review warnings before pushing"
    exit 0
else
    echo -e "${RED}✗ FAILED: $ERRORS ERROR(S), $WARNINGS WARNING(S)${NC}"
    echo "Fix errors before pushing to GitHub"
    exit 1
fi

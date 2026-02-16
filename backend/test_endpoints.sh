#!/bin/bash
# Test script for all 7 REST API endpoints
# Run with: ./test_endpoints.sh

BASE_URL="http://localhost:8000/api/v1"

echo "=== Testing Django Backend Endpoints ==="
echo ""

echo "1. Testing /status/ endpoint..."
curl -s "${BASE_URL}/status/" | python3 -m json.tool
echo ""

echo "2. Testing /positions/ endpoint..."
curl -s "${BASE_URL}/positions/" | python3 -m json.tool | head -20
echo ""

echo "3. Testing /pnl/ endpoint..."
curl -s "${BASE_URL}/pnl/" | python3 -m json.tool | head -20
echo ""

echo "4. Testing /pnl/summary/ endpoint..."
curl -s "${BASE_URL}/pnl/summary/" | python3 -m json.tool
echo ""

echo "5. Testing /backtest/ endpoint with filters..."
curl -s "${BASE_URL}/backtest/?date=2026-02-12&action=trade" | python3 -m json.tool | head -20
echo ""

echo "6. Testing /backtest/stats/ endpoint..."
curl -s "${BASE_URL}/backtest/stats/?date=2026-02-12" | python3 -m json.tool | head -20
echo ""

echo "7. Testing /logs/ endpoint..."
curl -s "${BASE_URL}/logs/?lines=5" | python3 -m json.tool
echo ""

echo "=== All tests complete ==="

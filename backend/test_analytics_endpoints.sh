#!/bin/bash
# Quick test script for analytics endpoints

BASE_URL="http://localhost:8000/api/v1"

echo "Testing Analytics Endpoints..."
echo "================================"

# Reliability endpoints
echo -e "\n1. Testing /reliability/summary/"
curl -s "${BASE_URL}/reliability/summary/" | jq -r '.by_city | keys | .[]' || echo "  Empty or error"

echo -e "\n2. Testing /reliability/by-city/"
curl -s "${BASE_URL}/reliability/by-city/" | jq '.cities | length' || echo "  Empty or error"

echo -e "\n3. Testing /reliability/streaks/"
curl -s "${BASE_URL}/reliability/streaks/" | jq '.current_streak' || echo "  Empty or error"

# Cost endpoints
echo -e "\n4. Testing /cost/summary/"
curl -s "${BASE_URL}/cost/summary/" | jq '.total_trades' || echo "  Empty or error"

echo -e "\n5. Testing /cost/by-edge-bucket/"
curl -s "${BASE_URL}/cost/by-edge-bucket/" | jq '.edge_buckets | length' || echo "  Empty or error"

# Edge endpoints
echo -e "\n6. Testing /edge/calibration/"
curl -s "${BASE_URL}/edge/calibration/" | jq '.calibration | length' || echo "  Empty or error"

echo -e "\n7. Testing /edge/confidence-calibration/"
curl -s "${BASE_URL}/edge/confidence-calibration/" | jq '.calibration | length' || echo "  Empty or error"

echo -e "\n8. Testing /edge/bias/"
curl -s "${BASE_URL}/edge/bias/" | jq '.bias' || echo "  Empty or error"

# Provider endpoints
echo -e "\n9. Testing /providers/accuracy/"
curl -s "${BASE_URL}/providers/accuracy/" | jq '.providers | keys | length' || echo "  Empty or error"

echo -e "\n10. Testing /providers/staleness/"
curl -s "${BASE_URL}/providers/staleness/" | jq '.staleness_impact.fresh.count' || echo "  Empty or error"

echo -e "\n11. Testing /providers/dropout/"
curl -s "${BASE_URL}/providers/dropout/" | jq '.dropout_impact.full_ensemble.count' || echo "  Empty or error"

echo -e "\n================================"
echo "Testing complete!"
echo ""
echo "Note: If settlement log doesn't exist yet, all endpoints will return empty data."
echo "Once trades settle, rerun this test to verify actual data."

#!/bin/bash

# Manual test of sync-with-courier endpoint
# This tests the complete flow from courier selection to manifest generation

echo "=== Testing iThink Order Sync with Courier Selection ==="
echo ""

# Configuration
API_BASE="http://localhost:3000/api"
TOKEN="your_auth_token_here"  # Replace with actual token
ORDER_ID="1"  # Replace with actual order ID

# Test 1: Check if order exists
echo "1. Checking order status..."
curl -X GET "${API_BASE}/orders/${ORDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 2: Get available couriers for the order
echo "2. Getting available couriers..."
curl -X GET "${API_BASE}/orders/${ORDER_ID}/shipping/couriers" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n\n"

# Test 3: Sync with selected courier (iThink)
echo "3. Syncing order with selected courier (Delhivery)..."
curl -X POST "${API_BASE}/orders/${ORDER_ID}/sync-with-courier" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "logistics": "delhivery",
    "s_type": "standard"
  }' \
  -w "\nStatus: %{http_code}\n\n"

# Test 4: Generate manifest
echo "4. Generating manifest..."
curl -X POST "${API_BASE}/orders/manifest/generate" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"orderIds\": [${ORDER_ID}]
  }" \
  -w "\nStatus: %{http_code}\n\n"

echo "=== Tests completed ==="

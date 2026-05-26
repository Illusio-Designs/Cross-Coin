# How to Debug Warehouse ID & Manifest Issues

## Step 1: Start the Backend with Full Logging

```bash
cd Backend
npm start
```

Keep this terminal open to watch logs.

## Step 2: Run the Test Script

In a separate terminal:

**PowerShell (Recommended):**
```powershell
cd "C:\Users\K N Corporation\Cross-Coin"
.\test-curl.ps1 -OrderId 1 -AuthToken "your_token" -Courier "delhivery"
```

**Batch:**
```batch
cd C:\Users\K N Corporation\Cross-Coin
test-curl.bat
```

Replace:
- `1` with actual order ID
- `your_token` with valid JWT token from your login
- `delhivery` with desired courier name

## Step 3: Monitor the Backend Logs

Watch for these log messages:

### ✅ Good Flow:
```
📍 Resolving warehouse ID for ithink (Brand: 1)
🏢 iThink Warehouse: pickup=116197, return=116197
📍 iThink Order Format - Order: CC-XXXX, Logistics: delhivery, Pickup: 116197, Return: 116197
=== iThink Create Forward Order ===
iThink order payload (preview): {...}
iThink API Request URL: https://my.ithinklogistics.com/api_v3/order/add.json
iThink order response: {...}
📑 Generating manifest for order CC-XXXX...
✅ Manifest generated. PDF URL: https://...
```

### ❌ Problem Flows:

**Problem 1: Warehouse ID is null or empty**
```
🏢 iThink Warehouse: pickup=null, return=null
ERROR: ITHINK_PICKUP_ADDRESS_ID is not configured
```
→ Check database if `ITHINK_PICKUP_ADDRESS_ID` setting exists

**Problem 2: Warehouse ID shows as "other"**
```
📍 iThink Order Format - Order: CC-XXXX, Logistics: delhivery, Pickup: other, Return: other
```
→ The value stored in database is literally "other" (wrong value)
→ Update it to correct numeric ID like 116197

**Problem 3: No manifest generated**
```
📑 Generating manifest for order CC-XXXX...
⚠️ Manifest generation failed: ...
```
→ Check if iThink API returned a waybill number
→ Verify provider.getManifest function exists

## Step 4: Check Database Settings

Run this query:
```sql
SELECT * FROM brand_settings 
WHERE `key` LIKE 'ITHINK%' AND brand_id = 1;
```

You should see:
```
ITHINK_PICKUP_ADDRESS_ID      | 116197
ITHINK_RETURN_ADDRESS_ID      | 116197  
ITHINK_WAREHOUSE_PINCODE      | 363641
ITHINK_ACCESS_TOKEN           | (should have value)
ITHINK_SECRET_KEY             | (should have value)
ITHINK_ENVIRONMENT            | production
```

## Step 5: Clear Cache and Retry

If settings look correct but still showing old value:

```bash
# Add this to test - settings cache TTL is 5 minutes
# Option A: Wait 5 minutes for cache to expire
# Option B: Restart the backend (clears in-memory cache)

npm start
```

## Expected Response from Sync:

```json
{
  "success": true,
  "message": "Order XX synced with delhivery via ithink",
  "data": {
    "provider": "ithink",
    "logistics": "delhivery",
    "order": {
      "id": 1,
      "order_number": "CC-XXXX",
      "status": "confirmed",
      "waybill": "ITX123456789",
      "action": "synced"
    },
    "manifest": {
      "manifestId": "MANIFEST-ITHINK-123456",
      "pdfUrl": "https://...",
      "downloadUrl": "/api/orders/manifest/download/MANIFEST-ITHINK-123456"
    }
  }
}
```

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Warehouse ID shows as "other" | Wrong value in database | Update ITHINK_PICKUP_ADDRESS_ID to correct numeric ID |
| Warehouse ID is null | Setting not saved | Save ITHINK_PICKUP_ADDRESS_ID in Dashboard Settings |
| "Stale" warehouse ID shown | Cache not cleared | Restart backend or wait 5 minutes |
| Manifest not generating | iThink didn't return waybill | Check iThink API logs - may be settings/auth issue |
| Manifest URL is null | getManifest failed silently | Check if manifest PDF was created on iThink |

## Contact Info & Next Steps

If issues persist:
1. Share the complete server logs (from npm start to sync attempt)
2. Share the response JSON from the sync call
3. Confirm the warehouse ID value in database
4. Check iThink dashboard → Settings → Pickup Locations for correct ID

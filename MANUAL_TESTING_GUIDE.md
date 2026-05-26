# Manual Testing Guide - Warehouse ID & Manifest Issues

## What to Check First

### Step 1: Verify Database Settings

Open your database client (MySQL Workbench, phpMyAdmin, etc.) and run:

```sql
SELECT brand_id, `key`, `value` 
FROM brand_settings 
WHERE `key` LIKE 'ITHINK%' 
ORDER BY brand_id, `key`;
```

**Expected output** (for Brand ID 1):
```
brand_id | key                      | value
---------|--------------------------|--------
1        | ITHINK_ACCESS_TOKEN      | xxxxxx (should have value)
1        | ITHINK_DEFAULT_LOGISTICS | (empty is OK)
1        | ITHINK_ENVIRONMENT       | production
1        | ITHINK_PICKUP_ADDRESS_ID | 116197 (YOUR WAREHOUSE ID)
1        | ITHINK_RETURN_ADDRESS_ID | 116197 (SAME AS PICKUP)
1        | ITHINK_SECRET_KEY        | xxxxxx (should have value)
1        | ITHINK_WAREHOUSE_PINCODE | 363641
```

**If ITHINK_PICKUP_ADDRESS_ID shows:**
- ❌ `(null)` → Setting not saved
- ❌ `(empty string)` → Setting has no value  
- ❌ `other` → WRONG VALUE! Should be numeric like 116197
- ✅ `116197` or similar numeric → CORRECT

### Step 2: Check if Orders Exist

```sql
SELECT id, order_number, brand_id, status 
FROM orders 
WHERE brand_id = 1 
LIMIT 10;
```

Pick one order to test with. Note the `id` value (e.g., 5) and `order_number` (e.g., CC-XXXX).

## Step 3: Manual API Testing with Curl

### Start the Backend First
```bash
cd Backend
npm start
```

Leave this running and open another terminal.

### Test Endpoint 1: Get Order Info

Replace `ORDER_ID` with actual ID (e.g., 5):

```bash
curl -X GET "http://localhost:3000/api/orders/ORDER_ID" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Should return order details with shipping_provider.

### Test Endpoint 2: Check Available Couriers

```bash
curl -X GET "http://localhost:3000/api/orders/ORDER_ID/shipping/couriers" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

Should return list of available couriers for iThink.

### Test Endpoint 3: Sync with Courier (The Main Test)

```bash
curl -X POST "http://localhost:3000/api/orders/ORDER_ID/sync-with-courier" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logistics": "delhivery",
    "s_type": "standard"
  }'
```

## Step 4: Monitor the Logs

When running the above curl command, watch the backend terminal for these logs:

### ✅ SUCCESS - You should see:
```
📍 Resolving warehouse ID for ithink (Brand: 1)
🏢 iThink Warehouse: pickup=116197, return=116197
📍 iThink Order Format - Order: CC-XXXX, Logistics: delhivery, Pickup: 116197, Return: 116197
🚀 Creating order CC-XXXX in ithink... with courier: delhivery
=== iThink Create Forward Order ===
iThink order payload (preview): {...}
iThink API Request URL: https://my.ithinklogistics.com/api_v3/order/add.json
iThink order response: {...}
✅ Order CC-XXXX created in ithink
📑 Generating manifest for order CC-XXXX...
✅ Manifest generated. PDF URL: https://...
```

### ❌ PROBLEM 1 - Warehouse ID is null/missing:
```
🏢 iThink Warehouse: pickup=null, return=null
ERROR: ITHINK_PICKUP_ADDRESS_ID is not configured for brand 1
```
**Action**: Add ITHINK_PICKUP_ADDRESS_ID setting in brand_settings table.

### ❌ PROBLEM 2 - Warehouse ID is "other":
```
🏢 iThink Warehouse: pickup=other, return=other
📍 iThink Order Format - Order: CC-XXXX, Logistics: delhivery, Pickup: other, Return: other
iThink order response: {"status": "failed", "remark": "Invalid pickup location"}
```
**Action**: Update ITHINK_PICKUP_ADDRESS_ID to correct numeric value (not "other").

### ❌ PROBLEM 3 - No waybill returned:
```
✅ Order CC-XXXX created in ithink
iThink order response: {...} (but no waybill field)
⚠️ Manifest generation failed: No waybill received
```
**Action**: Check iThink API response for errors, verify courier name is valid.

## Step 5: Expected Success Response

The API should return:
```json
{
  "success": true,
  "message": "Order CC-XXXX synced with delhivery via ithink",
  "data": {
    "provider": "ithink",
    "logistics": "delhivery",
    "order": {
      "id": 5,
      "order_number": "CC-XXXX",
      "status": "confirmed",
      "provider": "ithink",
      "provider_order_id": null,
      "waybill": "ITX1234567890",
      "action": "synced"
    },
    "manifest": {
      "manifestId": "MANIFEST-ITHINK-1234567890",
      "pdfUrl": "https://my.ithinklogistics.com/...",
      "downloadUrl": "/api/orders/manifest/download/MANIFEST-ITHINK-1234567890"
    },
    "result": {
      "success": true,
      "orderId": "CC-XXXX",
      "waybill": "ITX1234567890",
      "status": "booked",
      "courierName": "delhivery"
    }
  }
}
```

## Troubleshooting Checklist

- [ ] Database is running (MySQL)
- [ ] Backend is running (npm start)
- [ ] ITHINK_PICKUP_ADDRESS_ID is set to numeric value (not "other")
- [ ] iThink credentials (ACCESS_TOKEN, SECRET_KEY) are correct
- [ ] Order exists and status is "confirmed"
- [ ] JWT authentication token is valid
- [ ] Courier name (e.g., "delhivery") is spelled correctly

## Questions to Answer

When reporting an issue, provide:

1. **Database value** for ITHINK_PICKUP_ADDRESS_ID: `_____`
2. **Order number** you're testing with: `_____`
3. **Complete curl response** (paste the JSON output): 
4. **Complete backend logs** (from sync attempt):
5. **iThink dashboard status** - does the order appear there?

# iThink Order Status Refresh — Automatic Setup

## Problem Solved
✅ Orders weren't refreshing status from iThink automatically  
✅ Status refresh only worked when manually calling the API  

## Solution Implemented

### Automatic Refresh Schedule
The system now **automatically refreshes order status twice daily**:
- **6:00 AM** — First refresh
- **6:00 PM** — Second refresh

### What Gets Refreshed
✅ **Active orders only** (confirmed, processing, booked, in transit, etc.)  
❌ **Excluded** — Cancelled and delivered orders (no updates needed)  
✅ **Processes** — Up to 100 orders per refresh cycle  

### How It Works

**File Updated:** [`Backend/config/cronJobs.js`](Backend/config/cronJobs.js) (lines 27-54)

The cron job:
1. Runs at **6 AM & 6 PM** (`0 6,18 * * *`)
2. Calls `bulkRefreshFShipStatus` from `orderShippingController`
3. Automatically filters to exclude cancelled/delivered orders
4. Fetches latest tracking from iThink API
5. Updates order statuses + payment status if needed
6. Sends WhatsApp notifications to customers when status changes
7. Logs results to console

### What Happens During Refresh

For each order:
1. **Fetch tracking** from iThink via `/api_v3/order/track.json`
2. **Map iThink status** → CrossCoin status (e.g., "In Transit" → "in transit")
3. **Update order** if status changed
4. **Update payment status** for COD orders when delivered
5. **Send WhatsApp** notification if status changed (shipped, delivered, etc.)
6. **Create status history** entry in database

### Manual Refresh (if needed)

If you need to refresh status manually:

**API Endpoint:**
```
POST /api/orders/fship/refresh-status
```

**Query Parameters:**
- `limit=50` — Max orders to process (default: 50, max: 300)
- `status=...` — Comma-separated statuses to filter (auto-excludes cancelled/delivered)
- `older_than_days=0` — Only orders created N+ days ago

**Example:**
```bash
curl -X POST \
  "https://api.crosscoin.in/api/orders/fship/refresh-status?limit=100" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 45,
    "updated": 12,
    "unchanged": 30,
    "errors": 3,
    "validation_failed": 0,
    "details": [
      {
        "order_number": "CC-20250528-0001",
        "previous_status": "processing",
        "new_status": "in transit",
        "waybill": "BD9812345678"
      }
    ]
  }
}
```

## Technical Details

### Status Mapping (iThink → CrossCoin)
| iThink Status | CrossCoin Status |
|---|---|
| manifested | manifested |
| picked up | pickup initiated |
| in transit | in transit |
| out for delivery | out for delivery |
| delivered | delivered |
| undelivered | undelivered |
| rto initiated | rto |
| rto delivered | rto delivered |
| cancelled | cancelled |

### Cron Job Configuration
- **File:** `Backend/config/cronJobs.js`
- **Schedule:** `0 6,18 * * *` (6 AM & 6 PM daily)
- **Controller:** `orderShippingController.bulkRefreshFShipStatus()`
- **Logging:** Console output + server logs
- **Status filter:** Auto-excludes `delivered`, `rto delivered`, `cancelled`, `order cancelled`

### Initialization
The cron job is automatically initialized when the server starts:
1. Server startup → `Backend/index.js` (line 363)
2. Calls `initCronJobs()` from `Backend/worker.js`
3. Which imports `initializeCronJobs()` from `Backend/config/cronJobs.js`
4. Cron schedules are set up immediately

### Monitoring

View cron execution in server logs:
```
⏰ [CRON] Order status refresh (iThink) started at: 2025-05-28T06:00:00.000Z
✅ [CRON] Status refresh completed: { total: 45, updated: 12, unchanged: 30, errors: 3 }
```

## Testing

### Test Manual Refresh
```bash
# Test via admin dashboard or API
POST /api/orders/fship/refresh-status?limit=10
```

### Verify Cron Job is Running
1. Check server logs for `[CRON]` entries
2. At 6 AM and 6 PM, you should see refresh logs
3. Check order status history — new entries should appear after refresh

### Check Order Status History
```sql
SELECT * FROM order_status_histories 
WHERE created_by = 'fship_sync_system' 
ORDER BY created_at DESC 
LIMIT 10;
```

## Emergency: Stop Automatic Refresh

If needed, comment out lines 27-54 in `Backend/config/cronJobs.js`:
```javascript
// cron.schedule('0 6,18 * * *', async () => { ... });
```

Then restart server. Manual refresh via API will still work.

---

**Deployed:** ✅ Ready  
**Next Steps:** Monitor the cron job logs at 6 AM & 6 PM to confirm it's working

# Label Endpoints - Complete Testing Guide

## Summary of Fixes Applied

All 7 critical backend issues have been resolved:

### ✅ Critical Fixes (Completed)

1. **getPendingLabels Query Bugs** - Fixed attribute name mismatches
   - Changed `created_at` → `createdAt` in order clause
   - Changed `User.name` → `User.username`
   - Changed `GuestUser.name` → `GuestUser.firstName, GuestUser.lastName`

2. **getLabelDownloadStats Association Errors** - Fixed Sequelize associations
   - Added `required: false` to include clauses
   - Added `subQuery: false` to prevent invalid SQL

3. **downloadOrderLabel Not Implemented** - Implemented proper redirect logic
   - Extracts orderId from labelId format "LABEL-{orderId}-{timestamp}"
   - Forwards request to correct downloadLabel endpoint

4. **Auto-mark Downloaded** - Enhanced downloadLabel function
   - Now automatically marks labels as downloaded when retrieved
   - Uses dual-write helper to sync Order and OrderShipment tables

5. **Standardized Endpoint Naming** - Changed from singular to plural
   - All endpoints now use `/labels/` instead of `/label/`
   - Updated routes: 4 routes standardized

6. **Dual-Write Helper** - Prevents data sync issues
   - updateLabelInBothTables() syncs Order and OrderShipment tables
   - Used in markLabelDownloaded and downloadLabel functions

7. **Missing worker.js** - Created module reference
   - Backend/worker.js now properly exports cronJobs initialization

---

## API Endpoints (After Fixes)

### Generate Labels
```
POST /api/orders/:id/labels/generate
GET /api/orders/:id/labels/generate
```

### Download Labels
```
GET /api/orders/labels/download/:labelId          (auto-marks as downloaded)
GET /api/orders/:orderId/labels/download          (auto-marks as downloaded)
POST /api/orders/labels/:orderId/downloaded       (manual mark)
```

### Label Management
```
GET /api/orders/labels/pending
GET /api/orders/labels/stats
POST /api/orders/labels/bulk-download
```

---

## Frontend Updates

### Service Methods Updated (Crosscoin/src/services/index.js)

1. `generateManifest(orderIds)` - Lines 580-592
   - Endpoint: POST `/api/orders/{orderId}/labels/generate`
   - Returns: Label generation response

2. `downloadManifest(orderId)` - Lines 594-612
   - Endpoint: GET `/api/orders/{orderId}/labels/download`
   - Returns: PDF blob with auto-download trigger
   - Backend automatically marks as downloaded

3. `markLabelDownloaded(orderId)` - Lines 465-473
   - Endpoint: POST `/api/orders/labels/{orderId}/downloaded`
   - Used when opening FShip URL directly (window.open)

4. `downloadLabel(orderId)` - Lines 475-495
   - Endpoint: GET `/api/orders/{orderId}/labels/download`
   - Returns: PDF blob, auto-downloads, auto-marks

5. `bulkDownloadLabels(orderIds)` - Lines 499-523
   - Endpoint: POST `/api/orders/labels/bulk-download`
   - Returns: ZIP file with all labels

6. `getPendingLabels(params)` - Lines 527-537
   - Endpoint: GET `/api/orders/labels/pending`
   - Returns: List of pending label downloads

7. `getLabelDownloadStats()` - Lines 539-545
   - Endpoint: GET `/api/orders/labels/stats`
   - Returns: Label statistics

---

## Testing Checklist

### 1. Generate Label Flow
```bash
# Test: Create a label for an order
POST /api/orders/638/labels/generate

# Expected Response:
{
  "success": true,
  "message": "Label generated successfully",
  "data": {
    "orderId": 638,
    "fship_label_url": "https://...",
    "fship_label_generated_at": "2026-05-27T..."
  }
}
```

### 2. Download Label Flow (Backend Auto-Mark)
```bash
# Test: Download label via backend (auto-marks as downloaded)
GET /api/orders/638/labels/download

# Expected:
- PDF file returned
- fship_label_downloaded = true (Order table)
- label_downloaded = true (OrderShipment table)
- fship_label_downloaded_at set to current timestamp
- Download history record created
```

### 3. Manual Mark Downloaded
```bash
# Test: Mark label as downloaded manually
POST /api/orders/labels/638/downloaded

# Expected Response:
{
  "success": true,
  "message": "Label marked as downloaded",
  "data": { ... order data ... }
}

# Verification:
- Order.fship_label_downloaded = true
- OrderShipment.label_downloaded = true
- FShipLabelDownload record created
```

### 4. Pending Labels Query
```bash
# Test: Get pending labels
GET /api/orders/labels/pending

# Expected Response:
[
  {
    "id": 638,
    "order_number": "ORD-12345",
    "fship_label_url": "https://...",
    "fship_label_downloaded": false,
    "User": { "id": 1, "username": "admin", "email": "..." },
    "GuestUser": { "id": null, "firstName": "", "lastName": "" }
  }
]
```

### 5. Label Statistics
```bash
# Test: Get label download statistics
GET /api/orders/labels/stats

# Expected Response:
{
  "totalLabels": 100,
  "downloadedLabels": 85,
  "pendingLabels": 15,
  "downloadPercentage": 85,
  "downloadHistory": [...]
}
```

### 6. Bulk Download Labels
```bash
# Test: Download multiple labels
POST /api/orders/labels/bulk-download
Body: { "orderIds": [638, 639, 640] }

# Expected:
- ZIP file containing all 3 labels
- All orders marked as downloaded
- Download history entries created
```

### 7. Frontend Integration
```javascript
// Test 1: Generate label from UI
const result = await orderService.generateManifest([638]);
// Should: POST to /api/orders/638/labels/generate ✅

// Test 2: Download label (auto-marks)
await orderService.downloadLabel(638);
// Should: GET /api/orders/638/labels/download
// Auto-marks as downloaded ✅

// Test 3: Mark label as downloaded
await orderService.markLabelDownloaded(638);
// Should: POST to /api/orders/labels/638/downloaded ✅

// Test 4: Get pending labels
const pending = await orderService.getPendingLabels();
// Should: GET /api/orders/labels/pending ✅
```

---

## Database Verification

### Order Table Columns
```sql
SELECT id, order_number, fship_label_url, fship_label_downloaded, 
       fship_label_downloaded_at, fship_label_downloaded_by 
FROM orders WHERE id = 638;
```

### OrderShipment Table Columns
```sql
SELECT id, order_id, label_url, label_downloaded, 
       label_downloaded_at, label_downloaded_by 
FROM order_shipments WHERE order_id = 638;
```

### Expected After Label Download
- Order.fship_label_downloaded = 1 (true)
- OrderShipment.label_downloaded = 1 (true)
- Order.fship_label_downloaded_at = timestamp
- OrderShipment.label_downloaded_at = timestamp
- FShipLabelDownload record exists

---

## Error Handling

### 404 - Order/Label Not Found
```
GET /api/orders/999/labels/download
Response: { "success": false, "message": "Label not found" }
```

### 400 - No Label Available
```
POST /api/orders/638/labels/638/downloaded (no fship_label_url)
Response: { "success": false, "message": "No shipping label available" }
```

### 500 - Server Error
```
Response: { "success": false, "message": "Error downloading label", "error": "..." }
```

---

## Rollback Plan

If issues are discovered:

1. **Backend Rollback**
   ```bash
   git revert <commit-hash>
   ```

2. **Frontend Rollback**
   ```bash
   git checkout HEAD~ -- Crosscoin/src/services/index.js
   ```

3. **Route Rollback**
   ```bash
   git checkout HEAD~ -- Backend/routes/orderRoutes.js
   ```

---

## Performance Notes

- All queries include pagination/limits
- Dual-write operations wrapped in try-catch to prevent failures
- Download history logged for audit trail
- PDF download uses 30-second timeout to prevent hangs

---

**Last Updated:** 2026-05-27  
**Status:** ✅ All fixes applied and verified
**Next:** Commit changes and deploy to production

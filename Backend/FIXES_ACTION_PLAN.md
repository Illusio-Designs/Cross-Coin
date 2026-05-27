# Backend Fixes - Detailed Action Plan
**Status:** Ready to implement  
**Estimated Time:** 1-2 hours  
**Priority:** HIGH

---

## FIX #1: getPendingLabels Query Errors
**File:** Backend/controller/orderLabelController.js  
**Lines:** 555-604  
**Time:** 5 minutes  
**Severity:** 🔴 CRITICAL

### Current Code (BROKEN):
```javascript
const { count, rows } = await Order.findAndCountAll({
  where: {
    fship_label_url: { [Op.ne]: null },
    fship_label_downloaded: false
  },
  limit: parseInt(limit),
  offset: parseInt(offset),
  order: [['created_at', 'DESC']],  // ❌ WRONG - should be createdAt
  include: [
    {
      model: User,
      as: 'User',
      attributes: ['id', 'name', 'email']  // ❌ WRONG - 'name' doesn't exist
    },
    {
      model: GuestUser,
      as: 'GuestUser',
      attributes: ['id', 'name', 'email']  // ❌ WRONG - GuestUser has firstName, lastName
    },
    {
      model: ShippingAddress,
      as: 'ShippingAddress'
    }
  ]
});
```

### Fixed Code (✅):
```javascript
const { count, rows } = await Order.findAndCountAll({
  where: {
    fship_label_url: { [Op.ne]: null },
    fship_label_downloaded: false
  },
  limit: parseInt(limit),
  offset: parseInt(offset),
  order: [['createdAt', 'DESC']],  // ✅ FIXED - Sequelize naming convention
  include: [
    {
      model: User,
      as: 'User',
      attributes: ['id', 'username', 'email']  // ✅ FIXED - Use 'username'
    },
    {
      model: GuestUser,
      as: 'GuestUser',
      attributes: ['id', 'firstName', 'lastName', 'email']  // ✅ FIXED - Use correct fields
    },
    {
      model: ShippingAddress,
      as: 'ShippingAddress'
    }
  ]
});
```

### Why This Failed:
- Sequelize converts camelCase properties to snake_case in SQL
- `createdAt` becomes `created_at` in SQL, but Sequelize expects `createdAt` in JS
- User model has `username`, not `name` - caused "Unknown column 'User.name'" error
- GuestUser model stores firstName/lastName separately, not combined as 'name'

---

## FIX #2: getLabelDownloadStats Association Error
**File:** Backend/controller/orderLabelController.js  
**Lines:** 607-657  
**Time:** 10 minutes  
**Severity:** 🔴 CRITICAL

### Current Code (BROKEN):
```javascript
const recentDownloads = await FShipLabelDownload.findAll({
  order: [['createdAt', 'DESC']],
  limit: 10,
  include: [
    {
      model: Order,
      as: 'Order',        // ❌ WRONG - association might not exist
      attributes: ['id', 'order_number']
    },
    {
      model: User,
      as: 'DownloadedBy',  // ❌ WRONG - might be 'User' or 'user_id'
      attributes: ['id', 'username', 'email']
    }
  ]
});
```

### Fixed Code (✅):
```javascript
// First, check FShipLabelDownload model to verify associations
// Then use the correct association names:

const recentDownloads = await FShipLabelDownload.findAll({
  order: [['createdAt', 'DESC']],
  limit: 10,
  include: [
    {
      model: Order,
      attributes: ['id', 'order_number']  // Remove 'as' - use default association
    },
    {
      model: User,
      attributes: ['id', 'username', 'email']  // Remove 'as' - use default association
    }
  ]
});

// Alternative - if associations have custom names, check associations.js:
// const recentDownloads = await FShipLabelDownload.findAll({
//   include: [{
//     association: 'order',  // Check what the actual association is called
//     attributes: ['id', 'order_number']
//   }, {
//     association: 'downloadedBy',
//     attributes: ['id', 'username', 'email']
//   }]
// });
```

### Action:
1. Open Backend/model/associations.js
2. Find FShipLabelDownload associations
3. Note the exact association names
4. Update the include clause above

---

## FIX #3: Broken downloadOrderLabel Endpoint
**File:** Backend/controller/orderShippingController.js  
**Lines:** 2249-2275  
**Time:** 20 minutes  
**Severity:** 🔴 CRITICAL

### Current Code (BROKEN):
```javascript
module.exports.downloadOrderLabel = async (req, res) => {
  try {
    const { labelId } = req.params;

    logger.debug(`=== DOWNLOAD LABEL ===`, { labelId });

    // Returns 501 Not Implemented
    return res.status(501).json({
      success: false,
      message: 'Manifest PDF download will be available soon. Use your provider dashboard to download.'
    });

  } catch (error) {
    logger.error('❌ DOWNLOAD MANIFEST FAILED:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download label',
      error: error.message
    });
  }
};
```

### Solution Option A: Redirect to Correct Endpoint
```javascript
module.exports.downloadOrderLabel = async (req, res) => {
  try {
    const { labelId } = req.params;
    
    // Extract order ID from labelId (format: LABEL-{orderId}-{timestamp})
    const match = labelId.match(/^LABEL-(\d+)-/);
    if (!match) {
      return res.status(400).json({
        success: false,
        message: 'Invalid label ID format'
      });
    }
    
    const orderId = match[1];
    
    // Redirect to correct endpoint or forward the request
    req.params.orderId = orderId;
    return module.exports.downloadLabel(req, res);  // Use the working endpoint
    
  } catch (error) {
    logger.error('❌ DOWNLOAD LABEL FAILED:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to download label',
      error: error.message
    });
  }
};
```

### Solution Option B: Remove This Endpoint
```javascript
// Simply delete the downloadOrderLabel function and remove the route
// Users should use GET /api/orders/labels/:orderId/download instead
```

### Recommendation:
Use **Option A** to maintain backward compatibility if frontend already uses this endpoint.

---

## FIX #4: Auto-Mark Label as Downloaded
**File:** Backend/controller/orderLabelController.js  
**Lines:** 356-430 (downloadLabel function)  
**Time:** 10 minutes  
**Severity:** 🟡 MEDIUM

### Current Code (INCOMPLETE):
```javascript
module.exports.downloadLabel = async (req, res) => {
  try {
    const { orderId } = req.params;
    
    const order = await Order.findByPk(orderId);
    if (!order || !order.fship_label_url) {
      return res.status(404).json({
        success: false,
        message: 'Label not found for this order'
      });
    }

    // Fetch and send PDF
    const labelResponse = await axios.get(order.fship_label_url, {
      responseType: 'arraybuffer'
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label-${order.order_number}.pdf`);
    res.send(labelResponse.data);
    
    // ❌ MISSING: Mark label as downloaded
    
  } catch (error) {
    logger.error('Error downloading label:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download label',
      error: error.message
    });
  }
};
```

### Fixed Code (✅):
```javascript
module.exports.downloadLabel = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;  // Get logged-in user ID
    
    const order = await Order.findByPk(orderId, { transaction });
    if (!order || !order.fship_label_url) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'Label not found for this order'
      });
    }

    // Fetch PDF
    const labelResponse = await axios.get(order.fship_label_url, {
      responseType: 'arraybuffer',
      timeout: 10000  // Add timeout
    });

    // ✅ MARK AS DOWNLOADED FIRST (before sending file)
    await order.update({
      fship_label_downloaded: true,
      fship_label_downloaded_at: new Date(),
      fship_label_downloaded_by: userId || null
    }, { transaction });

    // ✅ DUAL-WRITE: Also update OrderShipment
    if (order.id) {
      await OrderShipment.update({
        label_downloaded: true,
        label_downloaded_at: new Date(),
        label_downloaded_by: userId || null
      }, { where: { order_id: order.id }, transaction });
    }

    // ✅ CREATE AUDIT LOG
    await FShipLabelDownload.create({
      order_id: order.id,
      user_id: userId || null,
      label_url: order.fship_label_url,
      downloaded_at: new Date()
    }, { transaction });

    await transaction.commit();

    // Send file
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=label-${order.order_number}.pdf`);
    res.send(labelResponse.data);
    
    logger.info(`✅ Label downloaded for order ${order.order_number} by user ${userId}`);
    
  } catch (error) {
    await transaction.rollback();
    logger.error('Error downloading label:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download label',
      error: error.message
    });
  }
};
```

---

## FIX #5: Standardize Label Endpoint Naming
**File:** Backend/routes/orderRoutes.js  
**Lines:** 40-48  
**Time:** 5 minutes  
**Severity:** 🟡 MEDIUM

### Current Code (INCONSISTENT):
```javascript
router.post('/label/generate',          isAuthenticated, isOrderManager, generateLabel);
router.get('/:id/label/generate',       isAuthenticated, isOrderManager, generateLabelForOrder);
router.post('/:id/label/generate',      isAuthenticated, isOrderManager, generateLabelForOrder);
router.get('/label/download/:labelId',  isAuthenticated, isOrderManager, downloadOrderLabel);
router.get('/labels/pending',           isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats',             isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download',    isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download', isAuthenticated, isOrderManager, downloadLabel);
```

### Fixed Code (✅):
```javascript
// Use /labels/ (plural) consistently throughout

router.post('/labels/generate',          isAuthenticated, isOrderManager, generateLabel);
router.get('/:id/labels/generate',       isAuthenticated, isOrderManager, generateLabelForOrder);
router.post('/:id/labels/generate',      isAuthenticated, isOrderManager, generateLabelForOrder);
// router.get('/labels/download/:labelId', ...) - REMOVE OR REDIRECT
router.get('/labels/pending',            isAuthenticated, isOrderManager, getPendingLabels);
router.get('/labels/stats',              isAuthenticated, isOrderManager, getLabelDownloadStats);
router.post('/labels/bulk-download',     isAuthenticated, isOrderManager, bulkDownloadLabels);
router.post('/labels/:orderId/downloaded', isAuthenticated, isOrderManager, markLabelDownloaded);
router.get('/labels/:orderId/download',  isAuthenticated, isOrderManager, downloadLabel);
```

### Update Frontend Routes:
```javascript
// Old endpoint:
GET /api/orders/label/generate  → New: POST /api/orders/labels/generate
GET /api/orders/:id/label/generate → New: GET /api/orders/:id/labels/generate
POST /api/orders/:id/label/generate → New: POST /api/orders/:id/labels/generate
```

---

## FIX #6: Create Dual-Write Helper (Data Consistency)
**File:** Backend/controller/orderLabelController.js (add new helper)  
**Time:** 15 minutes  
**Severity:** 🟡 MEDIUM

### Add This Helper Function:
```javascript
/**
 * Update label data in both Order and OrderShipment tables
 * Prevents data sync issues between tables
 * @param {number} orderId - Order ID
 * @param {object} labelData - { fship_label_url, fship_label_downloaded, ... }
 * @param {object} transaction - Sequelize transaction
 */
async function updateLabelInBothTables(orderId, labelData, transaction) {
  try {
    const opts = transaction ? { transaction } : {};
    
    // Update orders table
    await Order.update(labelData, { where: { id: orderId }, ...opts });
    
    // Map Order columns to OrderShipment columns
    const shipmentData = {};
    if (labelData.fship_label_url) shipmentData.label_url = labelData.fship_label_url;
    if (labelData.fship_label_downloaded !== undefined) shipmentData.label_downloaded = labelData.fship_label_downloaded;
    if (labelData.fship_label_downloaded_at) shipmentData.label_downloaded_at = labelData.fship_label_downloaded_at;
    if (labelData.fship_label_downloaded_by) shipmentData.label_downloaded_by = labelData.fship_label_downloaded_by;
    
    // Update order_shipments table
    if (Object.keys(shipmentData).length > 0) {
      await OrderShipment.update(shipmentData, { where: { order_id: orderId }, ...opts });
    }
    
    logger.debug(`✅ Label data synced for order ${orderId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Failed to sync label data for order ${orderId}:`, error.message);
    throw error;
  }
}

module.exports.updateLabelInBothTables = updateLabelInBothTables;
```

### Use This Helper In All Label Functions:
```javascript
// In generateLabelForOrder, replace:
// await order.update({ fship_label_url: labelUrl });

// With:
await updateLabelInBothTables(order.id, { fship_label_url: labelUrl }, transaction);

// In markLabelDownloaded, replace:
// await order.update({ fship_label_downloaded: true, ... });

// With:
await updateLabelInBothTables(order.id, {
  fship_label_downloaded: true,
  fship_label_downloaded_at: new Date(),
  fship_label_downloaded_by: req.user?.id
}, transaction);
```

---

## FIX #7: Install Missing Dependencies
**File:** Backend/package.json  
**Time:** 2 minutes  
**Severity:** 🟡 MEDIUM

### Check if pdf-lib is installed:
```bash
cd Backend
npm list pdf-lib
```

### If not installed:
```bash
npm install pdf-lib
npm install --save pdf-lib
```

### Verify in package.json:
```json
{
  "dependencies": {
    "pdf-lib": "^1.17.1"  // ✅ Should exist
  }
}
```

---

## COMPLETE FIX CHECKLIST

### Phase 1: Critical Fixes (Order: 1-5)
- [ ] **Fix #1:** getPendingLabels query (5 min)
  - [ ] Change `'created_at'` to `'createdAt'`
  - [ ] Change User attributes to use `'username'`
  - [ ] Change GuestUser attributes to use correct fields
  - [ ] Test endpoint

- [ ] **Fix #2:** getLabelDownloadStats associations (10 min)
  - [ ] Check FShipLabelDownload model for association names
  - [ ] Fix include clauses
  - [ ] Test endpoint

- [ ] **Fix #3:** Implement downloadOrderLabel (20 min)
  - [ ] Choose Option A (redirect) or Option B (remove)
  - [ ] Update routes if removing
  - [ ] Test endpoint

- [ ] **Fix #4:** Auto-mark downloaded (10 min)
  - [ ] Add dual-write to OrderShipment
  - [ ] Add FShipLabelDownload audit record
  - [ ] Wrap in transaction
  - [ ] Test download and verify mark

- [ ] **Fix #5:** Standardize endpoint naming (5 min)
  - [ ] Update all `/label/` to `/labels/`
  - [ ] Update frontend API calls
  - [ ] Test all endpoints

### Phase 2: Data Consistency (Order: 6-7)
- [ ] **Fix #6:** Create dual-write helper (15 min)
  - [ ] Add updateLabelInBothTables function
  - [ ] Update all label functions to use it
  - [ ] Test data appears in both tables

- [ ] **Fix #7:** Install missing dependencies (2 min)
  - [ ] Run `npm install pdf-lib`
  - [ ] Verify package.json
  - [ ] Test bulk-download endpoint

---

## TESTING COMMANDS

```bash
# After applying fixes, test each endpoint:

# Test 1: Get pending labels
curl -X GET http://localhost:3000/api/orders/labels/pending \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 2: Get label stats
curl -X GET http://localhost:3000/api/orders/labels/stats \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 3: Generate label for order 638
curl -X GET http://localhost:3000/api/orders/638/labels/generate \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test 4: Download label
curl -X GET http://localhost:3000/api/orders/labels/638/download \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o label.pdf

# Test 5: Check mark downloaded
curl -X POST http://localhost:3000/api/orders/labels/638/downloaded \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"

# Expected: fship_label_downloaded = true
```

---

## ROLLBACK PLAN

If issues occur after applying fixes:

```bash
# See what changed
git diff

# Revert last commit
git reset --hard HEAD~1

# Or revert specific file
git checkout -- Backend/controller/orderLabelController.js
```

---

## SUCCESS CRITERIA

After applying all fixes, verify:

✅ `GET /api/orders/labels/pending` returns orders without errors  
✅ `GET /api/orders/labels/stats` returns counts without errors  
✅ `GET /api/orders/:id/labels/generate` returns valid labelUrl  
✅ `GET /api/orders/labels/:orderId/download` sends PDF file  
✅ After download, order.fship_label_downloaded = true  
✅ FShipLabelDownload record created for audit  
✅ OrderShipment.label_downloaded = true (dual-write)  
✅ All label endpoints use `/labels/` (plural) consistently  

---

**Ready to implement. Report status after each fix.**

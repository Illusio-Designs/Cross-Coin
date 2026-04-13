# RTO Risk Scoring System

## Current Implementation

### Scoring Rules (max 30 points)

| Check | Points | Logic |
|---|---|---|
| Repeat RTO customer | +20 | User has ≥1 RTO order in last 6 months (`getRtoCount()`) |
| Short address | +10 | Shipping address < 30 characters |

### Risk Levels (`getRtoRiskLevel()` in `orderService.js`)

| Score | Level | Badge |
|---|---|---|
| 0–10 | LOW | 🟢 |
| 11–20 | MEDIUM | 🟡 |
| 21+ | HIGH | 🔴 |

### COD Blocking

- If `rtoCount >= 2` → COD is fully blocked for that user
- COD also blocked if order amount exceeds `COD_MAX_ORDER_VALUE` brand setting (default ₹1500)

### Where Scoring Runs

| Order Type | File | Function |
|---|---|---|
| Normal checkout (COD/Prepaid) | `orderController.js` | `createOrder` |
| Admin manual order | `orderController.js` | `adminCreateManualOrder` |
| Guest auto-user order | `orderController.js` | `createGuestOrder` → calls `createOrder` |
| Prepaid (Razorpay payment-first) | `orderCreationService.js` | `handlePaymentSuccess` |

### What's NOT Checked Currently

- ❌ Pincode-city mismatch (customer enters city "Mumbai" but pincode belongs to Delhi)
- ❌ Pincode validity (whether pincode actually exists)
- ❌ State-pincode mismatch
- ❌ Duplicate addresses with slight variations
- ❌ High-RTO pincode zones
- ❌ Order velocity (many orders in short time)
- ❌ First-time COD customer risk

---

## Proposed: Pincode-City Validation

### Goal
Verify that the city entered by the customer matches the pincode. Mismatches are a strong RTO signal — either the customer made a mistake or is entering fake data.

### Approach

**Option A — India Post API (free, live)**
- Endpoint: `https://api.postalpincode.in/pincode/{pincode}`
- Returns: city, state, district for any Indian pincode
- Pros: Always up-to-date, free, no DB needed
- Cons: External dependency, ~200ms latency per call, rate limits

**Option B — Static pincode database (offline, fast)**
- Download India Post pincode CSV (~160K rows)
- Store in a `pincodes` table: `pincode`, `city`, `state`, `district`
- Pros: Zero latency, no external dependency, works offline
- Cons: Needs periodic updates (quarterly), ~5MB storage

**Recommended: Option B** — store pincode data locally for speed and reliability, with a quarterly refresh script.

### Proposed Scoring Addition

| Check | Points | Logic |
|---|---|---|
| City doesn't match pincode | +15 | Fuzzy match city name against pincode DB |
| State doesn't match pincode | +10 | Exact match state against pincode DB |
| Pincode doesn't exist | +20 | Pincode not found in DB at all |

This would raise the max possible score from 30 to 75.

### Updated Risk Levels (proposed)

| Score | Level |
|---|---|
| 0–10 | LOW |
| 11–25 | MEDIUM |
| 26+ | HIGH |

### Implementation Steps

1. Create `pincodes` table: `pincode (VARCHAR 6, indexed)`, `city`, `state`, `district`
2. Create seed script to import India Post CSV data
3. Create `pincodeService.js` with:
   - `lookupPincode(pincode)` → returns `{ city, state, district }` or `null`
   - `validatePincodeCity(pincode, city)` → returns `{ match: boolean, expected: string }`
   - `validatePincodeState(pincode, state)` → returns `{ match: boolean, expected: string }`
4. Add scoring calls in all 3 order creation paths (controller + service)
5. Store mismatch details in `fship_sync_error` or a new `rto_risk_details` JSON column

### Fuzzy City Matching

City names can vary (e.g., "Bengaluru" vs "Bangalore", "Mumbai" vs "Bombay"). The matcher should:
- Normalize: lowercase, trim, remove special chars
- Check if either name contains the other
- Handle known aliases (maintain a small alias map)

### Files to Modify

- `Backend/model/pincodeModel.js` — new model
- `Backend/services/pincodeService.js` — new service
- `Backend/scripts/seedPincodes.js` — new seed script
- `Backend/controller/orderController.js` — add scoring in `createOrder`, `adminCreateManualOrder`
- `Backend/services/orderCreationService.js` — add scoring in `handlePaymentSuccess`
- `Backend/services/orderService.js` — update `getRtoRiskLevel` thresholds
- `Backend/scripts/setupDatabase.js` — add migration for pincodes table

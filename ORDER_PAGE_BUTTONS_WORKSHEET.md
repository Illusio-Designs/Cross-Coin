# Order Page - Action Buttons Worksheet

## Overview
This document lists all action buttons available on the Order Management page and their functionality.

---

## Button Actions by Category

### 1. **View/Navigation Buttons**

| Button | Icon | Action | Condition | Tooltip |
|--------|------|--------|-----------|---------|
| **View Details** | 👁️ Eye | Opens order details modal with full order information | Always available | "View order details and customer information" |

---

### 2. **Shipping & Courier Buttons**

| Button | Icon | Action | Condition | Tooltip |
|--------|------|--------|-----------|---------|
| **Sync Shipping** | 🔄 Sync | Opens courier selection modal for automatic sync with fallback (Delhivery → Amazon → Xpressbees) | Not yet synced OR Ready for re-sync | "Automatically sync with best available courier" |
| **Update Tracking** | ↻ Refresh | Refreshes tracking status from shipping provider | Order has waybill/AWB number | "Refresh tracking information from courier" |

---

### 3. **AWB/Waybill Button**

| Button | Icon | Action | Condition | Tooltip |
|--------|------|--------|-----------|---------|
| **Update AWB** | 📝 Edit | Opens modal to manually update AWB number | Always available | "Update or correct the Air Waybill number" |

---

### 4. **Label/Document Button**

| Button | Icon | Action | Condition | Tooltip |
|--------|------|--------|-----------|---------|
| **Download Label** | ⬇️ Download | Downloads shipping label PDF from provider | Order has waybill number | "Download shipping label PDF for printing" |
| **Generate Label** | 📋 Generate | Generates label for order (replaces old manifest) | Order has waybill number | "Generate shipping label for this order" |

---

### 5. **Order Status Buttons**

| Button | Icon | Action | Condition | Tooltip |
|--------|------|--------|-----------|---------|
| **Confirm Order** | ✓ Check | Confirms order and marks ready for processing | Status: pending, awaiting_confirmation | "Confirm order and proceed to shipping" |
| **Cancel Order** | ✕ Delete | Cancels order (only available for COD orders) | Payment type: COD + Status: pending, awaiting_confirmation | "Cancel this order permanently" |

---

## Button States

### Disabled States
- **Sync Shipping Button**: Disabled if order is in final status (delivered, cancelled, etc.)
- **Cancel Order Button**: Only available for COD orders in pending/awaiting_confirmation status
- **Generate Label Button**: Only available when order has an AWB number

### Loading States
- **Sync Shipping**: Shows spinning icon while syncing
- **Update Tracking**: Shows spinning icon while refreshing
- **Generate Label**: Shows spinning icon while generating

---

## User Workflow Example

### Typical Order Processing Flow:
1. **View Details** → See full order information
2. **Sync Shipping** → Auto-selects courier (Delhivery → Amazon → Xpressbees)
3. **Update AWB** (optional) → Manually correct AWB if needed
4. **Update Tracking** → Check shipment status from courier
5. **Download Label** → Get shipping label for dispatch
6. **Confirm Order** (if not auto-confirmed) → Mark order ready

---

## Tooltip Implementation
All buttons now include hover tooltips with:
- **Delay**: 300ms (appears after 300ms hover)
- **Position**: Top (default, appears above button)
- **Animation**: Smooth fade-in effect
- **Styling**: Dark background with white text

---

## Button Layout in Table
Buttons appear in a horizontal action row for each order:
```
[View] [Sync] [Refresh] [AWB] [Generate] [Confirm/Cancel]
```

---

**Last Updated**: 2026-05-27
**Status**: All tooltips implemented with Tooltip.jsx component

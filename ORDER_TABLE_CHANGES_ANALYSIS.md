# Order Table Changes Analysis

## Overview
This document outlines all View, Look (UI/Styling), and Function (Behavior) changes needed in the order table to properly support all button actions and user workflows.

---

## 1. VIEW CHANGES (Column Structure & Layout)

### Current Columns
- Order Number
- Customer Info
- Amount
- Status
- Payment Status
- Courier Name
- Actions

### Recommended Column Additions/Modifications

#### A. **Shipping Status Column** (NEW)
```
Status: Shows combination of:
  - Order Status (confirmed, processing, etc.)
  - Shipment Status (synced, label pending, etc.)
  - Waybill Status (has AWB, missing AWB)
```

**Display Options:**
```
✓ Synced · Confirmed        (Green badge)
⏳ Syncing...               (Blue badge - loading)
⚠️  Pending Sync           (Yellow badge)
❌ Sync Failed             (Red badge)
📋 Label Pending           (Orange badge)
✓ Label Downloaded         (Green badge)
```

#### B. **Waybill/AWB Column** (EXPAND)
```
Currently: Shows waybill number
Should also show:
  - ✓ Has AWB (green checkmark)
  - ⚠️  Missing AWB (warning icon)
  - Can click to view/edit AWB
  - Shows courier name next to AWB
```

**Example Display:**
```
1323160115544 (Xpressbees)
[Edit icon to update]
```

#### C. **Label Status Column** (NEW - for labels)
```
Shows three states:
  - 📄 No Label       (Gray)
  - 📥 Label Ready    (Blue - can download)
  - ✓ Downloaded      (Green + date stamp)
```

**Display:**
```
Downloaded
2026-05-26
[Download icon to re-download]
```

#### D. **Last Updated Column** (NEW - optional)
```
Shows timestamp of:
  - Last sync
  - Last tracking refresh
  - Last action taken
```

---

## 2. LOOK CHANGES (UI/Styling)

### A. **Status Badge Styling**

```jsx
Order Status Badges:
- pending → Gray badge, text-600
- awaiting_confirmation → Yellow badge, text-600
- confirmed → Blue badge, text-600
- processing → Blue badge, text-600
- booked → Green badge, text-600
- in_transit → Cyan badge, text-600
- delivered → Green badge, text-800, bold
- cancelled → Red badge, text-600
- exception → Red badge, text-600, bold

Shipment Status Badges:
- Synced → Green checkmark + "Synced"
- Syncing → Blue spinner + "Syncing..."
- Pending → Yellow circle + "Pending"
- Failed → Red X + "Failed"
```

### B. **Button Styling Updates**

**Action Button States:**
```
Default (enabled):
  - Background: Light color
  - Icon: Full opacity
  - Cursor: pointer
  - Hover: Darker background + tooltip

Disabled:
  - Background: Lighter/grayed
  - Icon: Reduced opacity (0.5)
  - Cursor: not-allowed
  - Hover: No tooltip, no background change

Loading:
  - Icon: Animated spinner
  - Text: "Syncing..." / "Generating..." etc.
  - Cursor: not-allowed
  - Button: Disabled appearance
```

**Button Colors:**
```
Sync Button:
  - Default: Blue/Cyan
  - On Hover: Darker blue
  - Disabled: Gray
  - Loading: Blue with spinner

Tracking Button:
  - Default: Teal/Cyan
  - On Hover: Darker teal
  - Disabled: Gray

AWB Button:
  - Default: Purple/Indigo
  - On Hover: Darker purple
  - Disabled: Gray

Confirm Button (✓):
  - Default: Green background
  - On Hover: Darker green
  - Disabled: Gray
  - Always shows success green when available

Cancel Button (✕):
  - Default: Red/Orange
  - On Hover: Darker red
  - Disabled: Gray

Generate Label:
  - Default: Orange
  - On Hover: Darker orange
  - Disabled: Gray
  - Loading: Orange with spinner

Download Label:
  - Default: Blue
  - On Hover: Darker blue
  - Downloaded: Green checkmark + date
  - Disabled: Gray
```

### C. **Table Row Styling**

**Row Highlight on State Changes:**
```
When action is in progress:
  - Row background: Light blue/yellow tint (0.1 opacity)
  - Subtle animation: Pulse or fade effect
  - Shows which order is being processed

When action completes:
  - Green success highlight (briefly)
  - Auto-fade after 2-3 seconds
  - Data refreshes automatically
```

### D. **Responsive Design Changes**

**Desktop (1200px+):**
- All columns visible
- Full tooltips on hover
- All buttons visible in action row

**Tablet (768px - 1199px):**
- Hide "Last Updated" column (optional)
- Compact buttons with icons only
- Tooltips still show on hover
- Action row stays on same row

**Mobile (< 768px):**
- Collapse non-essential columns
- Show: Order #, Customer, Amount, Status, Actions
- Hide: Shipping Status (show in details modal)
- Actions: Click to expand dropdown menu instead of row buttons
- Tooltip still appears on long-hold/tap
- Reorder label: Download button in action row
```

### E. **Visual Indicators**

**Row Status Indicators (Left Border):**
```
Confirmed → Green (2px left border)
Processing → Blue (2px left border)
In Transit → Cyan (2px left border)
Delivered → Green (2px left border)
Pending Sync → Orange (2px left border)
Failed Sync → Red (2px left border)
```

---

## 3. FUNCTION CHANGES (Behavior)

### A. **Conditional Button Visibility & Enabling Logic**

```javascript
SYNC BUTTON:
  Show: Always (except if order is cancelled)
  Enable: 
    - Order is NOT in final state (delivered, cancelled, exception)
    - Order validation passes
    - Provider connection is available
  Loading: During sync
  Tooltip Changes:
    - If disabled: "Order is [status]"
    - If enabled: "Automatically sync with best available courier"

UPDATE TRACKING BUTTON:
  Show: Only if order has waybill/AWB
  Enable: 
    - Waybill exists
    - Order not in final state
  Loading: During refresh
  Tooltip: "Refresh tracking information from courier"

AWB UPDATE BUTTON:
  Show: Always
  Enable: Always
  Action: Opens modal to edit AWB
  Tooltip: "Update or correct the Air Waybill number"

GENERATE LABEL BUTTON:
  Show: Only if order has waybill
  Enable: 
    - Waybill exists
    - Not already generating label
  Loading: During generation
  Tooltip: "Generate shipping label for this order"

DOWNLOAD LABEL BUTTON:
  Show: Only if label is available
  Enable: 
    - Label URL exists and is valid
    - Not already downloading
  State Indicator: 
    - Downloaded (show date and green checkmark)
    - Pending (show gray label icon)
  Tooltip: "Download shipping label PDF for printing"

CONFIRM BUTTON (✓):
  Show: Only if status is pending/awaiting_confirmation
  Enable: Always (when visible)
  Action: Confirms order, may auto-sync
  Tooltip: "Confirm order and proceed to shipping"

CANCEL BUTTON (✕):
  Show: Only if payment_type is 'cod' AND status is pending/awaiting_confirmation
  Enable: Always (when visible)
  Action: Opens confirmation modal
  Tooltip: "Cancel this order permanently"

VIEW DETAILS BUTTON (👁️):
  Show: Always
  Enable: Always
  Action: Opens order details modal
  Tooltip: "View order details and customer information"
```

### B. **Data Update/Refresh Strategy**

**After Sync Action:**
```
1. Show loading spinner on row
2. Disable all buttons except cancel
3. Send API request to sync
4. On success:
   - Update waybill/AWB in table
   - Update courier name
   - Update order status
   - Update label status to "Ready"
   - Show success toast notification
   - Refresh row data
5. On failure:
   - Show error toast with specific message
   - Show error icon on sync button
   - Keep row data unchanged
   - Allow retry
6. Auto-hide loading state
```

**After Label Generation:**
```
1. Show spinner on generate button
2. Disable button temporarily
3. Send API request
4. On success:
   - Show "Label Ready" badge
   - Enable download button
   - Show success toast
   - Optional: Auto-download or prompt
5. On failure:
   - Show error message
   - Retry option
```

**After Order Confirmation:**
```
1. Disable confirm button
2. Show loading state
3. May auto-sync if configured
4. Update status to "processing" or next status
5. Refresh table
6. Show success toast
```

### C. **Modal Interactions**

**Courier Selection Modal:**
```
- Opens when "Sync" button clicked
- Shows: Auto-select instructions + fallback sequence
- Only one button: "Sync Automatically"
- On close (without sync): Restore button state
- On sync start: Show progress in modal
- On sync complete: Close modal + refresh table
- On sync failure: Show error in modal + allow retry
```

**AWB Update Modal:**
```
- Opens when "Update AWB" button clicked
- Shows: Current AWB + Courier name
- Input field: New AWB number
- Buttons: Save, Cancel
- Validation: AWB format (if any)
- On save: Update via API + refresh row
- Tooltip: Help text about AWB format
```

**Confirm Order Modal:**
```
- Opens when "Confirm" button clicked
- Shows: Order summary
- Warning: Cannot undo
- Buttons: Confirm, Cancel
- On confirm: Send API + refresh table
- Auto-proceed to next step (sync, etc.)
```

**Cancel Order Modal:**
```
- Opens when "Cancel" button clicked
- Shows: Order summary + warning
- Message: "This action cannot be undone"
- Buttons: Cancel, Confirm Cancellation
- On confirm: Send API + refresh table
- Update status to "cancelled"
```

### D. **Real-time Updates & Polling**

```javascript
Label Status Refresh:
- Check every 30 seconds if order has label
- Auto-update label badge when available
- No manual refresh needed

Tracking Status Refresh:
- Can be triggered manually via button
- Shows last update timestamp
- Prevents too-frequent clicks (rate limiting)

Order Status Updates:
- Refresh table every 60 seconds (background)
- Higher frequency (5-10s) when row is being acted upon
- Lower frequency (2-5 min) in background
```

### E. **Error Handling & Validation**

```javascript
Before Sync:
  - Validate order has required fields
  - Validate address is complete
  - Validate payment status
  - Show specific validation errors to user

During Sync:
  - Show progress indication
  - If courier fails: Show "Trying next courier..."
  - If all fail: Show specific error message with all 3 couriers listed

After Action:
  - Show toast notification (success or error)
  - If error: Show "Retry" button option
  - Log error details for debugging
  - Prevent duplicate API calls
```

### F. **User Feedback Improvements**

```javascript
Loading States:
  - Animated spinner icon
  - Text shows action: "Syncing...", "Generating...", etc.
  - Button disabled, cursor: not-allowed
  - Prevent multiple clicks

Success Feedback:
  - Green toast notification
  - Checkmark icon
  - Auto-dismiss after 3-4 seconds
  - Sound notification (optional)

Error Feedback:
  - Red/orange toast notification
  - Error icon
  - Show specific error message
  - "Retry" button option
  - Manual dismiss or auto-dismiss after 5 seconds

Confirmation Modals:
  - Show affected order summary
  - Clear action description
  - Warn about irreversible actions
  - Highlight dangerous actions (red)
```

---

## 4. SPECIFIC COLUMN EXAMPLES

### Example 1: Order Status Display
```
Current:  "confirmed"
New:      [Green Badge: Confirmed] [Last updated: 2 hours ago]
         Subtext shows: "Ready to ship"
```

### Example 2: Waybill Column
```
Current:  "1323160115544"
New:      "1323160115544 (Xpressbees)"
         With edit icon for AWB update
         Color: Green if has waybill, Orange if missing
```

### Example 3: Label Status Column
```
Without label:  "📄 No Label" (Gray text, disabled download)
Ready:          "📥 Label Ready" (Blue text, enabled download)
Downloaded:     "✓ Downloaded on 2026-05-26" (Green text + date)
```

### Example 4: Actions Row
```
Before sync:
[View] [Sync] [Update AWB] [Confirm ✓] [Cancel ✕]

During sync:
[View] [⏳ Syncing...] [Update AWB] [Confirm ✓] [Cancel ✕]

After sync with label pending:
[View] [✓ Re-sync] [Update AWB] [Generate] [Download] [Confirm ✓]

After order delivered:
[View] [✓ Synced] [--] [--] [✓ Downloaded] [--]
(Most buttons disabled/hidden, only view available)
```

---

## 5. IMPLEMENTATION PRIORITY

### Phase 1 (Critical)
- [ ] Add badge styling for order/shipment status
- [ ] Update button conditional visibility logic
- [ ] Add loading states to buttons
- [ ] Implement tooltips (already done)
- [ ] Add waybill display with edit icon

### Phase 2 (Important)
- [ ] Add label status column
- [ ] Implement row refresh after actions
- [ ] Add success/error notifications
- [ ] Add confirmation modals
- [ ] Responsive design updates

### Phase 3 (Enhancement)
- [ ] Add row highlight on action
- [ ] Add visual status indicators (left border colors)
- [ ] Real-time polling for label status
- [ ] Add "last updated" timestamp
- [ ] Sound notifications for completion

---

## 6. CODE STRUCTURE

### Components to Modify:
1. **orders.jsx** (main table component)
   - Add conditional rendering logic
   - Add state management for row states
   - Add modal handlers

2. **Table.jsx** (table component)
   - Add custom column renderers
   - Add row styling based on status
   - Add loading state styling

3. **New Components Needed:**
   - OrderStatusBadge.jsx
   - ShipmentStatusBadge.jsx
   - ActionButtonGroup.jsx
   - ConfirmationModal.jsx
   - AWBUpdateModal.jsx
   - CourierSelectionModal.jsx

4. **Services to Update:**
   - orderService.js
     - Add error handling
     - Add success callbacks
     - Add data refresh logic

---

## 7. Testing Checklist

- [ ] Buttons show/hide correctly based on status
- [ ] Buttons enable/disable correctly based on conditions
- [ ] Loading states display properly
- [ ] Tooltips appear on hover
- [ ] Modals open/close correctly
- [ ] Data refreshes after actions
- [ ] Error messages display correctly
- [ ] Responsive design on mobile/tablet
- [ ] Toast notifications show/hide properly
- [ ] Multiple simultaneous actions handled correctly

---

**Last Updated**: 2026-05-27
**Status**: Analysis Complete - Ready for Implementation

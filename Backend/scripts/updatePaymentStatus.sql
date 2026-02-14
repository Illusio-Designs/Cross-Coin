-- =====================================================
-- SQL Script to Update Payment Status for Orders
-- =====================================================
-- This script updates payment_status for cancelled and RTO orders
-- Run this script after updating the ENUM types in the database
-- =====================================================

-- Step 1: First, we need to modify the ENUM type to include new values
-- WARNING: This will temporarily lock the table

-- For orders table - Add 'cancelled' and 'refund_pending' to payment_status ENUM
ALTER TABLE orders 
MODIFY COLUMN payment_status ENUM(
    'pending', 
    'paid', 
    'failed', 
    'refunded', 
    'cancelled', 
    'refund_pending'
) DEFAULT 'pending';

-- For payments table - Add 'cancelled', 'refund_pending', and 'completed' to status ENUM
ALTER TABLE payments 
MODIFY COLUMN status ENUM(
    'pending', 
    'successful', 
    'failed', 
    'refunded', 
    'cancelled', 
    'refund_pending',
    'completed'
) DEFAULT 'pending';

-- Add 'rto delivered' status to orders table status ENUM
ALTER TABLE orders 
MODIFY COLUMN status ENUM(
    'pending', 
    'processing', 
    'booked', 
    'pickup initiated', 
    'manifested', 
    'in transit', 
    'shipped', 
    'out for delivery', 
    'delivered', 
    'undelivered',
    'rto',
    'rto delivered',
    'cancelled', 
    'order cancelled', 
    'exception'
) DEFAULT 'pending';

-- =====================================================
-- Step 2: Update payment_status for existing orders
-- =====================================================

-- Update COD orders that are cancelled or RTO to have payment_status = 'cancelled'
UPDATE orders 
SET payment_status = 'cancelled'
WHERE (status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled'))
  AND payment_type = 'cod'
  AND payment_status != 'cancelled';

-- Update prepaid orders that are cancelled or RTO and were paid to have payment_status = 'refund_pending'
UPDATE orders 
SET payment_status = 'refund_pending'
WHERE (status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled'))
  AND payment_type != 'cod'
  AND payment_status = 'paid';

-- Update prepaid orders that are cancelled or RTO and were NOT paid to have payment_status = 'cancelled'
UPDATE orders 
SET payment_status = 'cancelled'
WHERE (status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled'))
  AND payment_type != 'cod'
  AND payment_status NOT IN ('paid', 'refund_pending', 'cancelled');

-- =====================================================
-- Step 3: Update payment records for cancelled/RTO orders
-- =====================================================

-- Update payment records for prepaid orders that need refunds
UPDATE payments p
INNER JOIN orders o ON p.order_id = o.id
SET p.status = 'refund_pending',
    p.notes = CASE 
        WHEN p.notes IS NULL OR p.notes = '' THEN CONCAT('Refund pending - Order ', o.status)
        ELSE CONCAT(p.notes, ' | Refund pending - Order ', o.status)
    END
WHERE o.status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled')
  AND o.payment_type != 'cod'
  AND o.payment_status = 'refund_pending'
  AND p.status IN ('successful', 'completed');

-- Update payment records for COD orders that are cancelled
UPDATE payments p
INNER JOIN orders o ON p.order_id = o.id
SET p.status = 'cancelled',
    p.notes = CASE 
        WHEN p.notes IS NULL OR p.notes = '' THEN CONCAT('Order ', o.status)
        ELSE CONCAT(p.notes, ' | Order ', o.status)
    END
WHERE o.status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled')
  AND o.payment_type = 'cod'
  AND p.status != 'cancelled';

-- =====================================================
-- Step 4: Verification Queries
-- =====================================================

-- Check cancelled/RTO orders with their payment status
SELECT 
    o.id,
    o.order_number,
    o.status,
    o.payment_type,
    o.payment_status,
    o.final_amount,
    p.status as payment_record_status,
    p.notes as payment_notes
FROM orders o
LEFT JOIN payments p ON o.id = p.order_id
WHERE o.status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled')
ORDER BY o.created_at DESC
LIMIT 50;

-- Summary of payment status by order status
SELECT 
    o.status as order_status,
    o.payment_type,
    o.payment_status,
    COUNT(*) as count,
    SUM(o.final_amount) as total_amount
FROM orders o
WHERE o.status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled')
GROUP BY o.status, o.payment_type, o.payment_status
ORDER BY o.status, o.payment_type, o.payment_status;

-- =====================================================
-- ROLLBACK SCRIPT (if needed)
-- =====================================================
-- Uncomment and run these if you need to rollback changes

/*
-- Rollback payment_status updates
UPDATE orders 
SET payment_status = 'pending'
WHERE status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled')
  AND payment_status IN ('cancelled', 'refund_pending');

-- Rollback payment records
UPDATE payments p
INNER JOIN orders o ON p.order_id = o.id
SET p.status = 'pending',
    p.notes = REGEXP_REPLACE(p.notes, ' \\| (Refund pending - Order|Order) [^|]*', '')
WHERE o.status IN ('cancelled', 'rto', 'rto delivered', 'order cancelled')
  AND p.status IN ('cancelled', 'refund_pending');
*/

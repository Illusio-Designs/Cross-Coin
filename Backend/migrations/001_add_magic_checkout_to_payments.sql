-- Migration: Add Magic Checkout fields to payments table
-- Date: 2024-02-26
-- Description: Adds Magic Checkout order ID, payment ID, and signature fields to the payments table
-- This migration is SAFE and will NOT remove any existing data

-- Check if columns already exist before adding them
-- This makes the migration idempotent (can be run multiple times safely)

-- Add magic_checkout_order_id column if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'magic_checkout_order_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL COMMENT ''Razorpay Magic Checkout order identifier'' AFTER razorpay_signature',
    'SELECT ''Column magic_checkout_order_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add magic_checkout_payment_id column if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'magic_checkout_payment_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL COMMENT ''Razorpay Magic Checkout payment identifier'' AFTER magic_checkout_order_id',
    'SELECT ''Column magic_checkout_payment_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add magic_checkout_signature column if it doesn't exist
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'magic_checkout_signature'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN magic_checkout_signature VARCHAR(255) NULL COMMENT ''Razorpay Magic Checkout payment signature for verification'' AFTER magic_checkout_payment_id',
    'SELECT ''Column magic_checkout_signature already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on magic_checkout_order_id if it doesn't exist
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND INDEX_NAME = 'idx_magic_checkout_order'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE payments ADD INDEX idx_magic_checkout_order (magic_checkout_order_id)',
    'SELECT ''Index idx_magic_checkout_order already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on magic_checkout_payment_id if it doesn't exist
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND INDEX_NAME = 'idx_magic_checkout_payment'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE payments ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id)',
    'SELECT ''Index idx_magic_checkout_payment already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Verify the migration
SELECT 
    'Migration 001 completed successfully' AS status,
    COUNT(*) AS magic_checkout_columns_added
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME IN ('magic_checkout_order_id', 'magic_checkout_payment_id', 'magic_checkout_signature');

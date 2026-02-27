-- ============================================================================
-- MAGIC CHECKOUT DATABASE MIGRATION - COMPLETE
-- ============================================================================
-- Date: 2024-02-27
-- Description: Complete database migration for Razorpay Magic Checkout
-- Safe to run on LIVE database - All operations are idempotent
-- ============================================================================

-- Set database (replace 'crosscoin' with your database name)
USE crosscoin;

-- ============================================================================
-- MIGRATION 1: Add Magic Checkout fields to payments table
-- ============================================================================
-- Purpose: Store Magic Checkout order IDs, payment IDs, and signatures
-- Impact: Adds 3 new columns and 2 indexes to payments table
-- Safe: Will NOT modify or delete existing data
-- ============================================================================

-- Add magic_checkout_order_id column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'magic_checkout_order_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL COMMENT ''Razorpay Magic Checkout order identifier'' AFTER razorpay_signature',
    'SELECT ''✓ Column magic_checkout_order_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add magic_checkout_payment_id column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'magic_checkout_payment_id'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL COMMENT ''Razorpay Magic Checkout payment identifier'' AFTER magic_checkout_order_id',
    'SELECT ''✓ Column magic_checkout_payment_id already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add magic_checkout_signature column
SET @column_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND COLUMN_NAME = 'magic_checkout_signature'
);

SET @sql = IF(@column_exists = 0,
    'ALTER TABLE payments ADD COLUMN magic_checkout_signature VARCHAR(255) NULL COMMENT ''Razorpay Magic Checkout payment signature for verification'' AFTER magic_checkout_payment_id',
    'SELECT ''✓ Column magic_checkout_signature already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on magic_checkout_order_id
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND INDEX_NAME = 'idx_magic_checkout_order'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE payments ADD INDEX idx_magic_checkout_order (magic_checkout_order_id)',
    'SELECT ''✓ Index idx_magic_checkout_order already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index on magic_checkout_payment_id
SET @index_exists = (
    SELECT COUNT(*) 
    FROM INFORMATION_SCHEMA.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE() 
    AND TABLE_NAME = 'payments' 
    AND INDEX_NAME = 'idx_magic_checkout_payment'
);

SET @sql = IF(@index_exists = 0,
    'ALTER TABLE payments ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id)',
    'SELECT ''✓ Index idx_magic_checkout_payment already exists'' AS message'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SELECT '✓ MIGRATION 1 COMPLETED: Magic Checkout fields added to payments table' AS status;

-- ============================================================================
-- MIGRATION 2: Create address_quality_scores table
-- ============================================================================
-- Purpose: Track address quality scores for COD serviceability
-- Impact: Creates new table with indexes
-- Safe: Uses CREATE TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS address_quality_scores (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary key',
    address_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA256 hash of the address for tracking',
    pincode VARCHAR(10) NOT NULL COMMENT 'Postal code of the address',
    quality_score INT NOT NULL DEFAULT 50 COMMENT 'Address quality score (0-100)',
    delivery_success_count INT NOT NULL DEFAULT 0 COMMENT 'Number of successful deliveries to this address',
    delivery_failure_count INT NOT NULL DEFAULT 0 COMMENT 'Number of failed deliveries to this address',
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Last update timestamp',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Creation timestamp',
    INDEX idx_pincode (pincode) COMMENT 'Index for pincode lookups',
    INDEX idx_quality_score (quality_score) COMMENT 'Index for quality score filtering',
    INDEX idx_address_hash (address_hash) COMMENT 'Index for address hash lookups'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
COMMENT='Tracks address quality scores for Magic Checkout COD serviceability';

SELECT '✓ MIGRATION 2 COMPLETED: address_quality_scores table created' AS status;

-- ============================================================================
-- MIGRATION 3: Ensure coupon_usage table exists
-- ============================================================================
-- Purpose: Track coupon usage for promotions in Magic Checkout
-- Impact: Creates new table with foreign keys if it doesn't exist
-- Safe: Uses CREATE TABLE IF NOT EXISTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS coupon_usage (
    id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary key',
    coupon_id INT NOT NULL COMMENT 'Foreign key to coupons table',
    user_id INT NULL COMMENT 'Foreign key to users table (NULL for guest users)',
    guest_user_id INT NULL COMMENT 'Foreign key to guest_users table (NULL for registered users)',
    order_id INT NULL COMMENT 'Foreign key to orders table',
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT 'Timestamp when coupon was used',
    INDEX idx_coupon_user (coupon_id, user_id) COMMENT 'Index for coupon usage by registered users',
    INDEX idx_coupon_guest (coupon_id, guest_user_id) COMMENT 'Index for coupon usage by guest users',
    INDEX idx_order (order_id) COMMENT 'Index for order lookups',
    CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    CONSTRAINT fk_coupon_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_coupon_usage_guest FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL,
    CONSTRAINT fk_coupon_usage_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci 
COMMENT='Tracks coupon usage for both registered and guest users';

SELECT '✓ MIGRATION 3 COMPLETED: coupon_usage table created' AS status;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify all migrations completed successfully
-- ============================================================================

-- Check payments table has Magic Checkout columns
SELECT 
    '✓ Payments Table Magic Checkout Columns' AS check_name,
    COUNT(*) AS columns_added,
    CASE 
        WHEN COUNT(*) = 3 THEN '✓ SUCCESS'
        ELSE '✗ FAILED - Expected 3 columns'
    END AS status
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME IN ('magic_checkout_order_id', 'magic_checkout_payment_id', 'magic_checkout_signature');

-- Check payments table has Magic Checkout indexes
SELECT 
    '✓ Payments Table Magic Checkout Indexes' AS check_name,
    COUNT(*) AS indexes_added,
    CASE 
        WHEN COUNT(*) = 2 THEN '✓ SUCCESS'
        ELSE '✗ FAILED - Expected 2 indexes'
    END AS status
FROM INFORMATION_SCHEMA.STATISTICS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'payments' 
AND INDEX_NAME IN ('idx_magic_checkout_order', 'idx_magic_checkout_payment');

-- Check address_quality_scores table exists
SELECT 
    '✓ Address Quality Scores Table' AS check_name,
    COUNT(*) AS table_exists,
    CASE 
        WHEN COUNT(*) = 1 THEN '✓ SUCCESS'
        ELSE '✗ FAILED - Table not found'
    END AS status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'address_quality_scores';

-- Check coupon_usage table exists
SELECT 
    '✓ Coupon Usage Table' AS check_name,
    COUNT(*) AS table_exists,
    CASE 
        WHEN COUNT(*) = 1 THEN '✓ SUCCESS'
        ELSE '✗ FAILED - Table not found'
    END AS status
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'coupon_usage';

-- ============================================================================
-- FINAL STATUS
-- ============================================================================

SELECT 
    '============================================' AS separator
UNION ALL
SELECT 
    '✓ ALL MIGRATIONS COMPLETED SUCCESSFULLY' AS separator
UNION ALL
SELECT 
    '============================================' AS separator
UNION ALL
SELECT 
    'Magic Checkout is now ready to use!' AS separator
UNION ALL
SELECT 
    '============================================' AS separator;

-- ============================================================================
-- OPTIONAL: View table structures
-- ============================================================================
-- Uncomment these to see the table structures

-- DESCRIBE payments;
-- DESCRIBE address_quality_scores;
-- DESCRIBE coupon_usage;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (USE ONLY IF NEEDED)
-- ============================================================================
-- ⚠️ WARNING: These commands will remove Magic Checkout functionality
-- Only use if you need to completely remove Magic Checkout
-- ============================================================================

/*
-- Rollback Migration 1: Remove Magic Checkout columns from payments
ALTER TABLE payments 
DROP COLUMN IF EXISTS magic_checkout_signature,
DROP COLUMN IF EXISTS magic_checkout_payment_id,
DROP COLUMN IF EXISTS magic_checkout_order_id,
DROP INDEX IF EXISTS idx_magic_checkout_order,
DROP INDEX IF EXISTS idx_magic_checkout_payment;

-- Rollback Migration 2: Remove address_quality_scores table
DROP TABLE IF EXISTS address_quality_scores;

-- Rollback Migration 3: Remove coupon_usage table
-- ⚠️ CAUTION: Only drop if this table was created by this migration
-- DROP TABLE IF EXISTS coupon_usage;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================

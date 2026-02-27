-- Run All Migrations for Razorpay Magic Checkout
-- Date: 2024-02-26
-- Description: Executes all Magic Checkout migrations in the correct order
-- This script is SAFE and will NOT remove any existing data

-- Set the database
USE crosscoin;

-- Display current database
SELECT DATABASE() AS current_database;

-- ============================================================================
-- MIGRATION 001: Add Magic Checkout fields to payments table
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'Running Migration 001: Add Magic Checkout fields to payments table' AS '';
SELECT '========================================' AS '';

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

SELECT 'Migration 001 completed successfully' AS status;

-- ============================================================================
-- MIGRATION 002: Create address_quality_scores table
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'Running Migration 002: Create address_quality_scores table' AS '';
SELECT '========================================' AS '';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks address quality scores for Magic Checkout COD serviceability';

SELECT 'Migration 002 completed successfully' AS status;

-- ============================================================================
-- MIGRATION 003: Ensure coupon_usage table exists
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'Running Migration 003: Ensure coupon_usage table exists' AS '';
SELECT '========================================' AS '';

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci COMMENT='Tracks coupon usage for both registered and guest users';

SELECT 'Migration 003 completed successfully' AS status;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT '========================================' AS '';
SELECT 'Verifying All Migrations' AS '';
SELECT '========================================' AS '';

-- Verify payments table columns
SELECT 
    'Payments table Magic Checkout columns' AS verification,
    COUNT(*) AS columns_added
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME IN ('magic_checkout_order_id', 'magic_checkout_payment_id', 'magic_checkout_signature');

-- Verify address_quality_scores table
SELECT 
    'Address quality scores table' AS verification,
    COUNT(*) AS table_exists
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'address_quality_scores';

-- Verify coupon_usage table
SELECT 
    'Coupon usage table' AS verification,
    COUNT(*) AS table_exists
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'coupon_usage';

SELECT '========================================' AS '';
SELECT 'All migrations completed successfully!' AS '';
SELECT '========================================' AS '';

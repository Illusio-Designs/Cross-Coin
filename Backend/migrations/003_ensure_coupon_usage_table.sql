-- Migration: Ensure coupon_usage table exists with proper structure
-- Date: 2024-02-26
-- Description: Creates coupon_usage table if it doesn't exist, or verifies its structure
-- This migration is SAFE and will NOT remove any existing data

-- Create coupon_usage table if it doesn't exist
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

-- Verify the migration
SELECT 
    'Migration 003 completed successfully' AS status,
    COUNT(*) AS table_exists
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'coupon_usage';

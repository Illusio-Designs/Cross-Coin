-- Migration: Create address_quality_scores table
-- Date: 2024-02-26
-- Description: Creates a new table to track address quality scores for COD serviceability
-- This migration is SAFE and will NOT remove any existing data

-- Create address_quality_scores table if it doesn't exist
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

-- Verify the migration
SELECT 
    'Migration 002 completed successfully' AS status,
    COUNT(*) AS table_exists
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
AND TABLE_NAME = 'address_quality_scores';

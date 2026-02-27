# Database Migrations for Razorpay Magic Checkout

This directory contains SQL migration files for the Razorpay Magic Checkout integration.

## Migration Files

### 001_add_magic_checkout_to_payments.sql
Adds Magic Checkout fields to the existing `payments` table:
- `magic_checkout_order_id` - Razorpay Magic Checkout order identifier
- `magic_checkout_payment_id` - Razorpay Magic Checkout payment identifier
- `magic_checkout_signature` - Payment signature for verification
- Indexes on `magic_checkout_order_id` and `magic_checkout_payment_id`

**Safe to run multiple times** - Uses conditional logic to check if columns/indexes exist before adding them.

### 002_create_address_quality_scores_table.sql
Creates a new `address_quality_scores` table for tracking address quality:
- Stores address hashes, pincodes, and quality scores
- Tracks delivery success/failure counts
- Includes indexes for efficient lookups

**Safe to run multiple times** - Uses `CREATE TABLE IF NOT EXISTS`.

### 003_ensure_coupon_usage_table.sql
Ensures the `coupon_usage` table exists with proper structure:
- Tracks coupon usage for both registered and guest users
- Links to coupons, users, guest_users, and orders tables
- Includes proper foreign key constraints

**Safe to run multiple times** - Uses `CREATE TABLE IF NOT EXISTS`.

## How to Run Migrations

### Option 1: Using MySQL Command Line

```bash
# Navigate to the migrations directory
cd Backend/migrations

# Run each migration in order
mysql -u root -p crosscoin < 001_add_magic_checkout_to_payments.sql
mysql -u root -p crosscoin < 002_create_address_quality_scores_table.sql
mysql -u root -p crosscoin < 003_ensure_coupon_usage_table.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin

1. Open your MySQL client
2. Select the `crosscoin` database
3. Open each migration file and execute the SQL

### Option 3: Using the Setup Script

```bash
# Run the database setup script (if available)
cd Backend
node scripts/setupDatabase.js
```

## Migration Safety

All migrations are designed to be:
- **Idempotent**: Can be run multiple times without errors
- **Non-destructive**: Will NOT delete or modify existing data
- **Backward compatible**: Existing functionality continues to work

## Verification

After running migrations, verify the changes:

```sql
-- Check payments table structure
DESCRIBE payments;

-- Check if Magic Checkout columns exist
SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE 
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'crosscoin' 
AND TABLE_NAME = 'payments' 
AND COLUMN_NAME LIKE 'magic_checkout%';

-- Check if address_quality_scores table exists
SHOW TABLES LIKE 'address_quality_scores';

-- Check address_quality_scores structure
DESCRIBE address_quality_scores;

-- Check if coupon_usage table exists
SHOW TABLES LIKE 'coupon_usage';

-- Check coupon_usage structure
DESCRIBE coupon_usage;
```

## Rollback (If Needed)

If you need to rollback the migrations:

```sql
-- Rollback migration 001
ALTER TABLE payments 
DROP COLUMN IF EXISTS magic_checkout_signature,
DROP COLUMN IF EXISTS magic_checkout_payment_id,
DROP COLUMN IF EXISTS magic_checkout_order_id,
DROP INDEX IF EXISTS idx_magic_checkout_order,
DROP INDEX IF EXISTS idx_magic_checkout_payment;

-- Rollback migration 002
DROP TABLE IF EXISTS address_quality_scores;

-- Rollback migration 003 (CAUTION: Only if table was created by this migration)
-- DROP TABLE IF EXISTS coupon_usage;
```

**⚠️ WARNING**: Rollback will remove the Magic Checkout functionality. Only rollback if absolutely necessary.

## Support

For issues or questions about migrations, refer to:
- `.kiro/specs/razorpay-magic-checkout/SETUP_GUIDE.md`
- `.kiro/specs/razorpay-magic-checkout/QUICK_REFERENCE.md`

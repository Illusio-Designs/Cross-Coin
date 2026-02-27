# Quick Start: Database Migrations for Magic Checkout

## Automatic Migration (Recommended)

The easiest way to run migrations is using the automated setup script:

```bash
cd Backend
node scripts/setupDatabase.js
```

This will:
- ✅ Create the database if it doesn't exist
- ✅ Sync all models
- ✅ Run all Magic Checkout migrations automatically
- ✅ Create admin user if needed
- ✅ Fix all constraints

**No manual SQL execution needed!**

## Manual Migration (Alternative)

If you prefer to run migrations manually:

### Option 1: Run All Migrations at Once

```bash
cd Backend/migrations
mysql -u root -p crosscoin < run_all_migrations.sql
```

### Option 2: Run Individual Migrations

```bash
cd Backend/migrations
mysql -u root -p crosscoin < 001_add_magic_checkout_to_payments.sql
mysql -u root -p crosscoin < 002_create_address_quality_scores_table.sql
mysql -u root -p crosscoin < 003_ensure_coupon_usage_table.sql
```

## Verify Migrations

After running migrations, verify they were successful:

```sql
-- Check payments table has Magic Checkout columns
DESCRIBE payments;

-- Check address_quality_scores table exists
SHOW TABLES LIKE 'address_quality_scores';

-- Check coupon_usage table exists
SHOW TABLES LIKE 'coupon_usage';
```

## What Gets Created

### 1. Payments Table Updates
- `magic_checkout_order_id` - Stores Razorpay Magic Checkout order ID
- `magic_checkout_payment_id` - Stores Razorpay Magic Checkout payment ID
- `magic_checkout_signature` - Stores payment signature for verification
- Indexes for fast lookups

### 2. Address Quality Scores Table (NEW)
- Tracks address quality for COD serviceability
- Stores delivery success/failure counts
- Calculates quality scores (0-100)

### 3. Coupon Usage Table (NEW)
- Tracks coupon usage for registered and guest users
- Links to orders for usage validation
- Supports per-user usage limits

## Safety Features

All migrations are:
- ✅ **Idempotent** - Can run multiple times safely
- ✅ **Non-destructive** - Won't delete existing data
- ✅ **Backward compatible** - Existing features continue working

## Troubleshooting

### Error: "Table already exists"
This is normal! The migrations check if tables exist before creating them.

### Error: "Column already exists"
This is normal! The migrations check if columns exist before adding them.

### Error: "Foreign key constraint fails"
Make sure you run migrations in order (001, 002, 003) and that referenced tables exist.

## Need Help?

See the full documentation:
- `Backend/migrations/README.md` - Complete migration guide
- `.kiro/specs/razorpay-magic-checkout/SETUP_GUIDE.md` - Full setup guide

# Database Migration Guide for Magic Checkout

## 📋 What Database Changes Are Needed?

Magic Checkout requires **3 database changes**:

### 1. Add Magic Checkout Fields to `payments` Table
- Adds 3 new columns to store Razorpay Magic Checkout data
- Adds 2 indexes for faster lookups
- **Safe**: Does NOT modify existing data

### 2. Create `address_quality_scores` Table
- New table to track address quality for COD serviceability
- Used by Magic Checkout to determine if COD is available
- **Safe**: Creates new table only

### 3. Create/Verify `coupon_usage` Table
- Tracks coupon usage for promotions
- Links coupons to users and orders
- **Safe**: Creates table if it doesn't exist

---

## 🚀 Quick Start: Run the Migration

### Option 1: Single SQL File (Recommended for Live)

```bash
# Download the migration file
# File: DATABASE_MIGRATION_MAGIC_CHECKOUT.sql

# Run on your database
mysql -u your_username -p your_database_name < DATABASE_MIGRATION_MAGIC_CHECKOUT.sql
```

### Option 2: MySQL Workbench / phpMyAdmin

1. Open MySQL Workbench or phpMyAdmin
2. Select your database (e.g., `crosscoin`)
3. Open the SQL tab
4. Copy and paste the contents of `DATABASE_MIGRATION_MAGIC_CHECKOUT.sql`
5. Click Execute

### Option 3: Individual Migration Files

```bash
cd Backend/migrations

# Run each migration
mysql -u root -p crosscoin < 001_add_magic_checkout_to_payments.sql
mysql -u root -p crosscoin < 002_create_address_quality_scores_table.sql
mysql -u root -p crosscoin < 003_ensure_coupon_usage_table.sql
```

---

## ✅ Verification

After running the migration, verify it worked:

```sql
-- Check payments table has new columns
DESCRIBE payments;
-- Should show: magic_checkout_order_id, magic_checkout_payment_id, magic_checkout_signature

-- Check new tables exist
SHOW TABLES LIKE 'address_quality_scores';
SHOW TABLES LIKE 'coupon_usage';

-- Check indexes
SHOW INDEX FROM payments WHERE Key_name LIKE 'idx_magic_checkout%';
```

---

## 📊 Database Changes Summary

### Payments Table (Modified)
```sql
ALTER TABLE payments ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL;
ALTER TABLE payments ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL;
ALTER TABLE payments ADD COLUMN magic_checkout_signature VARCHAR(255) NULL;
ALTER TABLE payments ADD INDEX idx_magic_checkout_order (magic_checkout_order_id);
ALTER TABLE payments ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id);
```

### Address Quality Scores Table (New)
```sql
CREATE TABLE address_quality_scores (
    id INT PRIMARY KEY AUTO_INCREMENT,
    address_hash VARCHAR(64) NOT NULL UNIQUE,
    pincode VARCHAR(10) NOT NULL,
    quality_score INT NOT NULL DEFAULT 50,
    delivery_success_count INT NOT NULL DEFAULT 0,
    delivery_failure_count INT NOT NULL DEFAULT 0,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_pincode (pincode),
    INDEX idx_quality_score (quality_score),
    INDEX idx_address_hash (address_hash)
);
```

### Coupon Usage Table (New)
```sql
CREATE TABLE coupon_usage (
    id INT PRIMARY KEY AUTO_INCREMENT,
    coupon_id INT NOT NULL,
    user_id INT NULL,
    guest_user_id INT NULL,
    order_id INT NULL,
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_coupon_user (coupon_id, user_id),
    INDEX idx_coupon_guest (coupon_id, guest_user_id),
    INDEX idx_order (order_id),
    FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
);
```

---

## 🔒 Safety Features

All migrations are:
- ✅ **Idempotent** - Can be run multiple times safely
- ✅ **Non-destructive** - Will NOT delete or modify existing data
- ✅ **Backward compatible** - Existing functionality continues to work
- ✅ **Conditional** - Checks if changes already exist before applying

---

## ⚠️ Important Notes

### For Live Database:
1. **Backup first!** Always backup your database before running migrations
2. **Test on staging** - Run on staging/test database first
3. **Low traffic time** - Run during low traffic hours
4. **Monitor** - Watch for any errors during execution

### Backup Command:
```bash
# Backup your database before migration
mysqldump -u root -p crosscoin > crosscoin_backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore if Needed:
```bash
# Restore from backup if something goes wrong
mysql -u root -p crosscoin < crosscoin_backup_YYYYMMDD_HHMMSS.sql
```

---

## 🔄 Rollback (If Needed)

If you need to remove Magic Checkout changes:

```sql
-- Remove Magic Checkout columns from payments
ALTER TABLE payments 
DROP COLUMN IF EXISTS magic_checkout_signature,
DROP COLUMN IF EXISTS magic_checkout_payment_id,
DROP COLUMN IF EXISTS magic_checkout_order_id,
DROP INDEX IF EXISTS idx_magic_checkout_order,
DROP INDEX IF EXISTS idx_magic_checkout_payment;

-- Remove address_quality_scores table
DROP TABLE IF EXISTS address_quality_scores;

-- Remove coupon_usage table (CAUTION!)
-- Only if this table was created by this migration
-- DROP TABLE IF EXISTS coupon_usage;
```

---

## 📝 Migration Checklist

Before running on LIVE:
- [ ] Backup database
- [ ] Test on staging/development database
- [ ] Verify backup is valid
- [ ] Schedule during low traffic time
- [ ] Have rollback plan ready
- [ ] Monitor application logs
- [ ] Test Magic Checkout after migration

After running on LIVE:
- [ ] Verify all tables/columns created
- [ ] Check indexes are in place
- [ ] Test Express Checkout flow
- [ ] Monitor for errors
- [ ] Keep backup for 7 days

---

## 🆘 Troubleshooting

### Error: "Table 'payments' doesn't exist"
**Solution**: Ensure you're connected to the correct database

### Error: "Foreign key constraint fails"
**Solution**: Ensure referenced tables (coupons, users, orders) exist

### Error: "Access denied"
**Solution**: Ensure database user has ALTER and CREATE privileges

### Error: "Duplicate column name"
**Solution**: Migration already ran - this is safe, columns already exist

---

## 📞 Support

If you encounter issues:
1. Check the error message carefully
2. Verify database connection
3. Ensure proper privileges
4. Check if migration already ran
5. Review backup before rollback

---

## ✨ After Migration

Once migration is complete:
1. ✅ Restart backend server
2. ✅ Test Express Checkout
3. ✅ Verify payment flow
4. ✅ Check database logs
5. ✅ Monitor for errors

**Magic Checkout will be fully functional after migration! 🚀**

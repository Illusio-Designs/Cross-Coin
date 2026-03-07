require("dotenv").config();
const { sequelize } = require("../config/db.js");
const path = require("path");
const fs = require("fs");

// In CommonJS, __filename and __dirname are available

const setupDatabase = async () => {
  try {
    // First, try to connect without selecting a database
    const { Sequelize } = require("sequelize");
    const tempSequelize = new Sequelize(
      "",
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || "mysql",
        logging: false,
      }
    );

    // Create database if it doesn't exist with proper collation
    await tempSequelize.query(
      `CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`
    );
    await tempSequelize.close();

    // Now connect to the specific database
    await sequelize.authenticate();
    console.log("Database connection established successfully.");

    // Load models
    console.log("Loading models and creating/altering tables...");

    const modelDir = path.join(__dirname, "..", "model");
    const modelFiles = fs
      .readdirSync(modelDir)
      .filter((file) => file.endsWith("Model.js"));

    const models = {};
    for (const file of modelFiles) {
      const modelPath = path.join(modelDir, file);
      const modelModule = require(modelPath);
      const modelName =
        file.charAt(0).toUpperCase() + file.slice(1).replace("Model.js", "");

      // Handle different export structures
      let model;
      if (modelModule[modelName]) {
        // Named export: module.exports = { ModelName }
        model = modelModule[modelName];
      } else if (modelModule.default) {
        // ES6 default export
        model = modelModule.default;
      } else if (typeof modelModule === "function") {
        // Function export
        model = modelModule;
      } else if (modelModule && typeof modelModule.sync === "function") {
        // Direct Sequelize model export: module.exports = Model
        model = modelModule;
      }

      if (model && typeof model.sync === "function") {
        console.log(`Loaded model: ${modelName}`);
        models[modelName] = model;
      } else {
        console.warn(
          `Skipping non-model file or model without sync method: ${file}`
        );
      }
    }

    // Apply associations BEFORE syncing
    console.log("Applying model associations...");
    try {
      const associationsPath = path.join(
        __dirname,
        "..",
        "model",
        "associations.js"
      );
      if (fs.existsSync(associationsPath)) {
        require(associationsPath);
        console.log("✓ Associations applied successfully");
      } else {
        console.warn(
          "⚠️ associations.js not found. Models should define their own associations."
        );
      }
    } catch (assocError) {
      console.error("❌ Error applying associations:", assocError.message);
    }

    // Sync all tables at once (this creates all tables and relationships)
    // Use force: false and alter: false to prevent constraint issues
    console.log("Syncing all tables...");
    await sequelize.sync({ force: false, alter: false, hooks: false });
    console.log("✓ All tables synced");

    // Fix shipping_addresses table constraints for guest users
    console.log("Fixing shipping_addresses table constraints...");
    try {
      // Drop the existing foreign key constraint if it exists
      await sequelize.query(`
                ALTER TABLE shipping_addresses 
                DROP FOREIGN KEY IF EXISTS shipping_addresses_ibfk_1
            `);

      // Drop any other foreign key constraints that might exist
      const [constraints] = await sequelize.query(`
                SELECT CONSTRAINT_NAME 
                FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
                WHERE TABLE_SCHEMA = DATABASE() 
                AND TABLE_NAME = 'shipping_addresses' 
                AND REFERENCED_TABLE_NAME = 'users'
            `);

      for (const constraint of constraints) {
        await sequelize.query(`
                    ALTER TABLE shipping_addresses 
                    DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
                `);
      }

      // Add the correct foreign key constraint that allows NULL values
      await sequelize.query(`
                ALTER TABLE shipping_addresses 
                ADD CONSTRAINT shipping_addresses_user_id_fk 
                FOREIGN KEY (user_id) REFERENCES users(id) 
                ON DELETE CASCADE ON UPDATE CASCADE
            `);

      // Add foreign key constraint for guest_user_id
      await sequelize.query(`
                ALTER TABLE shipping_addresses 
                ADD CONSTRAINT shipping_addresses_guest_user_id_fk 
                FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) 
                ON DELETE CASCADE ON UPDATE CASCADE
            `);

      console.log("✓ Shipping address constraints fixed");
    } catch (constraintError) {
      console.log(
        "⚠️ Constraint fix skipped (constraints may already be correct):",
        constraintError.message
      );
    }

    // Fix order_status_history table constraints
    console.log("Fixing order_status_history table constraints...");
    try {
      // Drop existing foreign key constraints if they exist
      const [constraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'order_status_history'
        AND REFERENCED_TABLE_NAME = 'users'
      `);

      for (const constraint of constraints) {
        await sequelize.query(`
          ALTER TABLE order_status_history
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
      }

      // Ensure updated_by column allows NULL values
      await sequelize.query(`
        ALTER TABLE order_status_history
        MODIFY COLUMN updated_by INT NULL
      `);

      // Add foreign key constraint for order_id (this should work fine)
      await sequelize.query(`
        ALTER TABLE order_status_history
        ADD CONSTRAINT order_status_history_order_id_fk
        FOREIGN KEY (order_id) REFERENCES orders(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);

      console.log("✓ Order status history constraints fixed");
    } catch (constraintError) {
      console.log(
        "⚠️ Order status history constraint fix skipped (constraints may already be correct):",
        constraintError.message
      );
    }

    // Fix payments table constraints for guest users
    console.log("Fixing payments table constraints for guest users...");
    try {
      // Drop existing foreign key constraints if they exist
      const [userConstraints] = await sequelize.query(`
        SELECT CONSTRAINT_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'payments'
        AND REFERENCED_TABLE_NAME = 'users'
      `);

      for (const constraint of userConstraints) {
        await sequelize.query(`
          ALTER TABLE payments
          DROP FOREIGN KEY ${constraint.CONSTRAINT_NAME}
        `);
      }

      // Ensure user_id column allows NULL values
      await sequelize.query(`
        ALTER TABLE payments
        MODIFY COLUMN user_id INT NULL
      `);

      // Add foreign key constraint for user_id (allows NULL)
      await sequelize.query(`
        ALTER TABLE payments
        ADD CONSTRAINT payments_user_id_fk
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);

      // Add foreign key constraint for guest_user_id
      await sequelize.query(`
        ALTER TABLE payments
        ADD CONSTRAINT payments_guest_user_id_fk
        FOREIGN KEY (guest_user_id) REFERENCES guest_users(id)
        ON DELETE CASCADE ON UPDATE CASCADE
      `);

      console.log("✓ Payments constraints fixed for guest users");
    } catch (constraintError) {
      console.log(
        "⚠️ Payments constraint fix skipped (constraints may already be correct):",
        constraintError.message
      );
    }

    // Run Magic Checkout migrations
    console.log("Running Magic Checkout migrations...");
    try {
      // Migration 001: Add Magic Checkout fields to payments table
      console.log("Running migration 001: Add Magic Checkout fields to payments...");
      
      // Check and add magic_checkout_order_id
      const [orderIdExists] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'magic_checkout_order_id'
      `);
      
      if (orderIdExists[0].count === 0) {
        await sequelize.query(`
          ALTER TABLE payments 
          ADD COLUMN magic_checkout_order_id VARCHAR(255) NULL 
          COMMENT 'Razorpay Magic Checkout order identifier'
        `);
        console.log("  ✓ Added magic_checkout_order_id column");
      } else {
        console.log("  ✓ magic_checkout_order_id column already exists");
      }
      
      // Check and add magic_checkout_payment_id
      const [paymentIdExists] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'magic_checkout_payment_id'
      `);
      
      if (paymentIdExists[0].count === 0) {
        await sequelize.query(`
          ALTER TABLE payments 
          ADD COLUMN magic_checkout_payment_id VARCHAR(255) NULL 
          COMMENT 'Razorpay Magic Checkout payment identifier'
        `);
        console.log("  ✓ Added magic_checkout_payment_id column");
      } else {
        console.log("  ✓ magic_checkout_payment_id column already exists");
      }
      
      // Check and add magic_checkout_signature
      const [signatureExists] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'magic_checkout_signature'
      `);
      
      if (signatureExists[0].count === 0) {
        await sequelize.query(`
          ALTER TABLE payments 
          ADD COLUMN magic_checkout_signature VARCHAR(255) NULL 
          COMMENT 'Razorpay Magic Checkout payment signature for verification'
        `);
        console.log("  ✓ Added magic_checkout_signature column");
      } else {
        console.log("  ✓ magic_checkout_signature column already exists");
      }
      
      // Check and add indexes
      const [orderIndexExists] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND INDEX_NAME = 'idx_magic_checkout_order'
      `);
      
      if (orderIndexExists[0].count === 0) {
        await sequelize.query(`
          ALTER TABLE payments 
          ADD INDEX idx_magic_checkout_order (magic_checkout_order_id)
        `);
        console.log("  ✓ Added idx_magic_checkout_order index");
      } else {
        console.log("  ✓ idx_magic_checkout_order index already exists");
      }
      
      const [paymentIndexExists] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND INDEX_NAME = 'idx_magic_checkout_payment'
      `);
      
      if (paymentIndexExists[0].count === 0) {
        await sequelize.query(`
          ALTER TABLE payments 
          ADD INDEX idx_magic_checkout_payment (magic_checkout_payment_id)
        `);
        console.log("  ✓ Added idx_magic_checkout_payment index");
      } else {
        console.log("  ✓ idx_magic_checkout_payment index already exists");
      }
      
      console.log("✓ Migration 001 completed");
      
      // Migration 002: Create address_quality_scores table
      console.log("Running migration 002: Create address_quality_scores table...");
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS address_quality_scores (
          id INT PRIMARY KEY AUTO_INCREMENT COMMENT 'Primary key',
          address_hash VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA256 hash of the address for tracking',
          pincode VARCHAR(10) NOT NULL COMMENT 'Postal code of the address',
          quality_score INT NOT NULL DEFAULT 50 COMMENT 'Address quality score (0-100)',
          delivery_success_count INT NOT NULL DEFAULT 0 COMMENT 'Number of successful deliveries',
          delivery_failure_count INT NOT NULL DEFAULT 0 COMMENT 'Number of failed deliveries',
          last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_pincode (pincode),
          INDEX idx_quality_score (quality_score),
          INDEX idx_address_hash (address_hash)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ Migration 002 completed");
      
      // Migration 003: Ensure coupon_usage table exists
      console.log("Running migration 003: Ensure coupon_usage table exists...");
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS coupon_usage (
          id INT PRIMARY KEY AUTO_INCREMENT,
          coupon_id INT NOT NULL,
          user_id INT NULL,
          guest_user_id INT NULL,
          order_id INT NULL,
          used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_coupon_user (coupon_id, user_id),
          INDEX idx_coupon_guest (coupon_id, guest_user_id),
          INDEX idx_order (order_id),
          CONSTRAINT fk_coupon_usage_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
          CONSTRAINT fk_coupon_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
          CONSTRAINT fk_coupon_usage_guest FOREIGN KEY (guest_user_id) REFERENCES guest_users(id) ON DELETE SET NULL,
          CONSTRAINT fk_coupon_usage_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ Migration 003 completed");
      
      console.log("✓ All Magic Checkout migrations completed successfully");
    } catch (migrationError) {
      console.log("⚠️ Magic Checkout migration warning:", migrationError.message);
      // Don't fail the entire setup if migrations have issues
    }

    // Create brand_settings table
    console.log("Creating brand_settings table...");
    await createBrandSettingsTable();

    // Create brands table
    console.log("Creating brands table...");
    await createBrandsTable();

    // Create slider_brands table
    console.log("Creating slider_brands table...");
    // await createSliderBrandsTable(); // Temporarily disabled - function defined later in file

    // Now it's safe to create the admin user
    if (models["User"]) {
      const bcrypt = require("bcryptjs");
      const adminEmail = "admin@admin.com";
      const adminPassword = "Admin@123";
      const adminUsername = "admin";
      const adminRole = "admin";
      const existingAdmin = await models["User"].findOne({
        where: { email: adminEmail },
      });
      if (!existingAdmin) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await models["User"].create({
          username: adminUsername,
          email: adminEmail,
          password: hashedPassword,
          role: adminRole,
        });
        console.log("✓ Admin user created: admin@admin.com / Admin@123");
      } else {
        console.log("✓ Admin user already exists");
      }
    }

    console.log("✓ Database setup completed successfully!");
    
    // Create RTO stock restoration table
    console.log("\nCreating RTO stock restoration table...");
    await createRTOStockRestorationTable();
    
    // Clean up duplicate payments
    console.log("\nCleaning up duplicate payments...");
    await cleanupDuplicatePayments();
    
    // Sync payment data (fix NULL payment_type and amount_paid)
    console.log("\nSyncing payment data...");
    await syncPaymentData();
    
    // Fix category image paths
    console.log("\nFixing category image paths...");
    await fixCategoryImagePaths();
    
    // Fix corrupted product image URLs
    console.log("\nFixing corrupted product image URLs...");
    await fixProductImageUrls();
    
    // Update coupon table with new fields
    console.log("\nUpdating coupon table with new fields...");
    await updateCouponTable();
    
    // Add fship_last_synced_at column to orders table
    console.log("\nAdding fship_last_synced_at column to orders table...");
    await addFshipLastSyncedAtColumn();
    
    return true;
  } catch (error) {
    console.error("❌ Database setup failed:", error.message);
    if (error.parent?.sqlMessage) {
      console.error("SQL Error:", error.parent.sqlMessage);
      if (error.sql) {
        console.error("Faulty SQL:", error.sql);
      }
    }
    throw error;
  }
};

// Function to clean up duplicate payments
const cleanupDuplicatePayments = async () => {
  try {
    const { Payment } = require("../model/paymentModel.js");

    console.log("Checking for duplicate payment records...");

    // Find all payments grouped by order_id
    const [duplicates] = await sequelize.query(`
      SELECT order_id, COUNT(*) as count
      FROM payments
      GROUP BY order_id
      HAVING count > 1
    `);

    if (duplicates.length === 0) {
      console.log("✓ No duplicate payments found");
      return;
    }

    console.log(`Found ${duplicates.length} orders with duplicate payments`);

    let removed = 0;

    for (const dup of duplicates) {
      // Get all payments for this order
      const payments = await Payment.findAll({
        where: { order_id: dup.order_id },
        order: [
          ["status", "DESC"], // Keep successful over pending
          ["createdAt", "DESC"], // Keep latest
        ],
      });

      // Keep the first one (successful and latest), delete the rest
      const toKeep = payments[0];
      const toDelete = payments.slice(1);

      for (const payment of toDelete) {
        await payment.destroy();
        removed++;
        console.log(
          `  Removed duplicate payment ID ${payment.id} for order ${dup.order_id}`
        );
      }
    }

    console.log(`✓ Removed ${removed} duplicate payment records`);
  } catch (error) {
    console.error("⚠️ Error cleaning up duplicate payments:", error.message);
  }
};

// Function to sync payment data
const syncPaymentData = async () => {
  try {
    const { Payment } = require("../model/paymentModel.js");
    const { Order } = require("../model/orderModel.js");

    console.log("Checking payments for missing data...");

    // Get all payments
    const allPayments = await Payment.findAll({
      include: [
        {
          model: Order,
          attributes: ["id", "order_number", "payment_type", "final_amount"],
        },
      ],
    });

    let stats = {
      nullPaymentType: 0,
      nullAmount: 0,
      updated: 0,
    };

    for (const payment of allPayments) {
      let needsUpdate = false;
      const updates = {};

      // Fix NULL payment_type
      if (!payment.payment_type) {
        stats.nullPaymentType++;
        if (payment.Order && payment.Order.payment_type) {
          updates.payment_type = payment.Order.payment_type;
          needsUpdate = true;
        } else {
          // Default to COD if order also doesn't have it
          updates.payment_type = "cod";
          needsUpdate = true;
        }
      }

      // Fix NULL or 0 amount_paid
      if (!payment.amount_paid || payment.amount_paid === 0) {
        stats.nullAmount++;
        if (payment.Order && payment.Order.final_amount) {
          updates.amount_paid = payment.Order.final_amount;
          needsUpdate = true;
        }
      }

      // Update if needed
      if (needsUpdate) {
        await payment.update(updates);
        stats.updated++;
      }
    }

    if (stats.updated > 0) {
      console.log(`✓ Fixed ${stats.nullPaymentType} payments with NULL payment_type`);
      console.log(`✓ Fixed ${stats.nullAmount} payments with NULL/0 amount`);
      console.log(`✓ Total payments updated: ${stats.updated}`);
    } else {
      console.log("✓ All payment data is already synchronized");
    }
  } catch (error) {
    console.error("⚠️ Error syncing payment data:", error.message);
  }
};

// Function to fix category image paths
const fixCategoryImagePaths = async () => {
  try {
    const { Category } = require('../model/categoryModel');
    
    console.log('Checking category image paths...');
    
    // Get all categories
    const categories = await Category.findAll();
    
    let fixed = 0;
    
    for (const category of categories) {
      if (category.image && category.image.includes('//uploads/')) {
        // Remove duplicate /uploads/categories/ paths
        let cleanPath = category.image;
        
        // Keep removing duplicate paths until clean
        while (cleanPath.includes('//uploads/categories/')) {
          cleanPath = cleanPath.replace('//uploads/categories/', '/');
        }
        
        // Extract just the filename
        const filename = cleanPath.split('/').pop();
        
        console.log(`  Fixing category ${category.id}: ${category.name}`);
        console.log(`    Old: ${category.image}`);
        console.log(`    New: ${filename}`);
        
        // Update with just the filename
        await category.update({ image: filename });
        fixed++;
      }
    }
    
    if (fixed > 0) {
      console.log(`✓ Fixed ${fixed} category image paths`);
    } else {
      console.log('✓ All category image paths are already correct');
    }
  } catch (error) {
    console.error('⚠️ Error fixing category image paths:', error.message);
  }
};

// Function to fix corrupted product image URLs
const fixProductImageUrls = async () => {
  try {
    const { ProductSEO } = require('../model/associations.js');
    const { Op } = require('sequelize');
    
    console.log('Checking for corrupted ogImage URLs...');
    
    // Find all ProductSEO records with corrupted ogImage URLs
    const corruptedRecords = await ProductSEO.findAll({
      where: {
        ogImage: {
          [Op.and]: [
            { [Op.not]: null },
            { [Op.like]: 'https://api.crosscoin.in%' },
            { [Op.notLike]: 'https://api.crosscoin.in/uploads/%' }
          ]
        }
      }
    });
    
    console.log(`Found ${corruptedRecords.length} records with corrupted ogImage URLs`);
    
    let fixedCount = 0;
    
    for (const record of corruptedRecords) {
      const originalUrl = record.ogImage;
      
      // Extract the filename from the corrupted URL
      // Example: "https://api.crosscoin.invariation_0_image-1753379446299-705405863.png"
      // Should become: "https://api.crosscoin.in/uploads/products/variation_0_image-1753379446299-705405863.png"
      
      if (originalUrl.includes('variation_') && originalUrl.endsWith('.png')) {
        // Extract filename after the last occurrence of 'in'
        const parts = originalUrl.split('in');
        if (parts.length > 1) {
          const filename = parts[parts.length - 1];
          const fixedUrl = `https://api.crosscoin.in/uploads/products/${filename}`;
          
          await record.update({ ogImage: fixedUrl });
          console.log(`  Fixed ogImage: ${originalUrl} -> ${fixedUrl}`);
          fixedCount++;
        }
      }
    }
    
    // Also fix structured data that might have corrupted image URLs
    const recordsWithStructuredData = await ProductSEO.findAll({
      where: {
        structuredData: {
          [Op.not]: null
        }
      }
    });
    
    let structuredDataFixedCount = 0;
    
    for (const record of recordsWithStructuredData) {
      try {
        const structuredData = JSON.parse(record.structuredData);
        
        if (structuredData.image && typeof structuredData.image === 'string') {
          const originalImageUrl = structuredData.image;
          
          // Fix corrupted image URLs in structured data
          if (originalImageUrl.includes('api.crosscoin.in') && 
              !originalImageUrl.includes('/uploads/products/') &&
              originalImageUrl.includes('variation_')) {
            
            const parts = originalImageUrl.split('in');
            if (parts.length > 1) {
              const filename = parts[parts.length - 1];
              const fixedUrl = `https://api.crosscoin.in/uploads/products/${filename}`;
              
              structuredData.image = fixedUrl;
              
              await record.update({ 
                structuredData: JSON.stringify(structuredData) 
              });
              
              console.log(`  Fixed structured data image: ${originalImageUrl} -> ${fixedUrl}`);
              structuredDataFixedCount++;
            }
          }
        }
      } catch (error) {
        console.error(`  Error parsing structured data for record ${record.id}:`, error.message);
      }
    }
    
    if (fixedCount > 0 || structuredDataFixedCount > 0) {
      console.log(`✓ Fixed ${fixedCount} ogImage URLs`);
      console.log(`✓ Fixed ${structuredDataFixedCount} structured data image URLs`);
    } else {
      console.log('✓ All product image URLs are already correct');
    }
  } catch (error) {
    console.error('⚠️ Error fixing product image URLs:', error.message);
  }
};

const findAvailablePort = async (startPort) => {
  const net = require("net");
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(findAvailablePort(startPort + 1));
      } else {
        reject(err);
      }
    });
    server.listen(startPort, () => {
      server.close(() => {
        resolve(startPort);
      });
    });
  });
};

// Function to create RTO stock restoration table
const createRTOStockRestorationTable = async () => {
  try {
    console.log('Creating RTO stock restoration table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS rto_stock_restoration (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        order_number VARCHAR(255) NOT NULL,
        product_id INT NOT NULL,
        variation_id INT NULL,
        quantity_restored INT NOT NULL,
        stock_before INT NOT NULL DEFAULT 0,
        stock_after INT NOT NULL DEFAULT 0,
        restored_by VARCHAR(255) NULL COMMENT 'admin_id or system',
        notes TEXT NULL,
        restoration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_order_id (order_id),
        INDEX idx_product_id (product_id),
        INDEX idx_variation_id (variation_id),
        INDEX idx_restoration_date (restoration_date),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
        FOREIGN KEY (variation_id) REFERENCES product_variations(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('✓ RTO stock restoration table created successfully');
  } catch (error) {
    console.log('⚠️ RTO stock restoration table creation skipped (table may already exist):', error.message);
  }
};

// Function to update coupon table with new fields
const updateCouponTable = async () => {
  try {
    console.log('Adding new fields to coupons table...');

    // Add new columns to coupons table
    await sequelize.query(`
      ALTER TABLE coupons 
      ADD COLUMN IF NOT EXISTS paymentModeRestriction ENUM('all', 'cod', 'prepaid') DEFAULT 'all' COMMENT 'Restrict coupon to specific payment modes'
    `);
    console.log('✓ Added paymentModeRestriction column');

    await sequelize.query(`
      ALTER TABLE coupons 
      ADD COLUMN IF NOT EXISTS firstOrderOnly BOOLEAN DEFAULT FALSE COMMENT 'Coupon only valid for first orders'
    `);
    console.log('✓ Added firstOrderOnly column');

    await sequelize.query(`
      ALTER TABLE coupons 
      ADD COLUMN IF NOT EXISTS tieredDiscounts JSON COMMENT 'Array of {minAmount, discount} for tiered discounts'
    `);
    console.log('✓ Added tieredDiscounts column');

    await sequelize.query(`
      ALTER TABLE coupons 
      ADD COLUMN IF NOT EXISTS quantityBasedDiscounts JSON COMMENT 'Array of {minQuantity, discount} for quantity-based discounts'
    `);
    console.log('✓ Added quantityBasedDiscounts column');

    // Update the type enum to include new types
    await sequelize.query(`
      ALTER TABLE coupons 
      MODIFY COLUMN type ENUM('percentage', 'fixed', 'tiered', 'quantity_based') NOT NULL
    `);
    console.log('✓ Updated type enum');

    console.log('✓ Coupon table update completed successfully!');
    
  } catch (error) {
    console.log('⚠️ Coupon table update skipped (columns may already exist):', error.message);
  }
};

// Function to create brand_settings table
const createBrandSettingsTable = async () => {
  try {
    console.log('Creating brand_settings table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS brand_settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        brand_id INT NOT NULL COMMENT 'Reference to brands table',
        \`key\` VARCHAR(100) NOT NULL COMMENT 'Setting key',
        value TEXT COMMENT 'Setting value (encrypted for sensitive data)',
        is_encrypted TINYINT(1) DEFAULT 0 COMMENT 'Whether the value is encrypted',
        category ENUM('payment','analytics','social_media','shipping','email','sms','general') DEFAULT 'general' COMMENT 'Setting category',
        description VARCHAR(255) COMMENT 'Human-readable description',
        updated_by INT COMMENT 'User who last updated this setting',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_brand_id (brand_id),
        INDEX idx_category (category),
        UNIQUE KEY unique_brand_key (brand_id, \`key\`),
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('✓ brand_settings table created successfully');
    
  } catch (error) {
    console.log('⚠️ Brand settings table creation skipped (table may already exist):', error.message);
  }
};

// Function to create brands table
const createBrandsTable = async () => {
  try {
    console.log('Creating brands table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE COMMENT 'Brand name',
        slug VARCHAR(100) NOT NULL UNIQUE COMMENT 'URL-friendly brand identifier',
        display_name VARCHAR(100) NOT NULL COMMENT 'Display name for the brand',
        domain VARCHAR(255) COMMENT 'Custom domain for the brand',
        logo_url VARCHAR(500) COMMENT 'Brand logo URL',
        primary_color VARCHAR(7) COMMENT 'Primary theme color (hex)',
        secondary_color VARCHAR(7) COMMENT 'Secondary theme color (hex)',
        contact_email VARCHAR(255) COMMENT 'Brand contact email',
        contact_phone VARCHAR(20) COMMENT 'Brand contact phone',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT 'Brand status',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slug (slug),
        INDEX idx_domain (domain),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('✓ brands table created successfully');

    // Insert default brand if table is empty
    const [existingBrands] = await sequelize.query('SELECT COUNT(*) as count FROM brands');
    
    if (existingBrands[0].count === 0) {
      console.log('Inserting default brand...');
      
      await sequelize.query(`
        INSERT INTO brands (name, slug, display_name, status, primary_color, contact_email) VALUES
        ('CrossCoin', 'crosscoin', 'CrossCoin Store', 'active', '#4CAF50', 'contact@crosscoin.com')
      `);
      
      console.log('✓ Default brand inserted');
    }
    
  } catch (error) {
    console.log('⚠️ Brands table creation/migration skipped:', error.message);
  }
};

// Function to create slider_brands table
const createSliderBrandsTable = async () => {
  try {
    console.log('Creating slider_brands table...');

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS slider_brands (
        id INT AUTO_INCREMENT PRIMARY KEY,
        slider_id INT NOT NULL COMMENT 'Reference to sliders table',
        brand_id INT NOT NULL COMMENT 'Reference to brands table',
        status ENUM('active', 'inactive') DEFAULT 'active' COMMENT 'Assignment status',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_slider_id (slider_id),
        INDEX idx_brand_id (brand_id),
        INDEX idx_status (status),
        UNIQUE KEY unique_slider_brand (slider_id, brand_id),
        FOREIGN KEY (slider_id) REFERENCES sliders(id) ON DELETE CASCADE ON UPDATE CASCADE,
        FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('✓ slider_brands table created successfully');

    // Migrate existing slider brand_id to slider_brands table
    console.log('Migrating existing slider brand assignments...');
    
    const [existingSliders] = await sequelize.query(`
      SELECT id, brand_id FROM sliders WHERE brand_id IS NOT NULL
    `);

    if (existingSliders.length > 0) {
      for (const slider of existingSliders) {
        // Check if relationship already exists
        const [existing] = await sequelize.query(`
          SELECT COUNT(*) as count FROM slider_brands 
          WHERE slider_id = ${slider.id} AND brand_id = ${slider.brand_id}
        `);

        if (existing[0].count === 0) {
          await sequelize.query(`
            INSERT INTO slider_brands (slider_id, brand_id, status) 
            VALUES (${slider.id}, ${slider.brand_id}, 'active')
          `);
          console.log(`  ✓ Migrated slider ${slider.id} to brand ${slider.brand_id}`);
        }
      }
      console.log(`✓ Migrated ${existingSliders.length} slider brand assignments`);
    } else {
      console.log('✓ No existing slider brand assignments to migrate');
    }

    // Make brand_id nullable in sliders table for backward compatibility
    await sequelize.query(`
      ALTER TABLE sliders 
      MODIFY COLUMN brand_id INT NULL COMMENT 'Legacy brand reference (use slider_brands table instead)'
    `);
    console.log('✓ Updated sliders.brand_id to nullable');
    
  } catch (error) {
    console.log('⚠️ Slider brands table creation/migration skipped:', error.message);
  }
};

// Function to add fship_last_synced_at column to orders table
const addFshipLastSyncedAtColumn = async () => {
  try {
    console.log('Checking if fship_last_synced_at column exists in orders table...');

    // Check if column exists
    const [columnExists] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'fship_last_synced_at'
    `);

    if (columnExists[0].count === 0) {
      console.log('Adding fship_last_synced_at column to orders table...');
      
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN fship_last_synced_at DATETIME NULL 
        COMMENT 'Last time this order was synced with FShip' 
        AFTER brand_id
      `);
      
      console.log('✓ fship_last_synced_at column added successfully');
    } else {
      console.log('✓ fship_last_synced_at column already exists');
    }
  } catch (error) {
    console.log('⚠️ Error adding fship_last_synced_at column:', error.message);
  }
};

module.exports = { setupDatabase, findAvailablePort };

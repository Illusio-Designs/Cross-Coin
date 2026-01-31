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
        model = modelModule[modelName];
      } else if (modelModule.default) {
        model = modelModule.default;
      } else if (typeof modelModule === "function") {
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
    // AUTOMATION: Always alter tables to match the latest model definitions (auto-migration)
    console.log("Syncing all tables...");
    await sequelize.sync({ alter: true, hooks: false });
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

module.exports = { setupDatabase, findAvailablePort };

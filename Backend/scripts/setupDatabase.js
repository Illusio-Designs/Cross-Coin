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
      if (modelModule && typeof modelModule.sync === "function") {
        // Direct Sequelize model export: module.exports = Model
        model = modelModule;
      } else if (modelModule[modelName] && typeof modelModule[modelName].sync === "function") {
        // Named export matching filename: module.exports = { ModelName }
        model = modelModule[modelName];
      } else if (modelModule.default && typeof modelModule.default.sync === "function") {
        // ES6 default export
        model = modelModule.default;
      } else {
        // Last resort: find any exported value with a sync method
        const found = Object.values(modelModule).find(
          (v) => v && typeof v.sync === "function"
        );
        if (found) model = found;
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

    // Pre-sync fix: ensure FShip sync columns exist before Sequelize tries to
    // add idx_fship_sync_status during model sync on existing orders table.
    console.log("Ensuring orders FShip sync columns before sync...");
    try {
      const [ordersTable] = await sequelize.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'orders'
      `);

      if (ordersTable.length) {
        const [fshipStatusColumn] = await sequelize.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'orders'
            AND COLUMN_NAME = 'fship_sync_status'
        `);

        if (!fshipStatusColumn.length) {
          await sequelize.query(`
            ALTER TABLE orders
            ADD COLUMN fship_sync_status ENUM('pending','syncing','synced','failed')
            DEFAULT 'pending'
          `);
        }

        const [fshipAttemptsColumn] = await sequelize.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'orders'
            AND COLUMN_NAME = 'fship_sync_attempts'
        `);

        if (!fshipAttemptsColumn.length) {
          await sequelize.query(`
            ALTER TABLE orders
            ADD COLUMN fship_sync_attempts INT DEFAULT 0
          `);
        }

        const [fshipIndex] = await sequelize.query(`
          SELECT INDEX_NAME
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'orders'
            AND INDEX_NAME = 'idx_fship_sync_status'
        `);

        if (!fshipIndex.length) {
          await sequelize.query(`
            ALTER TABLE orders
            ADD INDEX idx_fship_sync_status (fship_sync_status)
          `);
        }
      }

      console.log("✓ Orders FShip sync columns ensured pre-sync");
    } catch (fshipPreSyncError) {
      console.log(
        "⚠️ Pre-sync FShip orders column fix skipped:",
        fshipPreSyncError.message
      );
    }

    // Pre-sync fix: ensure coupon_usages.guest_user_id exists before Sequelize
    // attempts to create index coupon_usages_guest_user_id during model sync.
    console.log("Ensuring coupon_usages guest_user_id before sync...");
    try {
      const [couponUsagesTable] = await sequelize.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'coupon_usages'
      `);

      if (couponUsagesTable.length) {
        const [guestUserIdColumn] = await sequelize.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'coupon_usages'
            AND COLUMN_NAME = 'guest_user_id'
        `);

        if (!guestUserIdColumn.length) {
          await sequelize.query(`
            ALTER TABLE coupon_usages
            ADD COLUMN guest_user_id INT NULL
          `);
        }

        const [guestUserIdIndex] = await sequelize.query(`
          SELECT INDEX_NAME
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'coupon_usages'
            AND INDEX_NAME = 'coupon_usages_guest_user_id'
        `);

        if (!guestUserIdIndex.length) {
          await sequelize.query(`
            ALTER TABLE coupon_usages
            ADD INDEX coupon_usages_guest_user_id (guest_user_id)
          `);
        }
      } else {
        // Legacy DBs may have coupon_usage; ensure coupon_usages exists with guest_user_id.
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS coupon_usages (
            id INT AUTO_INCREMENT PRIMARY KEY,
            couponId INT NOT NULL,
            userId INT NULL,
            guest_user_id INT NULL,
            orderId INT NULL,
            discountAmount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
            usedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX coupon_usages_guest_user_id (guest_user_id)
          )
        `);
      }

      console.log("✓ coupon_usages.guest_user_id ensured pre-sync");

      // Fix: ensure userId is nullable (guest orders have no userId)
      try {
        await sequelize.query(`
          ALTER TABLE coupon_usages
          MODIFY COLUMN userId INT NULL
        `);
        console.log("✓ coupon_usages.userId set to NULL-able");
      } catch (e) {
        console.log("⚠️ coupon_usages.userId alter skipped:", e.message);
      }

    } catch (couponPreSyncError) {
      console.log(
        "⚠️ Pre-sync coupon_usages column fix skipped:",
        couponPreSyncError.message
      );
    }

    // Pre-sync fix: ensure wishlists.guestToken exists and userId is nullable
    // before Sequelize tries to add the (guestToken, productId) index during
    // model sync.
    console.log("Ensuring wishlists.guestToken before sync...");
    try {
      const [wishlistsTable] = await sequelize.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'wishlists'
      `);

      if (wishlistsTable.length) {
        const [guestTokenColumn] = await sequelize.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'wishlists'
            AND COLUMN_NAME = 'guestToken'
        `);

        if (!guestTokenColumn.length) {
          await sequelize.query(`
            ALTER TABLE wishlists
            ADD COLUMN guestToken VARCHAR(64) NULL
          `);
        }

        try {
          await sequelize.query(`
            ALTER TABLE wishlists
            MODIFY COLUMN userId INT NULL
          `);
        } catch (e) {
          console.log("⚠️ wishlists.userId alter skipped:", e.message);
        }

        const [guestTokenIndex] = await sequelize.query(`
          SELECT INDEX_NAME
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'wishlists'
            AND INDEX_NAME = 'wishlists_guest_product'
        `);

        if (!guestTokenIndex.length) {
          await sequelize.query(`
            ALTER TABLE wishlists
            ADD INDEX wishlists_guest_product (guestToken, productId)
          `);
        }
      }

      console.log("✓ wishlists.guestToken ensured pre-sync");
    } catch (wishlistPreSyncError) {
      console.log(
        "⚠️ Pre-sync wishlists column fix skipped:",
        wishlistPreSyncError.message
      );
    }

    // Pre-sync fix: ensure WhatsApp catalog columns exist before Sequelize
    // attempts to use them during model sync
    console.log("Ensuring WhatsApp catalog columns before sync...");
    try {
      // Check if products table exists and add whatsapp_synced column
      const [productsTable] = await sequelize.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'products'
      `);

      if (productsTable.length) {
        const [whatsappSyncedColumn] = await sequelize.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'products'
            AND COLUMN_NAME = 'whatsapp_synced'
        `);

        if (!whatsappSyncedColumn.length) {
          await sequelize.query(`
            ALTER TABLE products
            ADD COLUMN whatsapp_synced BOOLEAN DEFAULT false COMMENT 'Whether this product has been synced to WhatsApp catalog'
          `);
          console.log("✓ Added whatsapp_synced column to products table");
        }
      }

      // Check if product_variations table exists and add whatsapp_retailer_id column
      const [variationsTable] = await sequelize.query(`
        SELECT TABLE_NAME
        FROM INFORMATION_SCHEMA.TABLES
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'product_variations'
      `);

      if (variationsTable.length) {
        const [whatsappRetailerIdColumn] = await sequelize.query(`
          SELECT COLUMN_NAME
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'product_variations'
            AND COLUMN_NAME = 'whatsapp_retailer_id'
        `);

        if (!whatsappRetailerIdColumn.length) {
          await sequelize.query(`
            ALTER TABLE product_variations
            ADD COLUMN whatsapp_retailer_id VARCHAR(255) UNIQUE COMMENT 'WhatsApp product_retailer_id in format {productId}_{variationId}'
          `);
          console.log("✓ Added whatsapp_retailer_id column to product_variations table");
        }

        // Add index for whatsapp_retailer_id
        const [whatsappIndex] = await sequelize.query(`
          SELECT INDEX_NAME
          FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'product_variations'
            AND INDEX_NAME = 'idx_whatsapp_retailer_id'
        `);

        if (!whatsappIndex.length) {
          await sequelize.query(`
            ALTER TABLE product_variations
            ADD INDEX idx_whatsapp_retailer_id (whatsapp_retailer_id)
          `);
          console.log("✓ Added idx_whatsapp_retailer_id index to product_variations table");
        }
      }

      console.log("✓ WhatsApp catalog columns ensured pre-sync");
    } catch (whatsappPreSyncError) {
      console.log(
        "⚠️ Pre-sync WhatsApp catalog column fix skipped:",
        whatsappPreSyncError.message
      );
    }

    // Sync all tables at once (this creates all tables and relationships)
    // Use force: false and alter: false to prevent constraint issues
    console.log("Syncing all tables...");
    await sequelize.sync({ force: false, alter: false, hooks: false });
    console.log("✓ All tables synced");

    // Ensure order_shipments table exists and migrate existing FShip data
    console.log("Ensuring order_shipments table...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS order_shipments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          order_id INT NOT NULL,
          provider VARCHAR(50) NOT NULL DEFAULT 'fship',
          provider_order_id VARCHAR(255),
          waybill VARCHAR(255),
          tracking_number VARCHAR(100),
          tracking_url TEXT,
          route_code VARCHAR(255),
          courier_id INT,
          courier_name VARCHAR(255),
          label_url TEXT,
          label_downloaded TINYINT(1) DEFAULT 0,
          label_downloaded_at DATETIME,
          label_downloaded_by INT,
          sync_status ENUM('pending','syncing','synced','failed') DEFAULT 'pending',
          sync_attempts INT DEFAULT 0,
          sync_error TEXT,
          last_synced_at DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          UNIQUE KEY idx_shipment_order_id (order_id),
          INDEX idx_shipment_waybill (waybill),
          INDEX idx_shipment_provider (provider),
          INDEX idx_shipment_sync_status (sync_status),
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ order_shipments table ready");

      // Migrate existing FShip data from orders table
      const [countResult] = await sequelize.query(`
        SELECT COUNT(*) as cnt FROM orders o
        LEFT JOIN order_shipments os ON os.order_id = o.id
        WHERE os.id IS NULL
          AND (o.fship_order_id IS NOT NULL OR o.fship_waybill IS NOT NULL OR o.tracking_number IS NOT NULL)
      `);
      const pendingMigration = countResult[0].cnt;
      if (pendingMigration > 0) {
        console.log(`  Migrating ${pendingMigration} existing shipment records...`);
        await sequelize.query(`
          INSERT INTO order_shipments (
            order_id, provider, provider_order_id, waybill, tracking_number,
            tracking_url, route_code, courier_id, courier_name,
            label_url, label_downloaded, label_downloaded_at, label_downloaded_by,
            sync_status, sync_attempts, sync_error, last_synced_at,
            created_at, updated_at
          )
          SELECT
            o.id, 'fship', o.fship_order_id, o.fship_waybill,
            COALESCE(o.fship_tracking_number, o.tracking_number),
            o.tracking_url, o.fship_route_code, o.fship_courier_id, o.courier_name,
            o.fship_label_url, o.fship_label_downloaded, o.fship_label_downloaded_at,
            o.fship_label_downloaded_by,
            o.fship_sync_status, o.fship_sync_attempts, o.fship_sync_error,
            o.fship_last_synced_at,
            o.created_at, o.updated_at
          FROM orders o
          LEFT JOIN order_shipments os ON os.order_id = o.id
          WHERE os.id IS NULL
            AND (o.fship_order_id IS NOT NULL OR o.fship_waybill IS NOT NULL OR o.tracking_number IS NOT NULL)
        `);
        console.log(`  ✓ Migrated ${pendingMigration} shipment records`);
      } else {
        console.log("  ✓ No pending shipment data to migrate");
      }
    } catch (shipmentErr) {
      console.log("⚠️ order_shipments setup:", shipmentErr.message);
    }

    // Ensure users.deletedAt column exists (paranoid soft-delete support)
    console.log("Ensuring users.deletedAt column...");
    try {
      const [deletedAtCol] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deletedAt'
      `);
      if (!deletedAtCol.length) {
        await sequelize.query(`ALTER TABLE users ADD COLUMN deletedAt DATETIME NULL DEFAULT NULL`);
        console.log("✓ users.deletedAt column added");
      } else {
        console.log("✓ users.deletedAt already exists");
      }
    } catch (e) {
      console.log("⚠️ users.deletedAt fix skipped:", e.message);
    }

    // Ensure whatsapp tables use utf8mb4 for emoji support
    console.log("Ensuring whatsapp tables use utf8mb4...");
    try {
      await sequelize.query(`ALTER TABLE whatsapp_messages CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      await sequelize.query(`ALTER TABLE whatsapp_conversations CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
      console.log("✓ whatsapp tables charset updated");
    } catch (e) {
      console.log("⚠️ whatsapp charset fix skipped:", e.message);
    }

    // Ensure whatsapp_messages.quoted_message_id column exists
    console.log("Ensuring whatsapp_messages.quoted_message_id column...");
    try {
      const [quotedCol] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_messages' AND COLUMN_NAME = 'quoted_message_id'
      `);
      if (!quotedCol.length) {
        await sequelize.query(`ALTER TABLE whatsapp_messages ADD COLUMN quoted_message_id INT NULL DEFAULT NULL`);
        console.log("✓ whatsapp_messages.quoted_message_id column added");
      } else {
        console.log("✓ whatsapp_messages.quoted_message_id already exists");
      }
    } catch (e) {
      console.log("⚠️ whatsapp_messages.quoted_message_id fix skipped:", e.message);
    }

    // Ensure loyalty_transactions table exists for loyalty program.
    console.log("Ensuring loyalty_transactions table...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS loyalty_transactions (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          order_id INT NULL,
          type ENUM('earned','redeemed','expired','adjusted','refunded') NOT NULL,
          points INT NOT NULL,
          balance_after INT NOT NULL,
          description TEXT NULL,
          expires_at DATETIME NULL,
          brand_id INT NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_loyalty_user_id (user_id),
          INDEX idx_loyalty_order_id (order_id),
          INDEX idx_loyalty_brand_id (brand_id),
          INDEX idx_loyalty_type (type),
          INDEX idx_loyalty_expires_at (expires_at),
          CONSTRAINT fk_loyalty_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_loyalty_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
          CONSTRAINT fk_loyalty_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      console.log("✓ loyalty_transactions table ensured");
    } catch (loyaltyTableError) {
      console.log(
        "⚠️ loyalty_transactions table creation skipped:",
        loyaltyTableError.message
      );
    }

    // Ensure users.loyalty_points column exists.
    console.log("Ensuring users.loyalty_points column...");
    try {
      const [loyaltyPointsColumn] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'loyalty_points'
      `);

      if (!loyaltyPointsColumn.length) {
        await sequelize.query(`
          ALTER TABLE users
          ADD COLUMN loyalty_points INT NOT NULL DEFAULT 0
        `);
      }
      console.log("✓ users.loyalty_points ensured");
    } catch (loyaltyPointsError) {
      console.log(
        "⚠️ users.loyalty_points update skipped:",
        loyaltyPointsError.message
      );
    }

    // Ensure users.refreshTokenExpiry exists (legacy DB safety)
    console.log("Ensuring users.refreshTokenExpiry column...");
    try {
      const [refreshExpiryColumn] = await sequelize.query(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'users'
          AND COLUMN_NAME = 'refreshTokenExpiry'
      `);

      if (!refreshExpiryColumn.length) {
        await sequelize.query(`
          ALTER TABLE users
          ADD COLUMN refreshTokenExpiry DATETIME NULL
        `);
      }
      console.log("✓ users.refreshTokenExpiry ensured");
    } catch (refreshExpiryError) {
      console.log(
        "⚠️ users.refreshTokenExpiry update skipped:",
        refreshExpiryError.message
      );
    }

    // Ensure users.role ENUM includes all management roles
    console.log("Ensuring users.role ENUM values...");
    try {
      await sequelize.query(`
        ALTER TABLE users
        MODIFY COLUMN role ENUM('admin','product_manager','order_manager','whatsapp_manager','consumer')
        NOT NULL DEFAULT 'consumer'
      `);
      console.log("✓ users.role ENUM updated with all management roles");
    } catch (roleEnumError) {
      console.log(
        "⚠️ users.role ENUM update skipped:",
        roleEnumError.message
      );
    }

    // Ensure lookbook tables exist.
    console.log("Ensuring lookbook tables...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS lookbooks (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          slug VARCHAR(255) NOT NULL UNIQUE,
          description TEXT NULL,
          status ENUM('active','draft') NOT NULL DEFAULT 'draft',
          brand_id INT NOT NULL,
          display_order INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_lookbooks_brand_id (brand_id),
          INDEX idx_lookbooks_status (status),
          INDEX idx_lookbooks_display_order (display_order),
          CONSTRAINT fk_lookbooks_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS lookbook_images (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lookbook_id INT NOT NULL,
          image_url VARCHAR(500) NOT NULL,
          display_order INT NOT NULL DEFAULT 0,
          alt_text VARCHAR(255) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_lookbook_images_lookbook_id (lookbook_id),
          INDEX idx_lookbook_images_display_order (display_order),
          CONSTRAINT fk_lookbook_images_lookbook FOREIGN KEY (lookbook_id) REFERENCES lookbooks(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS lookbook_hotspots (
          id INT AUTO_INCREMENT PRIMARY KEY,
          lookbook_image_id INT NOT NULL,
          product_id INT NOT NULL,
          position_x DECIMAL(5,2) NOT NULL,
          position_y DECIMAL(5,2) NOT NULL,
          label VARCHAR(100) NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_lookbook_hotspots_image_id (lookbook_image_id),
          INDEX idx_lookbook_hotspots_product_id (product_id),
          CONSTRAINT fk_lookbook_hotspots_image FOREIGN KEY (lookbook_image_id) REFERENCES lookbook_images(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_lookbook_hotspots_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      console.log("✓ Lookbook tables ensured");
    } catch (lookbookError) {
      console.log("⚠️ Lookbook table creation skipped:", lookbookError.message);
    }

    // Ensure reel tables exist.
    console.log("Ensuring reel tables...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS reels (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          video_url VARCHAR(500) NOT NULL,
          thumbnail_url VARCHAR(500) NULL,
          status ENUM('active','draft') NOT NULL DEFAULT 'draft',
          brand_id INT NOT NULL,
          display_order INT NOT NULL DEFAULT 0,
          view_count INT NOT NULL DEFAULT 0,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_reels_brand_id (brand_id),
          INDEX idx_reels_status (status),
          INDEX idx_reels_display_order (display_order),
          CONSTRAINT fk_reels_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS reel_products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          reel_id INT NOT NULL,
          product_id INT NOT NULL,
          display_order INT NOT NULL DEFAULT 0,
          INDEX idx_reel_products_reel_id (reel_id),
          INDEX idx_reel_products_product_id (product_id),
          CONSTRAINT fk_reel_products_reel FOREIGN KEY (reel_id) REFERENCES reels(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_reel_products_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      console.log("✓ Reel tables ensured");
    } catch (reelError) {
      console.log("⚠️ Reel table creation skipped:", reelError.message);
    }

    // Ensure instagram_post_products table exists.
    console.log("Ensuring instagram_post_products table...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS instagram_post_products (
          id INT AUTO_INCREMENT PRIMARY KEY,
          instagram_post_id VARCHAR(100) NOT NULL,
          product_id INT NOT NULL,
          brand_id INT NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_ipp_post_id (instagram_post_id),
          INDEX idx_ipp_product_id (product_id),
          INDEX idx_ipp_brand_id (brand_id),
          CONSTRAINT fk_ipp_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
          CONSTRAINT fk_ipp_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `);
      console.log("✓ instagram_post_products table ensured");
    } catch (instagramTableError) {
      console.log(
        "⚠️ instagram_post_products table creation skipped:",
        instagramTableError.message
      );
    }

    // Ensure WhatsApp chat tables exist.
    console.log("Ensuring WhatsApp conversation tables...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_conversations (
          id INT AUTO_INCREMENT PRIMARY KEY,
          brand_id INT NOT NULL DEFAULT 1,
          customer_phone VARCHAR(20) NOT NULL,
          customer_name VARCHAR(100) NULL,
          wa_contact_id VARCHAR(50) NULL,
          last_message TEXT NULL,
          last_message_at DATETIME NULL,
          unread_count INT NOT NULL DEFAULT 0,
          status ENUM('open','resolved') NOT NULL DEFAULT 'open',
          assigned_to INT NULL COMMENT 'User ID of assigned agent',
          tags VARCHAR(255) NULL COMMENT 'Comma-separated tags: vip,cod_risk,first_time',
          opted_out TINYINT(1) NOT NULL DEFAULT 0 COMMENT 'Marketing opt-out flag',
          first_response_at DATETIME NULL COMMENT 'SLA: first outbound response timestamp',
          user_id INT NULL COMMENT 'Linked registered user ID',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wa_conv_brand (brand_id),
          INDEX idx_wa_conv_phone (customer_phone),
          INDEX idx_wa_conv_status (status),
          INDEX idx_wa_conv_last_msg (last_message_at),
          INDEX idx_wa_conv_assigned (assigned_to),
          INDEX idx_wa_conv_opted_out (opted_out)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);

      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_messages (
          id INT AUTO_INCREMENT PRIMARY KEY,
          conversation_id INT NOT NULL,
          wa_message_id VARCHAR(100) NULL,
          direction ENUM('inbound','outbound') NOT NULL,
          type ENUM('text','template','image','document','audio') NOT NULL DEFAULT 'text',
          body TEXT NULL,
          status ENUM('sent','delivered','read','failed','received') NOT NULL DEFAULT 'sent',
          sent_at DATETIME NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wa_msg_conv (conversation_id),
          INDEX idx_wa_msg_wa_id (wa_message_id),
          INDEX idx_wa_msg_direction (direction),
          CONSTRAINT fk_wa_msg_conv FOREIGN KEY (conversation_id) REFERENCES whatsapp_conversations(id) ON DELETE CASCADE ON UPDATE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ WhatsApp conversation tables ensured");
    } catch (waTableError) {
      console.log("⚠️ WhatsApp tables creation skipped:", waTableError.message);
    }

    // Migrate existing whatsapp_conversations — add new columns if missing
    console.log("Migrating whatsapp_conversations new columns...");
    try {
      const waNewCols = [
        { col: 'assigned_to',       sql: 'ADD COLUMN assigned_to INT NULL COMMENT "User ID of assigned agent"' },
        { col: 'tags',              sql: 'ADD COLUMN tags VARCHAR(255) NULL COMMENT "Comma-separated tags"' },
        { col: 'opted_out',         sql: 'ADD COLUMN opted_out TINYINT(1) NOT NULL DEFAULT 0 COMMENT "Marketing opt-out"' },
        { col: 'first_response_at', sql: 'ADD COLUMN first_response_at DATETIME NULL COMMENT "SLA first response"' },
        { col: 'user_id',           sql: 'ADD COLUMN user_id INT NULL COMMENT "Linked registered user"' },
      ];
      for (const { col, sql } of waNewCols) {
        const [exists] = await sequelize.query(`
          SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'whatsapp_conversations' AND COLUMN_NAME = '${col}'
        `);
        if (exists[0].count === 0) {
          await sequelize.query(`ALTER TABLE whatsapp_conversations ${sql}`);
          console.log(`  ✓ Added whatsapp_conversations.${col}`);
        }
      }
      console.log("✓ whatsapp_conversations migration done");
    } catch (waMigrateError) {
      console.log("⚠️ whatsapp_conversations migration skipped:", waMigrateError.message);
    }

    // Create whatsapp_canned_responses table
    console.log("Ensuring whatsapp_canned_responses table...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_canned_responses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          brand_id INT NOT NULL DEFAULT 1,
          shortcut VARCHAR(50) NOT NULL COMMENT 'e.g. /track',
          title VARCHAR(100) NOT NULL,
          body TEXT NOT NULL,
          created_by INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wa_canned_brand (brand_id),
          INDEX idx_wa_canned_shortcut (shortcut)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ whatsapp_canned_responses table ensured");
    } catch (cannedErr) {
      console.log("⚠️ whatsapp_canned_responses skipped:", cannedErr.message);
    }

    // Create whatsapp_broadcasts table
    console.log("Ensuring whatsapp_broadcasts table...");
    try {
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS whatsapp_broadcasts (
          id INT AUTO_INCREMENT PRIMARY KEY,
          brand_id INT NOT NULL DEFAULT 1,
          name VARCHAR(150) NOT NULL,
          template_name VARCHAR(100) NOT NULL,
          audience_filter TEXT NULL COMMENT 'JSON filter criteria',
          status ENUM('draft','running','done','failed') NOT NULL DEFAULT 'draft',
          total_recipients INT NOT NULL DEFAULT 0,
          sent_count INT NOT NULL DEFAULT 0,
          failed_count INT NOT NULL DEFAULT 0,
          scheduled_at DATETIME NULL,
          started_at DATETIME NULL,
          completed_at DATETIME NULL,
          created_by INT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_wa_broadcast_brand (brand_id),
          INDEX idx_wa_broadcast_status (status)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ whatsapp_broadcasts table ensured");
    } catch (broadcastErr) {
      console.log("⚠️ whatsapp_broadcasts skipped:", broadcastErr.message);
    }

    // Ensure encrypted PII columns have the expected width.
    // NOTE: `alter: false` means Sequelize won't update existing column sizes.
    console.log("Ensuring phone column sizes...");
    try {
      await sequelize.query(
        "ALTER TABLE shipping_addresses MODIFY COLUMN phone VARCHAR(500)"
      );
      await sequelize.query(
        "ALTER TABLE guest_users MODIFY COLUMN phone VARCHAR(500)"
      );
      console.log("✓ Phone column sizes ensured");
    } catch (phoneError) {
      console.log(
        "⚠️ Phone column size update skipped:",
        phoneError.message
      );
    }

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

    // Payment-first checkout: make order_id nullable + add reservation_id
    console.log("Ensuring payments table supports payment-first checkout...");
    try {
      // Make order_id nullable (order created AFTER payment in new flow)
      await sequelize.query(`
        ALTER TABLE payments
        MODIFY COLUMN order_id INT NULL
      `);
      console.log("  ✓ payments.order_id set to nullable");
    } catch (e) {
      console.log("  ⚠️ payments.order_id nullable skipped:", e.message);
    }

    try {
      const [resCol] = await sequelize.query(`
        SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'reservation_id'
      `);
      if (!resCol.length) {
        await sequelize.query(`
          ALTER TABLE payments
          ADD COLUMN reservation_id VARCHAR(100) NULL COMMENT 'Stock reservation ID for payment-first checkout'
        `);
        await sequelize.query(`
          ALTER TABLE payments
          ADD INDEX idx_payments_reservation_id (reservation_id)
        `);
        console.log("  ✓ payments.reservation_id column + index added");
      } else {
        console.log("  ✓ payments.reservation_id already exists");
      }
    } catch (e) {
      console.log("  ⚠️ payments.reservation_id skipped:", e.message);
    }

    try {
      const [rzpIdx] = await sequelize.query(`
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND INDEX_NAME = 'idx_payments_razorpay_order_id'
      `);
      if (!rzpIdx.length) {
        await sequelize.query(`
          ALTER TABLE payments
          ADD INDEX idx_payments_razorpay_order_id (razorpay_order_id)
        `);
        console.log("  ✓ payments razorpay_order_id index added");
      }
    } catch (e) {
      console.log("  ⚠️ payments razorpay_order_id index skipped:", e.message);
    }

    try {
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
      
      // Migration 004: webhooks_log table for Razorpay webhook deduplication
      console.log("Running migration 004: Create webhooks_log table...");
      await sequelize.query(`
        CREATE TABLE IF NOT EXISTS webhooks_log (
          id INT AUTO_INCREMENT PRIMARY KEY,
          event_id VARCHAR(100) NOT NULL UNIQUE,
          event_type VARCHAR(100) NOT NULL,
          processed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_webhooks_event_id (event_id),
          INDEX idx_webhooks_processed_at (processed_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
      `);
      console.log("✓ Migration 004 completed");

      // Migration 005: rto_risk_score column on orders
      console.log("Running migration 005: Add rto_risk_score to orders...");
      const [rtoCol] = await sequelize.query(`
        SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'rto_risk_score'
      `);
      if (rtoCol[0].count === 0) {
        await sequelize.query(`ALTER TABLE orders ADD COLUMN rto_risk_score INT NOT NULL DEFAULT 0 COMMENT 'RTO risk score'`);
        console.log("  ✓ Added orders.rto_risk_score");
      } else {
        console.log("  ✓ orders.rto_risk_score already exists");
      }
      console.log("✓ Migration 005 completed");

      // Migration 006: Add awaiting_confirmation to orders status ENUM
      console.log("Running migration 006: Add awaiting_confirmation to orders status...");
      try {
        await sequelize.query(`
          ALTER TABLE orders MODIFY COLUMN status ENUM(
            'pending','awaiting_confirmation','confirmed','processing',
            'booked','pickup initiated','manifested','in transit',
            'shipped','out for delivery','delivered','undelivered',
            'rto','rto delivered','return_initiated','returned_rto',
            'cancelled','order cancelled','exception'
          ) NOT NULL DEFAULT 'awaiting_confirmation'
        `);
        console.log("✓ Migration 006 completed");
      } catch (e) {
        console.log("⚠️ Migration 006 skipped:", e.message);
      }

      // Migration 007: Create order_audit_logs table
      console.log("Running migration 007: Create order_audit_logs table...");
      try {
        await sequelize.query(`
          CREATE TABLE IF NOT EXISTS order_audit_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            order_id INT NOT NULL,
            action VARCHAR(50) NOT NULL COMMENT 'confirm, cancel, status_change, fship_sync, payment_update',
            performed_by INT NULL COMMENT 'User ID who performed the action',
            role VARCHAR(50) NULL COMMENT 'admin, user, system, webhook',
            metadata JSON NULL COMMENT 'Additional context (reason, old_status, new_status, etc.)',
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_audit_order_id (order_id),
            INDEX idx_audit_action (action),
            INDEX idx_audit_performed_by (performed_by),
            INDEX idx_audit_created_at (created_at),
            CONSTRAINT fk_audit_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
          ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
        `);
        console.log("✓ Migration 007 completed");
      } catch (e) {
        console.log("⚠️ Migration 007 skipped:", e.message);
      }

      // Migration 008: Add idempotency_key to orders
      console.log("Running migration 008: Add idempotency_key to orders...");
      try {
        const [idemCol] = await sequelize.query(`
          SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'idempotency_key'
        `);
        if (idemCol[0].count === 0) {
          await sequelize.query(`
            ALTER TABLE orders ADD COLUMN idempotency_key VARCHAR(100) NULL,
            ADD UNIQUE INDEX idx_orders_idempotency (idempotency_key)
          `);
          console.log("✓ Migration 008 completed");
        } else {
          console.log("✓ Migration 008 already applied");
        }
      } catch (e) {
        console.log("⚠️ Migration 008 skipped:", e.message);
      }

      // Migration 009: FULLTEXT index on products for search
      console.log("Running migration 009: Add FULLTEXT index on products...");
      try {
        const [ftIdx] = await sequelize.query(`
          SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products' AND INDEX_NAME = 'ft_products_search'
        `);
        if (ftIdx[0].count === 0) {
          await sequelize.query(`
            ALTER TABLE products ADD FULLTEXT INDEX ft_products_search (name, description)
          `);
          console.log("✓ Migration 009 completed");
        } else {
          console.log("✓ Migration 009 already applied");
        }
      } catch (e) {
        console.log("⚠️ Migration 009 skipped:", e.message);
      }

      // Migration 010: Add deleted_at column to users for soft delete
      console.log("Running migration 010: Add deleted_at to users...");
      try {
        const [delCol] = await sequelize.query(`
          SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'deleted_at'
        `);
        if (delCol[0].count === 0) {
          await sequelize.query(`ALTER TABLE users ADD COLUMN deleted_at DATETIME NULL DEFAULT NULL`);
          console.log("✓ Migration 010 completed");
        } else {
          console.log("✓ Migration 010 already applied");
        }
      } catch (e) {
        console.log("⚠️ Migration 010 skipped:", e.message);
      }

      // Migration 011: Performance indexes on orders table
      console.log("Running migration 011: Performance indexes on orders...");
      try {
        const indexChecks = [
          { name: 'idx_orders_brand_id',     sql: 'ALTER TABLE orders ADD INDEX idx_orders_brand_id (brand_id)' },
          { name: 'idx_orders_fship_waybill', sql: 'ALTER TABLE orders ADD INDEX idx_orders_fship_waybill (fship_waybill)' },
          { name: 'idx_orders_created_at',    sql: 'ALTER TABLE orders ADD INDEX idx_orders_created_at (created_at)' },
        ];
        for (const { name, sql } of indexChecks) {
          const [rows] = await sequelize.query(`
            SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS
            WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND INDEX_NAME = '${name}'
          `);
          if (rows[0].count === 0) {
            await sequelize.query(sql);
            console.log(`  ✓ Added ${name}`);
          } else {
            console.log(`  ✓ ${name} already exists`);
          }
        }
        console.log("✓ Migration 011 completed");
      } catch (e) {
        console.log("⚠️ Migration 011 skipped:", e.message);
      }

      console.log("✓ All migrations completed successfully");
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

    // Now it's safe to create the admin user.
    // Use raw SQL to avoid model-column mismatch issues on legacy schemas.
    if (models["User"]) {
      const bcrypt = require("bcrypt");
      const adminEmail = "admin@admin.com";
      const adminPassword = "Admin@123";
      const adminUsername = "admin";
      const adminRole = "admin";

      const [existingAdminRows] = await sequelize.query(
        `SELECT id FROM users WHERE email = ? LIMIT 1`,
        { replacements: [adminEmail] }
      );

      if (!existingAdminRows.length) {
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await sequelize.query(
          `INSERT INTO users (username, email, password, role, createdAt, updatedAt)
           VALUES (?, ?, ?, ?, NOW(), NOW())`,
          { replacements: [adminUsername, adminEmail, hashedPassword, adminRole] }
        );
        console.log("✓ Admin user created: admin@admin.com / Admin@123");
      } else {
        console.log("✓ Admin user already exists");
      }
    }

    console.log("✓ Database setup completed successfully!");
    
    // Create RTO stock restoration table
    console.log("\nCreating RTO stock restoration table...");
    await createRTOStockRestorationTable();
    
    // Add brand_id column to payments if it doesn't exist
    console.log("\nEnsuring brand_id column exists in payments table...");
    try {
      const [columns] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'payments' 
        AND COLUMN_NAME = 'brand_id'
      `);
      
      if (columns[0].count === 0) {
        await sequelize.query(`
          ALTER TABLE payments 
          ADD COLUMN brand_id INT NOT NULL DEFAULT 1
        `);
        console.log("✓ Added brand_id column to payments table");
      } else {
        console.log("✓ brand_id column already exists");
      }
    } catch (error) {
      console.log("⚠️ Error checking/adding brand_id column:", error.message);
    }
    
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
    
    // Add fship_sync_error column to orders table
    console.log("\nAdding fship_sync_error column to orders table...");
    await addFshipSyncErrorColumn();
    
    // Create performance optimization indexes
    await createPerformanceIndexes();

    // Create blog tables
    console.log("\nCreating blog tables...");
    await createBlogTables();

    // Add COD address confirmation columns
    console.log("\nAdding COD address confirmation columns to orders table...");
    await addCodAddressConfirmedColumns();
    
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

// Add fship_sync_error column to orders table
const addFshipSyncErrorColumn = async () => {
  try {
    console.log('Checking if fship_sync_error column exists in orders table...');

    const [columnExists] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'fship_sync_error'
    `);

    if (columnExists[0].count === 0) {
      console.log('Adding fship_sync_error column to orders table...');
      
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN fship_sync_error TEXT NULL 
        COMMENT 'Validation or sync error details shown on order page' 
        AFTER fship_sync_attempts
      `);
      
      console.log('✓ fship_sync_error column added successfully');
    } else {
      console.log('✓ fship_sync_error column already exists');
    }
  } catch (error) {
    console.log('⚠️ Error adding fship_sync_error column:', error.message);
  }
};

// Function to create performance optimization indexes
const createPerformanceIndexes = async () => {
  try {
    console.log('\n📊 Creating performance optimization indexes...');

    const indexes = [
      {
        name: 'idx_orders_user_date',
        table: 'orders',
        columns: '(user_id, createdAt DESC)',
        comment: 'Optimize user order history queries'
      },
      {
        name: 'idx_order_items_product',
        table: 'order_items',
        columns: '(order_id, product_id)',
        comment: 'Optimize order item lookups'
      },
      {
        name: 'idx_badges_user',
        table: 'badges',
        columns: '(user_id, badge_type, createdAt DESC)',
        comment: 'Optimize badge queries by user'
      },
      {
        name: 'idx_transactions_order',
        table: 'transactions',
        columns: '(order_id, status, createdAt DESC)',
        comment: 'Optimize transaction lookups'
      },
      {
        name: 'idx_products_category',
        table: 'products',
        columns: '(category_id, is_active, createdAt DESC)',
        comment: 'Optimize category product listing'
      },
      {
        name: 'idx_variations_product',
        table: 'product_variations',
        columns: '(product_id, is_active)',
        comment: 'Optimize variation lookups'
      },
      {
        name: 'idx_coupons_code_status',
        table: 'coupons',
        columns: '(code, is_active, expiry_date)',
        comment: 'Optimize coupon validation'
      },
      {
        name: 'idx_stock_product_warehouse',
        table: 'stock',
        columns: '(product_id, warehouse_id, quantity)',
        comment: 'Optimize stock checks'
      },
      {
        name: 'idx_payments_brand_id',
        table: 'payments',
        columns: '(brand_id)',
        comment: 'Optimize payment queries by brand'
      }
    ];

    let created = 0;
    let skipped = 0;

    for (const index of indexes) {
      try {
        // Check if index already exists
        const [indexExists] = await sequelize.query(`
          SELECT COUNT(*) as count
          FROM INFORMATION_SCHEMA.STATISTICS 
          WHERE TABLE_SCHEMA = DATABASE() 
          AND TABLE_NAME = '${index.table}' 
          AND INDEX_NAME = '${index.name}'
        `);

        if (indexExists[0].count === 0) {
          await sequelize.query(`
            ALTER TABLE ${index.table} 
            ADD INDEX ${index.name} ${index.columns}
          `);
          console.log(`  ✓ Created ${index.name} on ${index.table}`);
          created++;
        } else {
          console.log(`  ⊘ ${index.name} already exists`);
          skipped++;
        }
      } catch (error) {
        console.log(`  ⚠️ Error creating ${index.name}: ${error.message}`);
      }
    }

    console.log(`✓ Performance indexes: ${created} created, ${skipped} already exist`);
  } catch (error) {
    console.error('❌ Error creating performance indexes:', error.message);
  }
};

// Function to create blog tables
const createBlogTables = async () => {
  try {
    console.log('Creating blog_categories table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_categories (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        description TEXT NULL,
        status ENUM('active','inactive') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_blog_categories_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('Creating blog_posts table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_posts (
        id INT NOT NULL AUTO_INCREMENT,
        title VARCHAR(500) NOT NULL,
        slug VARCHAR(500) NOT NULL,
        author_name VARCHAR(255) NULL,
        hero_image VARCHAR(1000) NULL,
        sections JSON NULL,
        status ENUM('draft','published','archived') NOT NULL DEFAULT 'draft',
        published_at DATETIME NULL,
        blog_category_id INT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_blog_posts_slug (slug),
        KEY idx_blog_posts_status (status),
        KEY idx_blog_posts_category (blog_category_id),
        KEY idx_blog_posts_published_at (published_at),
        CONSTRAINT fk_blog_posts_category
          FOREIGN KEY (blog_category_id) REFERENCES blog_categories (id)
          ON DELETE SET NULL ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('Creating blog_tags table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_tags (
        id INT NOT NULL AUTO_INCREMENT,
        name VARCHAR(255) NOT NULL,
        slug VARCHAR(255) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_blog_tags_name (name),
        UNIQUE KEY uq_blog_tags_slug (slug)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('Creating blog_post_tags table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_post_tags (
        blog_post_id INT NOT NULL,
        blog_tag_id INT NOT NULL,
        PRIMARY KEY (blog_post_id, blog_tag_id),
        CONSTRAINT fk_bpt_post FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_bpt_tag  FOREIGN KEY (blog_tag_id)  REFERENCES blog_tags  (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('Creating blog_brands table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_brands (
        blog_post_id INT NOT NULL,
        brand_id     INT NOT NULL,
        PRIMARY KEY (blog_post_id, brand_id),
        CONSTRAINT fk_bb_post  FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_bb_brand FOREIGN KEY (brand_id)     REFERENCES brands     (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('Creating blog_featured_products table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_featured_products (
        blog_post_id  INT NOT NULL,
        product_id    INT NOT NULL,
        lifestyle_tag VARCHAR(255) NULL,
        PRIMARY KEY (blog_post_id, product_id),
        CONSTRAINT fk_bfp_post    FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT fk_bfp_product FOREIGN KEY (product_id)   REFERENCES products   (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('Creating blog_seo table...');
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS blog_seo (
        id              INT NOT NULL AUTO_INCREMENT,
        blog_post_id    INT NOT NULL,
        meta_title      VARCHAR(255) NULL,
        meta_description TEXT NULL,
        meta_keywords   VARCHAR(500) NULL,
        og_title        VARCHAR(255) NULL,
        og_description  TEXT NULL,
        og_image        VARCHAR(1000) NULL,
        canonical_url   VARCHAR(1000) NULL,
        structured_data JSON NULL,
        created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_blog_seo_post (blog_post_id),
        CONSTRAINT fk_bs_post FOREIGN KEY (blog_post_id) REFERENCES blog_posts (id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
    `);

    console.log('✓ Blog tables created successfully');
  } catch (error) {
    console.log('⚠️ Blog tables creation skipped (tables may already exist):', error.message);
  }
};

// Add COD address confirmation columns to orders table
const addCodAddressConfirmedColumns = async () => {
  try {
    console.log('Checking if cod_address_confirmed columns exist in orders table...');

    const [col1] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'cod_address_confirmed'
    `);

    if (col1[0].count === 0) {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN cod_address_confirmed TINYINT(1) NULL DEFAULT NULL 
        COMMENT 'COD address confirmation via WhatsApp: null=not sent, 0=sent/pending, 1=confirmed by customer'
        AFTER idempotency_key
      `);
      console.log('✓ cod_address_confirmed column added');
    } else {
      console.log('✓ cod_address_confirmed column already exists');
    }

    const [col2] = await sequelize.query(`
      SELECT COUNT(*) as count
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'orders' 
      AND COLUMN_NAME = 'cod_address_confirmed_at'
    `);

    if (col2[0].count === 0) {
      await sequelize.query(`
        ALTER TABLE orders 
        ADD COLUMN cod_address_confirmed_at DATETIME NULL 
        COMMENT 'Timestamp when customer confirmed address via WhatsApp'
        AFTER cod_address_confirmed
      `);
      console.log('✓ cod_address_confirmed_at column added');
    } else {
      console.log('✓ cod_address_confirmed_at column already exists');
    }
  } catch (error) {
    console.log('⚠️ Error adding COD address confirmed columns:', error.message);
  }

  // Ensure reviews.brandId column exists (tracks which brand the review was submitted from)
  console.log("Ensuring reviews.brandId column...");
  try {
    const [brandIdCol] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND COLUMN_NAME = 'brandId'
    `);
    if (!brandIdCol.length) {
      await sequelize.query(`ALTER TABLE reviews ADD COLUMN brandId INT NULL`);
      await sequelize.query(`ALTER TABLE reviews ADD CONSTRAINT fk_reviews_brand FOREIGN KEY (brandId) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE`);
      console.log("✓ reviews.brandId column added");
    } else {
      console.log("✓ reviews.brandId already exists");
    }
    // Backfill: set all reviews with NULL brandId to the first brand (Crosscoin)
    const [nullCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM reviews WHERE brandId IS NULL`);
    if (nullCount[0].cnt > 0) {
      const [firstBrand] = await sequelize.query(`SELECT id FROM brands WHERE slug = 'crosscoin' OR name LIKE '%crosscoin%' ORDER BY id ASC LIMIT 1`);
      if (firstBrand.length) {
        await sequelize.query(`UPDATE reviews SET brandId = ${firstBrand[0].id} WHERE brandId IS NULL`);
        console.log(`✓ Backfilled ${nullCount[0].cnt} reviews with Crosscoin brand (ID: ${firstBrand[0].id})`);
      } else {
        // Fallback: use the first brand in the table
        const [anyBrand] = await sequelize.query(`SELECT id FROM brands ORDER BY id ASC LIMIT 1`);
        if (anyBrand.length) {
          await sequelize.query(`UPDATE reviews SET brandId = ${anyBrand[0].id} WHERE brandId IS NULL`);
          console.log(`✓ Backfilled ${nullCount[0].cnt} reviews with brand ID: ${anyBrand[0].id}`);
        }
      }
    }
  } catch (e) {
    console.log("⚠️ reviews.brandId fix skipped:", e.message);
  }

  // Ensure users.source_brand_id column exists (tracks which brand the user registered from)
  console.log("Ensuring users.source_brand_id column...");
  try {
    const [srcBrandCol] = await sequelize.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'source_brand_id'
    `);
    if (!srcBrandCol.length) {
      await sequelize.query(`ALTER TABLE users ADD COLUMN source_brand_id INT NULL`);
      await sequelize.query(`ALTER TABLE users ADD CONSTRAINT fk_users_source_brand FOREIGN KEY (source_brand_id) REFERENCES brands(id) ON DELETE SET NULL ON UPDATE CASCADE`);
      console.log("✓ users.source_brand_id column added");
    } else {
      console.log("✓ users.source_brand_id already exists");
    }
    // Backfill: set all users with NULL source_brand_id to Crosscoin
    const [nullUserCount] = await sequelize.query(`SELECT COUNT(*) as cnt FROM users WHERE source_brand_id IS NULL`);
    if (nullUserCount[0].cnt > 0) {
      const [ccBrand] = await sequelize.query(`SELECT id FROM brands WHERE slug = 'crosscoin' OR name LIKE '%crosscoin%' ORDER BY id ASC LIMIT 1`);
      if (ccBrand.length) {
        await sequelize.query(`UPDATE users SET source_brand_id = ${ccBrand[0].id} WHERE source_brand_id IS NULL`);
        console.log(`✓ Backfilled ${nullUserCount[0].cnt} users with Crosscoin brand (ID: ${ccBrand[0].id})`);
      } else {
        const [anyBrand] = await sequelize.query(`SELECT id FROM brands ORDER BY id ASC LIMIT 1`);
        if (anyBrand.length) {
          await sequelize.query(`UPDATE users SET source_brand_id = ${anyBrand[0].id} WHERE source_brand_id IS NULL`);
          console.log(`✓ Backfilled ${nullUserCount[0].cnt} users with brand ID: ${anyBrand[0].id}`);
        }
      }
    }
  } catch (e) {
    console.log("⚠️ users.source_brand_id fix skipped:", e.message);
  }
};

module.exports = { setupDatabase, findAvailablePort, createPerformanceIndexes };

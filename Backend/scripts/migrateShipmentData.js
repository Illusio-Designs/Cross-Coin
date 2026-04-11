/**
 * Migration Script: Copy FShip data from orders table to order_shipments table
 * 
 * Run: node scripts/migrateShipmentData.js
 * 
 * This is safe to run multiple times — it skips orders that already have a shipment record.
 */
require('dotenv').config();
const { sequelize } = require('../config/db.js');

async function migrate() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    // Ensure the order_shipments table exists
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS order_shipments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL UNIQUE,
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
        INDEX idx_shipment_waybill (waybill),
        INDEX idx_shipment_provider (provider),
        INDEX idx_shipment_sync_status (sync_status),
        FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
    `);
    console.log('✅ order_shipments table ready');

    // Count orders with FShip data that don't have a shipment record yet
    const [countResult] = await sequelize.query(`
      SELECT COUNT(*) as cnt FROM orders o
      LEFT JOIN order_shipments os ON os.order_id = o.id
      WHERE os.id IS NULL
        AND (o.fship_order_id IS NOT NULL OR o.fship_waybill IS NOT NULL OR o.tracking_number IS NOT NULL)
    `);
    const total = countResult[0].cnt;
    console.log(`📦 Found ${total} orders to migrate`);

    if (total === 0) {
      console.log('✅ Nothing to migrate — all done!');
      process.exit(0);
    }

    // Migrate in batches of 500
    const BATCH = 500;
    let migrated = 0;

    while (migrated < total) {
      const [affected] = await sequelize.query(`
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
        LIMIT ${BATCH}
      `);

      migrated += affected.affectedRows || BATCH;
      console.log(`  ✓ Migrated ${Math.min(migrated, total)}/${total}`);

      if ((affected.affectedRows || 0) === 0) break;
    }

    console.log(`\n✅ Migration complete! ${migrated} shipment records created.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  }
}

migrate();

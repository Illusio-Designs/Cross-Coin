require("dotenv").config();
const { sequelize } = require("../config/db.js");

const verifyIndexes = async () => {
  try {
    console.log("🔍 Verifying performance optimization indexes...\n");

    const indexes = [
      { table: 'orders', name: 'idx_orders_user_date' },
      { table: 'order_items', name: 'idx_order_items_product' },
      { table: 'badges', name: 'idx_badges_user' },
      { table: 'transactions', name: 'idx_transactions_order' },
      { table: 'products', name: 'idx_products_category' },
      { table: 'product_variations', name: 'idx_variations_product' },
      { table: 'coupons', name: 'idx_coupons_code_status' },
      { table: 'stock', name: 'idx_stock_product_warehouse' }
    ];

    let created = 0;
    let missing = 0;

    for (const index of indexes) {
      const [result] = await sequelize.query(`
        SELECT COUNT(*) as count
        FROM INFORMATION_SCHEMA.STATISTICS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = '${index.table}' 
        AND INDEX_NAME = '${index.name}'
      `);

      if (result[0].count > 0) {
        console.log(`✅ ${index.name} on ${index.table}`);
        created++;
      } else {
        console.log(`❌ ${index.name} on ${index.table} - MISSING`);
        missing++;
      }
    }

    console.log(`\n📊 Summary: ${created} indexes found, ${missing} missing`);

    if (missing === 0) {
      console.log("✅ All performance indexes are in place!");
    } else {
      console.log("⚠️ Some indexes are missing. Run setupDatabase.js to create them.");
    }

    await sequelize.close();
  } catch (error) {
    console.error("❌ Error verifying indexes:", error.message);
    process.exit(1);
  }
};

verifyIndexes();

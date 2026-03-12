require("dotenv").config();
const { Sequelize } = require("sequelize");

const testConnection = async () => {
  try {
    console.log("🔌 Testing database connection...");
    console.log(`Host: ${process.env.DB_HOST}`);
    console.log(`Database: ${process.env.DB_DATABASE}`);
    console.log(`User: ${process.env.DB_USER}`);

    const sequelize = new Sequelize(
      process.env.DB_DATABASE,
      process.env.DB_USER,
      process.env.DB_PASSWORD,
      {
        host: process.env.DB_HOST,
        dialect: "mysql",
        logging: false,
      }
    );

    await sequelize.authenticate();
    console.log("✅ Database connection successful!");

    // Check if tables exist
    const [tables] = await sequelize.query(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = DATABASE()
    `);

    console.log(`\n📊 Found ${tables.length} tables in database`);

    // Check for our indexes
    const [indexes] = await sequelize.query(`
      SELECT DISTINCT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND INDEX_NAME LIKE 'idx_%'
    `);

    console.log(`\n🔍 Found ${indexes.length} custom indexes:`);
    indexes.forEach((idx) => {
      console.log(`  - ${idx.INDEX_NAME}`);
    });

    await sequelize.close();
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
    process.exit(1);
  }
};

testConnection();

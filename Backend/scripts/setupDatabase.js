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

module.exports = { setupDatabase, findAvailablePort };

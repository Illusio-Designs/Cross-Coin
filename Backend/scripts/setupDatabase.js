require('dotenv').config();
const { sequelize } = require('../config/db.js');
const path = require('path');
const fs = require('fs');

// In CommonJS, __filename and __dirname are available

const setupDatabase = async () => {
    try {
        // First, try to connect without selecting a database
        const { Sequelize } = require('sequelize');
        const tempSequelize = new Sequelize('', process.env.DB_USER, process.env.DB_PASSWORD, {
            host: process.env.DB_HOST,
            dialect: process.env.DB_DIALECT || 'mysql',
            logging: false
        });

        // Create database if it doesn't exist with proper collation
        await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
        await tempSequelize.close();

        // Now connect to the specific database
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Load models
        console.log('Loading models and creating/altering tables...');
        
        const modelDir = path.join(__dirname, '..', 'model');
        const modelFiles = fs.readdirSync(modelDir)
            .filter(file => file.endsWith('Model.js'));
        
        const models = {};
        for (const file of modelFiles) {
            const modelPath = path.join(modelDir, file);
            const modelModule = require(modelPath);
            const modelName = file.charAt(0).toUpperCase() + file.slice(1).replace('Model.js', '');
            const model = modelModule[modelName];
            if (model && model.sync) {
                console.log(`Loaded model: ${modelName}`);
                models[modelName] = model;
            } else {
                console.warn(`Skipping non-model file or model without sync method: ${file}`);
            }
        }

        // Apply associations BEFORE syncing
        console.log('Applying model associations...');
        try {
            const associationsPath = path.join(__dirname, '..', 'model', 'associations.js');
            if (fs.existsSync(associationsPath)) {
                require(associationsPath);
                console.log('✓ Associations applied successfully');
            } else {
                console.warn('⚠️ associations.js not found. Models should define their own associations.');
            }
        } catch (assocError) {
            console.error('❌ Error applying associations:', assocError.message);
        }

        // Sync all tables at once (this creates all tables and relationships)
        // AUTOMATION: Always alter tables to match the latest model definitions (auto-migration)
        console.log('Syncing all tables...');
        await sequelize.sync({ alter: true, hooks: false });
        console.log('✓ All tables synced');

        // Now it's safe to create the admin user
        if (models['User']) {
            const bcrypt = require('bcryptjs');
            const adminEmail = 'admin@admin.com';
            const adminPassword = 'Admin@123';
            const adminUsername = 'admin';
            const adminRole = 'admin';
            const existingAdmin = await models['User'].findOne({ where: { email: adminEmail } });
            if (!existingAdmin) {
                const hashedPassword = await bcrypt.default.hash(adminPassword, 10);
                await models['User'].create({
                    username: adminUsername,
                    email: adminEmail,
                    password: hashedPassword,
                    role: adminRole
                });
                console.log('✓ Admin user created: admin@admin.com / Admin@123');
            } else {
                console.log('✓ Admin user already exists');
            }
        }

        console.log('✓ Database setup completed successfully!');
        return true;
    } catch (error) {
        console.error('❌ Database setup failed:', error.message);
        if (error.parent?.sqlMessage) {
            console.error('SQL Error:', error.parent.sqlMessage);
            if (error.sql) {
                console.error('Faulty SQL:', error.sql);
            }
        }
        throw error;
    }
};

const findAvailablePort = async (startPort) => {
    const net = require('net');
    return new Promise((resolve, reject) => {
        const server = net.createServer();
        server.unref();
        server.on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
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
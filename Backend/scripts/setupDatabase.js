import 'dotenv/config';
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT || 'mysql',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_general_ci',
            engine: 'InnoDB'
        }
    }
);

export const setupDatabase = async () => {
    try {
        // First, try to connect without selecting a database
        const tempSequelize = new Sequelize('', process.env.DB_USER, process.env.DB_PASSWORD, {
            host: process.env.DB_HOST,
            dialect: process.env.DB_DIALECT || 'mysql',
            logging: false
        });

        // Create database if it doesn't exist with proper collation
        await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_DATABASE}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
        await tempSequelize.close();

        // Now connect to the specific database
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Load models and create/alter tables
        console.log('Loading models and creating/altering tables...');
        
        const modelDir = path.join(__dirname, '..', 'model');
        const modelFiles = fs.readdirSync(modelDir)
            .filter(file => file.endsWith('Model.js'));
        
        const models = {};
        for (const file of modelFiles) {
            const modelPath = `file://${path.join(modelDir, file)}`;
            const modelModule = await import(modelPath);
            const modelName = file.charAt(0).toUpperCase() + file.slice(1).replace('Model.js', '');
            const model = modelModule[modelName];
            if (model && model.sync) {
                console.log(`Loaded model: ${modelName}`);
                models[modelName] = model;
            } else {
                console.warn(`Skipping non-model file or model without sync method: ${file}`);
            }
        }
        
        // Apply associations
        console.log('Applying model associations...');
        try {
            const associationsPath = path.join(__dirname, '..', 'model', 'associations.js');
            if (fs.existsSync(associationsPath)) {
                await import(`file://${associationsPath}`);
                console.log('✓ Associations applied successfully');
            } else {
                console.warn('⚠️ associations.js not found. Models should define their own associations.');
            }
        } catch (assocError) {
            console.error('❌ Error applying associations:', assocError.message);
            throw assocError;
        }

        // Sync all tables at once
        console.log('Syncing all tables...');
        await sequelize.sync({ alter: true, hooks: false });
        console.log('✓ All tables synced');

        // Create admin user if not exists
        if (models['User']) {
            const bcrypt = await import('bcryptjs');
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

// If the script is run directly, execute the setup
if (import.meta.url.startsWith('file:') && process.argv[1] === fileURLToPath(import.meta.url)) {
    setupDatabase()
        .then(() => {
            console.log("Database setup script finished.");
            process.exit(0);
        })
        .catch((error) => {
            console.error("Database setup script failed:", error);
            process.exit(1);
        });
} 
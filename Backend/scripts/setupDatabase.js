import 'dotenv/config';
import { Sequelize } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create Sequelize instance
const sequelize = new Sequelize(
    process.env.DB_NAME,
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
        await tempSequelize.query(`CREATE DATABASE IF NOT EXISTS ${process.env.DB_NAME || process.env.DB_DATABASE} CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;`);
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
        
        // Sync tables in correct order based on dependencies
        const syncOrder = {
            base: ['User', 'Category', 'Attribute', 'Settings', 'ShippingFee', 'SeoMetadata', 'Coupon'],
            product: ['Product'],
            variation: ['ProductVariation'],
            attribute: ['AttributeValue'],
            dependent: [
                'Review', 'ReviewImage', 'ProductImage', 'ProductSEO', 
                'Order', 'OrderItem', 'OrderStatusHistory',
                'Payment', 'ShippingAddress', 'Cart', 'CartItem', 'Wishlist'
            ]
        };

        // Sync base tables first
        console.log('Syncing base tables...');
        for (const modelName of syncOrder.base) {
            if (models[modelName]) {
                await models[modelName].sync({ alter: true, hooks: false });
                console.log(`✓ ${modelName} table synced`);
            }
        }

        // Sync product-related tables
        console.log('Syncing product-related tables...');
        for (const modelName of syncOrder.product) {
            if (models[modelName]) {
                await models[modelName].sync({ alter: true, hooks: false });
                console.log(`✓ ${modelName} table synced`);
            }
        }

        // Sync variation and attribute tables
        console.log('Syncing variation and attribute tables...');
        for (const modelName of [...syncOrder.variation, ...syncOrder.attribute]) {
            if (models[modelName]) {
                await models[modelName].sync({ alter: true, hooks: false });
                console.log(`✓ ${modelName} table synced`);
            }
        }

        // Sync dependent tables
        console.log('Syncing dependent tables...');
        for (const modelName of syncOrder.dependent) {
            if (models[modelName]) {
                await models[modelName].sync({ alter: true, hooks: false });
                console.log(`✓ ${modelName} table synced`);
            }
        }

        // Handle special cases for Slider and Category tables
        console.log('Handling special table modifications...');
        
        // Slider table modifications
        if (models['Slider']) {
            await models['Slider'].sync({ alter: true, hooks: false });
            console.log('✓ Slider table synced');
        }

        // Category table modifications
        if (models['Category']) {
            await models['Category'].sync({ alter: true, hooks: false });
            console.log('✓ Category table synced');
        }

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
        }

        // Add essential indexes and foreign keys
        console.log('Setting up indexes and foreign keys...');
        const dbName = process.env.DB_NAME || process.env.DB_DATABASE;
        await sequelize.query(`USE ${dbName}`);

        // Foreign Keys
        const foreignKeys = [
            `ALTER TABLE reviews ADD CONSTRAINT IF NOT EXISTS fk_reviews_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE`,
            `ALTER TABLE reviews ADD CONSTRAINT IF NOT EXISTS fk_reviews_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE`,
            `ALTER TABLE review_images ADD CONSTRAINT IF NOT EXISTS fk_review_images_review FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE ON UPDATE CASCADE`
        ];

        // Indexes
        const indexes = [
            `ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS idx_users_email (email)`,
            `ALTER TABLE categories ADD INDEX IF NOT EXISTS idx_categories_parentId (parentId)`,
            `ALTER TABLE orders ADD UNIQUE INDEX IF NOT EXISTS idx_orders_order_number (order_number)`,
            `ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_status (status)`,
            `ALTER TABLE product_variations ADD INDEX IF NOT EXISTS idx_product_variations_productId (productId)`,
            `ALTER TABLE coupons ADD UNIQUE INDEX IF NOT EXISTS idx_coupons_code (code)`,
            // New indexes for Product model
            `ALTER TABLE products ADD INDEX IF NOT EXISTS idx_products_badge (badge)`,
            `ALTER TABLE products ADD INDEX IF NOT EXISTS idx_products_total_sold (total_sold)`,
            `ALTER TABLE products ADD INDEX IF NOT EXISTS idx_products_created_at (created_at)`
        ];

        // Apply foreign keys
        for (const fk of foreignKeys) {
            await sequelize.query(fk).catch(err => 
                console.warn(`⚠️ Could not create foreign key: ${err.message}`)
            );
        }

        // Apply indexes
        for (const idx of indexes) {
            await sequelize.query(idx).catch(err => 
                console.warn(`⚠️ Could not create index: ${err.message}`)
            );
        }

        // Add new columns to products table if they don't exist
        const productColumns = [
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS badge ENUM('new_arrival', 'hot_selling', 'low_stock', 'none') DEFAULT 'none'`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS total_sold INT DEFAULT 0`,
            `ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
        ];

        for (const column of productColumns) {
            await sequelize.query(column).catch(err => 
                console.warn(`⚠️ Could not add column: ${err.message}`)
            );
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

export const findAvailablePort = async (startPort) => {
    const net = await import('net');
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
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
        
        // Step 1: Load models and create/alter tables
        console.log('Step 1: Loading models and creating/altering tables...');
        
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
                console.warn(`Skipping non-model file or model without sync method: ${file} (loaded as ${modelName})`);
            }
        }
        
        // Step 1a: Sync essential base tables FIRST (those not depending on others for FKs initially)
        console.log('Step 1a: Syncing essential base tables (User, Product, Attribute, Category, etc.)...');
        const baseTableNames = ['User', 'Product', 'Attribute', 'Category', 'Settings', 'ShippingFee', 'SeoMetadata', 'Coupon', 'AttributeValue'];
        for (const modelName of baseTableNames) {
            if (models[modelName]) {
                console.log(`Syncing ${modelName} table (alter:true)...`);
                await models[modelName].sync({ alter: true, hooks: false });
            } else {
                console.warn(`Model ${modelName} not found for syncing in base tables.`);
            }
        }
        
        // Step 1b: Sync other tables that might have FKs 
        // (Review, ReviewImage, ProductImage, ProductSEO, ProductVariation, Order, OrderItem, etc.)
        console.log('Step 1b: Syncing dependent tables (Review, ProductVariation, Order, etc.)...');
        const dependentTableNames = [
            'Review', 'ReviewImage', 'ProductImage', 'ProductSEO', 
            'ProductVariation', 'Order', 'OrderItem', 'OrderStatusHistory',
            'Payment', 'ShippingAddress', 'Cart', 'CartItem', 'Wishlist', 'Slider'
        ];
        
        for (const modelName of dependentTableNames) {
            if (models[modelName]) {
                console.log(`Syncing ${modelName} table structure (alter:true)...`);
                // The foreign key definitions within the model attributes should be handled by alter:true.
                // If ER_CANT_CREATE_TABLE (errno: 150) persists for specific tables,
                // it implies an issue with the referenced table/column not existing or a mismatch
                // that `alter:true` cannot resolve automatically for the FK part.
                await models[modelName].sync({ 
                    alter: true, 
                    hooks: false,
                });
            } else {
                console.warn(`Model ${modelName} not found for syncing in dependent tables.`);
            }
        }
        
        // Step 2: Apply associations explicitly defined in associations.js
        // This step is crucial for ensuring all relationships and foreign keys are correctly established.
        console.log('Step 2: Applying associations from associations.js...');       
        try {
            const associationsPath = path.join(__dirname, '..', 'model', 'associations.js');
            if (fs.existsSync(associationsPath)) {
                 await import(`file://${associationsPath}`);
                 console.log('Successfully applied associations from associations.js');
            } else {
                console.warn('associations.js not found, skipping explicit association application. Ensure models define associations correctly.');
            }
        } catch (assocError) {
            console.error('Error applying associations from associations.js:', assocError);
            // Continue if associations fail, as models might have self-defined them, but log error.
        }
        
        // Step 2.5: Sync all models again after associations to establish FKs...
        console.log('Step 2.5: Syncing all models again after associations to establish FKs...');
        for (const modelName in models) {
            if (models[modelName]) {
                console.log(`Post-association sync for ${modelName}...`);
                await models[modelName].sync({ alter: true, hooks: false });
            }
        }
        
        // Step 3: Add specific essential indexes (those not handled by Sequelize's default unique constraints or model indexes)
        console.log('Step 3: Adding specific essential database indexes...');
            const executeQuery = async (query) => {
                const dbName = process.env.DB_NAME || process.env.DB_DATABASE;
                await sequelize.query(`USE ${dbName}`);
                return await sequelize.query(query);
            };

        // Manually ensure Foreign Keys for 'reviews' table
        console.log('Ensuring Foreign Key for reviews.productId to products.id...');
        await executeQuery(
            `ALTER TABLE reviews ADD CONSTRAINT IF NOT EXISTS fk_reviews_product FOREIGN KEY (productId) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE`
        ).catch(err => console.warn('Warning: Could not create fk_reviews_product:', err.original ? err.original.sqlMessage : err.message));

        console.log('Ensuring Foreign Key for reviews.userId to users.id...');
        await executeQuery(
            `ALTER TABLE reviews ADD CONSTRAINT IF NOT EXISTS fk_reviews_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE`
        ).catch(err => console.warn('Warning: Could not create fk_reviews_user:', err.original ? err.original.sqlMessage : err.message));

        // Add other critical FKs manually if needed, e.g., for ReviewImage
        console.log('Ensuring Foreign Key for review_images.reviewId to reviews.id...');
        await executeQuery(
            `ALTER TABLE review_images ADD CONSTRAINT IF NOT EXISTS fk_review_images_review FOREIGN KEY (reviewId) REFERENCES reviews(id) ON DELETE CASCADE ON UPDATE CASCADE`
        ).catch(err => console.warn('Warning: Could not create fk_review_images_review:', err.original ? err.original.sqlMessage : err.message));
        
        // Add essential indexes using IF NOT EXISTS
        await executeQuery(`ALTER TABLE users ADD UNIQUE INDEX IF NOT EXISTS idx_users_email (email)`).catch(err => console.warn('Idx users.email:', err.original ? err.original.sqlMessage : err.message));
        await executeQuery(`ALTER TABLE categories ADD INDEX IF NOT EXISTS idx_categories_parentId (parentId)`).catch(err => console.warn('Idx categories.parentId:', err.original ? err.original.sqlMessage : err.message));
        await executeQuery(`ALTER TABLE orders ADD UNIQUE INDEX IF NOT EXISTS idx_orders_order_number (order_number)`).catch(err => console.warn('Idx orders.order_number:', err.original ? err.original.sqlMessage : err.message));
        await executeQuery(`ALTER TABLE orders ADD INDEX IF NOT EXISTS idx_orders_status (status)`).catch(err => console.warn('Idx orders.status:', err.original ? err.original.sqlMessage : err.message));
        // The unique index on product_variations.sku should be handled by the model definition (sku: { unique: true })
        // await executeQuery(`ALTER TABLE product_variations ADD UNIQUE INDEX IF NOT EXISTS idx_product_variations_sku (sku)`).catch(err => console.warn('Idx product_variations.sku:', err.original ? err.original.sqlMessage : err.message));
        await executeQuery(`ALTER TABLE product_variations ADD INDEX IF NOT EXISTS idx_product_variations_productId (productId)`).catch(err => console.warn('Idx product_variations.productId:', err.original ? err.original.sqlMessage : err.message));
        await executeQuery(`ALTER TABLE coupons ADD UNIQUE INDEX IF NOT EXISTS idx_coupons_code (code)`).catch(err => console.warn('Idx coupons.code:', err.original ? err.original.sqlMessage : err.message));
        
        // Ensure Review table FKs are considered (they are defined in the model, sync should handle)
        // If Review table still causes issues, an explicit ALTER TABLE for its FKs might be needed here AFTER associations.js
        // For example, for Review to User FK:
        // await executeQuery(`
        //     ALTER TABLE reviews ADD CONSTRAINT IF NOT EXISTS fk_reviews_user FOREIGN KEY (userId) REFERENCES users(id) ON DELETE SET NULL ON UPDATE CASCADE`
        // ).catch(err => console.warn('Warning: Could not create fk_reviews_user:', err.message));

            console.log('Database setup completed successfully!');
            return true;
    } catch (error) {
        console.error('Database setup failed:', error);
        if (error.parent && error.parent.sqlMessage) { // More generic check for parent error
            console.error('Detailed SQL Error:', error.parent.sqlMessage);
            if (error.sql) {
                console.error('Faulty SQL (from Sequelize error object):', error.sql);
            }
        } else if (error.original && error.original.sqlMessage) { // For errors from direct executeQuery
             console.error('Detailed SQL Error (executeQuery):', error.original.sqlMessage);
        }
        throw error;
    }
};

// Add port handling function
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
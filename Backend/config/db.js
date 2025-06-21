import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: process.env.NODE_ENV === 'development' ? console.log : false,
        dialectOptions: {
            charset: 'utf8mb4'
        },
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Sync the database with alterations to apply schema changes
        await syncDatabase(false);
        console.log('Database synchronized on connection.');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
        throw error;
    }
};

const syncDatabase = async (force = false) => {
    try {
        if (force) {
            console.warn('WARNING: This will drop all tables and recreate them!');
            // Only allow force sync in development
            if (process.env.NODE_ENV === 'development') {
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
                await sequelize.sync({ force: true });
                await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
                console.log('Database forcefully synchronized.');
            } else {
                console.error('Force sync is not allowed in production!');
            }
        } else {
            // Use alter: true for safe migrations
            await sequelize.sync({ alter: true });
            console.log('Database synchronized with alterations.');
        }
    } catch (error) {
        console.error('Unable to sync database:', error);
        throw error;
    }
};

export {
    sequelize,
    connectDB,
    syncDatabase
};
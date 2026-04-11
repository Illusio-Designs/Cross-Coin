const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        logging: false, // never log SQL — saves memory and I/O
        dialectOptions: { charset: 'utf8mb4' },
        pool: {
            max: 15,     // increased — cron jobs + API requests need headroom
            min: 2,      // keep 2 idle connections ready
            acquire: 60000, // wait up to 60s for a connection before timeout
            idle: 30000, // release idle connections after 30s
            evict: 15000,
        },
        retry: { max: 2 },
    }
);

const connectDB = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connection established successfully.');
        
        // Only run alter sync in development — production uses explicit migrations
        if (process.env.NODE_ENV !== 'production') {
            await syncDatabase(true);
            console.log('Database synchronized on connection.');
        }
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

module.exports = {
    sequelize,
    connectDB,
    syncDatabase
};
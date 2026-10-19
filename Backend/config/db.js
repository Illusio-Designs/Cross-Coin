const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

// Slow-query threshold (ms). Anything above this gets logged WITH the
// SQL so an operator can spot N+1s, missing indexes, table-scans, etc.
// Override per-env: SLOW_QUERY_MS=200 npm start
const SLOW_QUERY_MS = Number.parseInt(process.env.SLOW_QUERY_MS || '500', 10);

// Sequelize calls our custom `logging` function with the formatted SQL
// AND an options bag (which includes the benchmark elapsed time only
// when benchmark:true). We log nothing for fast queries.
function slowQueryLogger(sql, timing) {
    if (typeof timing !== 'number' || timing < SLOW_QUERY_MS) return;
    try {
        const { logger } = require('./logging.js');
        const truncated = sql.length > 500 ? sql.slice(0, 500) + ' …(truncated)' : sql;
        logger.warn(`[slow-query ${timing}ms] ${truncated}`);
    } catch { /* never let logging itself throw */ }
}

const sequelize = new Sequelize(
    process.env.DB_DATABASE,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        dialect: 'mysql',
        // benchmark:true makes the 2nd arg to `logging` the elapsed ms.
        // We still suppress fast queries to save I/O.
        benchmark: true,
        logging: slowQueryLogger,
        dialectOptions: { charset: 'utf8mb4' },
        // Pool sizing is env-tunable so it can be kept UNDER the MySQL user's
        // `max_user_connections` cap without a redeploy. On shared/cPanel hosting
        // the effective limit is (DB_POOL_MAX × number of Node/Passenger
        // instances) — keep that product a few below the cap. min:0 lets idle
        // connections fully drain so the app never pins connections while quiet.
        pool: {
            max: Number.parseInt(process.env.DB_POOL_MAX || '10', 10),
            min: Number.parseInt(process.env.DB_POOL_MIN || '0', 10),
            acquire: Number.parseInt(process.env.DB_POOL_ACQUIRE || '60000', 10),
            idle: Number.parseInt(process.env.DB_POOL_IDLE || '10000', 10),
            evict: Number.parseInt(process.env.DB_POOL_EVICT || '10000', 10),
        },
        retry: { max: 2 },
    }
);

module.exports = { sequelize };

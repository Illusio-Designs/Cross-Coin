const { initializeCronJobs } = require('./config/cronJobs.js');

/**
 * Initialize cron jobs
 * Called during server startup to initialize background tasks
 */
function initCronJobs() {
  try {
    initializeCronJobs();
  } catch (error) {
    console.error('❌ Failed to initialize cron jobs:', error.message);
    throw error;
  }
}

module.exports = {
  initCronJobs
};

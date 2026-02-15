const cron = require('node-cron');
const orderController = require('../controller/orderController');

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs...');

  // FShip Order Sync - Runs every hour
  cron.schedule('0 * * * *', async () => {
    console.log('\n⏰ [CRON] FShip hourly sync started at:', new Date().toISOString());
    
    try {
      // Create mock request and response objects for the controller
      const mockReq = {
        user: { id: 'system', username: 'cron_job' }
      };
      
      const mockRes = {
        json: (data) => {
          console.log('✅ [CRON] FShip sync completed:', {
            total: data.data?.total,
            synced: data.data?.synced,
            updated: data.data?.updated,
            skipped: data.data?.skipped,
            errors: data.data?.errors
          });
        },
        status: (code) => ({
          json: (data) => {
            console.error('❌ [CRON] FShip sync failed:', data);
          }
        })
      };

      await orderController.syncOrdersWithFShip(mockReq, mockRes);
      
    } catch (error) {
      console.error('❌ [CRON] FShip sync error:', error.message);
    }
  });

  console.log('✅ Cron jobs initialized successfully');
  console.log('📋 Active jobs:');
  console.log('   - FShip Order Sync: Every hour (0 * * * *)');
}

module.exports = { initializeCronJobs };

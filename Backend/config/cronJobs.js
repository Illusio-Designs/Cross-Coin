const cron = require('node-cron');
const orderController = require('../controller/orderController');
const loyaltyService = require('../services/loyaltyService');
const instagramService = require('../services/instagramService');

/**
 * Initialize all cron jobs
 */
function initializeCronJobs() {
  console.log('🕐 Initializing cron jobs...');

  // FShip Order Sync - Runs every 2 hours (reduced frequency)
  cron.schedule('0 */2 * * *', async () => {
    console.log('\n⏰ [CRON] FShip sync started at:', new Date().toISOString());
    
    try {
      // Create mock request and response objects for the controller
      const mockReq = {
        user: { id: 'system', username: 'cron_job' },
        query: { limit: 50 } // Limit to 50 orders per sync to prevent resource exhaustion
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

  // Loyalty points expiry - daily at 2 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('\n⏰ [CRON] Loyalty expiry started at:', new Date().toISOString());
    try {
      const result = await loyaltyService.expirePoints();
      console.log('✅ [CRON] Loyalty expiry completed:', result);
    } catch (error) {
      console.error('❌ [CRON] Loyalty expiry error:', error.message);
    }
  });

  // Instagram feed refresh - every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('\n⏰ [CRON] Instagram feed refresh started at:', new Date().toISOString());
    try {
      const brandId = 1;
      await instagramService.refreshAccessTokenIfNeeded(brandId);
      const result = await instagramService.refreshFeed(brandId);
      console.log('✅ [CRON] Instagram refresh completed:', {
        stale: !!result.stale,
        count: Array.isArray(result.data) ? result.data.length : 0,
      });
    } catch (error) {
      console.error('❌ [CRON] Instagram refresh error:', error.message);
    }
  });

  console.log('✅ Cron jobs initialized successfully');
  console.log('📋 Active jobs:');
  console.log('   - FShip Order Sync: Every 2 hours (0 */2 * * *) - Max 50 orders per run');
  console.log('   - Loyalty Expiry: Daily at 2 AM (0 2 * * *)');
  console.log('   - Instagram Feed Refresh: Every 6 hours (0 */6 * * *)');
}

module.exports = { initializeCronJobs };

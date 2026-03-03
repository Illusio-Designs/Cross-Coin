const { setBrandSetting } = require('../services/brandSettingsService');
require('dotenv').config();

async function migrateSettings() {
    try {
        console.log('Starting migration from .env to database...');
        
        // Assuming CrossCoin is brand_id = 1
        const crosscoinBrandId = 1;
        
        // Migrate Razorpay settings
        if (process.env.RAZORPAY_KEY_ID) {
            await setBrandSetting(
                crosscoinBrandId,
                'razorpay_key_id',
                process.env.RAZORPAY_KEY_ID,
                true,
                'payment',
                'Razorpay Key ID'
            );
            console.log('✓ Migrated RAZORPAY_KEY_ID');
        }
        
        if (process.env.RAZORPAY_KEY_SECRET) {
            await setBrandSetting(
                crosscoinBrandId,
                'razorpay_key_secret',
                process.env.RAZORPAY_KEY_SECRET,
                true,
                'payment',
                'Razorpay Key Secret'
            );
            console.log('✓ Migrated RAZORPAY_KEY_SECRET');
        }
        
        if (process.env.RAZORPAY_WEBHOOK_SECRET) {
            await setBrandSetting(
                crosscoinBrandId,
                'razorpay_webhook_secret',
                process.env.RAZORPAY_WEBHOOK_SECRET,
                true,
                'payment',
                'Razorpay Webhook Secret'
            );
            console.log('✓ Migrated RAZORPAY_WEBHOOK_SECRET');
        }
        
        // Migrate Analytics settings
        if (process.env.GA_MEASUREMENT_ID) {
            await setBrandSetting(
                crosscoinBrandId,
                'google_analytics_id',
                process.env.GA_MEASUREMENT_ID,
                false,
                'analytics',
                'Google Analytics Measurement ID'
            );
            console.log('✓ Migrated GA_MEASUREMENT_ID');
        }
        
        if (process.env.GTM_ID) {
            await setBrandSetting(
                crosscoinBrandId,
                'google_tag_manager_id',
                process.env.GTM_ID,
                false,
                'analytics',
                'Google Tag Manager ID'
            );
            console.log('✓ Migrated GTM_ID');
        }
        
        if (process.env.FB_PIXEL_ID) {
            await setBrandSetting(
                crosscoinBrandId,
                'facebook_pixel_id',
                process.env.FB_PIXEL_ID,
                false,
                'analytics',
                'Facebook Pixel ID'
            );
            console.log('✓ Migrated FB_PIXEL_ID');
        }
        
        if (process.env.FB_CONVERSION_TOKEN) {
            await setBrandSetting(
                crosscoinBrandId,
                'facebook_conversion_token',
                process.env.FB_CONVERSION_TOKEN,
                true,
                'analytics',
                'Facebook Conversion API Token'
            );
            console.log('✓ Migrated FB_CONVERSION_TOKEN');
        }
        
        // Migrate Shipping settings
        if (process.env.FSHIP_API_KEY) {
            await setBrandSetting(
                crosscoinBrandId,
                'fship_api_key',
                process.env.FSHIP_API_KEY,
                true,
                'shipping',
                'FShip API Key'
            );
            console.log('✓ Migrated FSHIP_API_KEY');
        }
        
        if (process.env.FSHIP_WAREHOUSE_ID) {
            await setBrandSetting(
                crosscoinBrandId,
                'fship_warehouse_id',
                process.env.FSHIP_WAREHOUSE_ID,
                false,
                'shipping',
                'FShip Default Warehouse ID'
            );
            console.log('✓ Migrated FSHIP_WAREHOUSE_ID');
        }
        
        // Migrate Email settings
        if (process.env.SMTP_HOST) {
            await setBrandSetting(
                crosscoinBrandId,
                'smtp_host',
                process.env.SMTP_HOST,
                false,
                'email',
                'SMTP Host'
            );
            console.log('✓ Migrated SMTP_HOST');
        }
        
        if (process.env.SMTP_USER) {
            await setBrandSetting(
                crosscoinBrandId,
                'smtp_user',
                process.env.SMTP_USER,
                false,
                'email',
                'SMTP Username'
            );
            console.log('✓ Migrated SMTP_USER');
        }
        
        if (process.env.SMTP_PASSWORD) {
            await setBrandSetting(
                crosscoinBrandId,
                'smtp_password',
                process.env.SMTP_PASSWORD,
                true,
                'email',
                'SMTP Password'
            );
            console.log('✓ Migrated SMTP_PASSWORD');
        }
        
        console.log('\n✅ Migration completed successfully!');
        console.log('\nNext steps:');
        console.log('1. Verify settings in admin panel');
        console.log('2. Update your code to use brandSettingsService.getBrandSetting()');
        console.log('3. Test all integrations');
        console.log('4. Once verified, you can remove these values from .env');
        
        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

// Run migration
migrateSettings();

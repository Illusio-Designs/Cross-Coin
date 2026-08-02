/**
 * Seed Script: Add iThink Logistics + Shipping Provider brand settings
 *
 * Run:  node scripts/seedShippingProviderSettings.js
 *
 * This is idempotent — it will skip settings that already exist.
 */

const { sequelize } = require('../config/db');
const { BrandSetting } = require('../model/brandSettingModel');

const BRAND_ID = 1; // Change if you have multiple brands

const SETTINGS = [
  // ── Provider selector ─────────────────────────────────────────────────
  {
    key: 'SHIPPING_PROVIDER',
    value: 'fship',                       // Change to 'ithink' when ready to switch
    is_encrypted: false,
    category: 'shipping',
    description: 'Active shipping provider: fship | ithink',
  },

  // ── iThink Logistics credentials ──────────────────────────────────────
  {
    key: 'ITHINK_ACCESS_TOKEN',
    value: '',                            // Fill in from iThink dashboard
    is_encrypted: true,
    category: 'shipping',
    description: 'iThink Logistics API access token',
  },
  {
    key: 'ITHINK_SECRET_KEY',
    value: '',                            // Fill in from iThink dashboard
    is_encrypted: true,
    category: 'shipping',
    description: 'iThink Logistics API secret key',
  },
  {
    key: 'ITHINK_ENVIRONMENT',
    value: 'staging',                     // 'staging' or 'production'
    is_encrypted: false,
    category: 'shipping',
    description: 'iThink environment: staging (pre-alpha) or production',
  },
  {
    key: 'ITHINK_PICKUP_ADDRESS_ID',
    value: '',                            // Warehouse ID from iThink dashboard
    is_encrypted: false,
    category: 'shipping',
    description: 'iThink pickup/warehouse address ID',
  },
  {
    key: 'ITHINK_RETURN_ADDRESS_ID',
    value: '',                            // Usually same as pickup
    is_encrypted: false,
    category: 'shipping',
    description: 'iThink return address ID (defaults to pickup if empty)',
  },
  {
    key: 'ITHINK_WAREHOUSE_PINCODE',
    value: '395006',                      // Your warehouse pincode for serviceability checks
    is_encrypted: false,
    category: 'shipping',
    description: 'Warehouse pincode used for iThink serviceability checks',
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connected');

    let created = 0;
    let skipped = 0;

    for (const setting of SETTINGS) {
      const existing = await BrandSetting.findOne({
        where: { brand_id: BRAND_ID, key: setting.key },
      });

      if (existing) {
        console.log(`⏭️  ${setting.key} — already exists, skipping`);
        skipped++;
        continue;
      }

      await BrandSetting.create({
        brand_id: BRAND_ID,
        ...setting,
      });
      console.log(`✅ ${setting.key} — created`);
      created++;
    }

    console.log(`\n📊 Done: ${created} created, ${skipped} skipped`);
    console.log('\n⚠️  Remember to fill in ITHINK_ACCESS_TOKEN, ITHINK_SECRET_KEY, and ITHINK_PICKUP_ADDRESS_ID');
    console.log('   via the admin panel or directly in the brand_settings table.');
    console.log('   Then set SHIPPING_PROVIDER = "ithink" to activate.\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    process.exit(1);
  }
}

seed();

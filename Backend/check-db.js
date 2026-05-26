const { BrandSetting } = require('./model/brandSettingModel');
const { Order } = require('./model/orderModel');
const { sequelize } = require('./config/db');

(async () => {
  try {
    console.log('\n=== Checking iThink Settings ===\n');

    const settings = await BrandSetting.findAll({
      where: {},
      raw: true
    });

    const ithinkSettings = settings.filter(s => s.key && s.key.includes('ITHINK'));

    if (ithinkSettings.length === 0) {
      console.log('❌ No iThink settings found in database!');
    } else {
      console.log('✅ iThink Settings Found:\n');
      ithinkSettings.forEach(s => {
        const hidden = s.key.includes('TOKEN') || s.key.includes('SECRET') || s.key.includes('KEY');
        const value = hidden ? '*** (hidden) ***' : (s.value || '(empty)');
        console.log(`  [Brand ${s.brand_id}] ${s.key}: ${value}`);
      });
    }

    console.log('\n=== Checking Recent Orders ===\n');
    const orders = await Order.findAll({
      limit: 10,
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'order_number', 'brand_id', 'status'],
      raw: true
    });

    if (orders.length === 0) {
      console.log('❌ No orders found in database!');
    } else {
      console.log('✅ Recent Orders:\n');
      orders.forEach(o => {
        console.log(`  [ID: ${o.id}] ${o.order_number} (Brand: ${o.brand_id}, Status: ${o.status})`);
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
    process.exit(1);
  }
})();

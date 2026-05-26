# Warehouse ID & Manifest Generation Debug

## Issues to Debug:
1. **Warehouse ID going to "other"** - Need to verify:
   - Is ITHINK_PICKUP_ADDRESS_ID properly saved in database?
   - Is the settings cache serving stale values?
   - Is the warehouse ID being passed correctly to iThink API?

2. **Manifest not generating** - Need to check:
   - Is iThink returning a waybill after order creation?
   - Is the getManifest function being called?
   - Is the manifest PDF URL being returned?

## Debug Logging Added:
- ✅ Cache clear before fetching warehouse ID (settingsHelper)
- ✅ Detailed logging of warehouse ID values (prepareFShipOrderData)
- ✅ Order format logging with pickup/return IDs (formatOrderDataForIThink)
- ✅ Request payload preview (createForwardOrder)

## Next Steps:
1. Check database for actual ITHINK_PICKUP_ADDRESS_ID value
2. Test with curl to see actual API request/response
3. Monitor server logs for warehouse ID values
4. Verify iThink API response includes waybill
5. Check if manifest PDF URL is returned

## Commands to Run:
```bash
# Check database settings
cd Backend && node -e "
const { sequelize } = require('./config/db');
const { BrandSetting } = require('./model/brandSettingModel');
(async () => {
  await sequelize.authenticate();
  const settings = await BrandSetting.findAll({
    where: { key: ['ITHINK_PICKUP_ADDRESS_ID', 'ITHINK_RETURN_ADDRESS_ID'] }
  });
  settings.forEach(s => console.log(\`\${s.key}: \${s.value}\`));
})();
"

# Watch server logs during sync
# In one terminal: npm start (with NODE_DEBUG=* for max logging)
# In another: curl test with order/courier sync
```

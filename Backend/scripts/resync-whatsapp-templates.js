/**
 * Re-sync (repair) WhatsApp message templates on Meta.
 *
 * WHY: `Seed` uses create-if-not-exists, so it SKIPS any template that already
 * exists on the WhatsApp Business Account — it can never fix a template that was
 * registered earlier in a wrong/stale form (e.g. an old order_confirmation whose
 * variables no longer line up with what the backend sends, so the customer sees
 * the order number in the "Total" slot, the total in the "delivery" slot, etc.).
 *
 * This script calls updateAllTemplates(), which DELETES and RECREATES every
 * template from the current canonical definitions in whatsappService.buildTemplates
 * — so the live templates match exactly what the app sends.
 *
 * IMPORTANT — shared number: all brands share ONE verified WhatsApp number
 * (WHATSAPP_SHARED_BRAND_ID, default brand 1). A brand without its own
 * WHATSAPP_* settings falls back to that shared account, so templates are shared
 * across brands and the brand name is injected per message via {{2}}. You
 * therefore repair the templates ONCE on the shared account — not once per brand.
 *
 * IMPORTANT — Meta review: delete+recreate puts each template back into PENDING
 * review on Meta. Utility templates usually approve within minutes to a few
 * hours (can be up to 24h). Until a template is APPROVED again it cannot be sent.
 *
 * Run:
 *   cd Backend && node scripts/resync-whatsapp-templates.js            # shared brand (default)
 *   cd Backend && node scripts/resync-whatsapp-templates.js 4          # a specific brandId
 *   cd Backend && node scripts/resync-whatsapp-templates.js 1 order_confirmation,order_shipped
 *
 * Requires the target (or shared) brand's WHATSAPP_API_TOKEN /
 * WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_BUSINESS_ACCOUNT_ID to be configured in
 * Dashboard → Settings (the same credentials the live app already uses).
 */

const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');

const SHARED_BRAND_ID = Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1;

async function main() {
  const brandId = Number(process.argv[2]) || SHARED_BRAND_ID;
  const namesArg = process.argv[3];
  const names = namesArg ? namesArg.split(',').map(s => s.trim()).filter(Boolean) : null;

  logger.info(`[resync-wa] Re-syncing WhatsApp templates for brand ${brandId}` +
    (names ? ` (only: ${names.join(', ')})` : ' (all templates)') +
    ' — this delete+recreates each on Meta (re-enters PENDING review).');

  const results = await whatsappService.updateAllTemplates(brandId, names);

  let updated = 0, errored = 0;
  for (const r of results) {
    if (r.status === 'updated') { updated++; logger.info(`  ✓ ${r.name} → recreated (id: ${r.id})`); }
    else { errored++; logger.error(`  ✗ ${r.name} → ${r.error || r.status}`); }
  }

  logger.info(`[resync-wa] Done: ${updated} recreated, ${errored} failed. ` +
    `Recreated templates are PENDING on Meta until re-approved.`);
}

if (require.main === module) {
  main()
    .then(() => process.exit(0))
    .catch((e) => { logger.error('[resync-wa] fatal: ' + e.message); process.exit(1); });
}

module.exports = { main };

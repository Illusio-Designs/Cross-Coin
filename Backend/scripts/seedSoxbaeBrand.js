/* Register the "Soxbae" socks brand.

   The multi-tenant backend resolves a brand from the X-Brand-Name
   request header → brands.slug (see middleware/brandMiddleware.js).
   The Soxbae storefront must send `X-Brand-Name: soxbae`, so a brand
   row with slug='soxbae', status='active' must exist or every API call
   from that frontend returns 404 "Brand not found".

   NOTE: Soxbae does not have a storefront/logo in this repo yet, so the
   colours below are neutral PLACEHOLDERS — update primary_color /
   secondary_color (and domain / contact_email) from the Brand Settings
   page in the dashboard once the brand's identity is finalised.

   Run with:
     node scripts/seedSoxbaeBrand.js

   Behaviour:
     - If a brand with slug='soxbae' exists → ensure it's active.
     - Otherwise → create a fresh soxbae brand row.
   Safe to re-run.
*/

require('dotenv').config();
const { connectDB } = require('../config/db.js');
const Brand = require('../model/brandModel.js');
const { invalidateBrandCache } = require('../services/brandService.js');

const SOXBAE = {
  name:            'Soxbae',
  slug:            'soxbae',
  display_name:    'Soxbae',
  domain:          'soxbae.com',
  primary_color:   '#111827',   // placeholder — update in dashboard
  secondary_color: '#f43f5e',   // placeholder — update in dashboard
  contact_email:   'support@soxbae.com',
  status:          'active',
};

(async () => {
  try {
    await connectDB();

    let brand = await Brand.findOne({ where: { slug: 'soxbae' } });
    if (brand) {
      console.log(`Soxbae brand already exists — id ${brand.id}.`);
      if (brand.status !== 'active') {
        await brand.update({ status: 'active' });
        console.log('  status set to active.');
      }
    } else {
      brand = await Brand.create(SOXBAE);
      console.log(`Soxbae brand created — id ${brand.id}, slug "${brand.slug}".`);
    }

    // The dashboard brand dropdown is served from a 5-minute cache
    // (brands:list:*). Writing through the model bypasses the service
    // that would clear it, so flush manually.
    try {
      await invalidateBrandCache();
      console.log('Brand cache invalidated — Soxbae will appear in the dashboard dropdown immediately.');
    } catch (e) {
      console.warn('Could not invalidate brand cache:', e.message,
        '\n  (it will refresh on its own within 5 minutes.)');
    }

    console.log('Next: assign categories and products to Soxbae in the dashboard.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed Soxbae brand:', err.message);
    process.exit(1);
  }
})();

/* Register the "Morbix" socks brand.

   The multi-tenant backend resolves a brand from the X-Brand-Name
   request header → brands.slug (see middleware/brandMiddleware.js).
   The Morbix storefront sends `X-Brand-Name: morbix`, so a brand row
   with slug='morbix', status='active' must exist or every API call
   from that frontend returns 404 "Brand not found".

   Colours are taken from the Morbix logo (see Morbix/app/globals.css):
   deep navy person-mark (#202c6e) + teal "orbix" wordmark (#2fa39b).

   Run with:
     node scripts/seedMorbixBrand.js

   Behaviour:
     - If a brand with slug='morbix' exists → ensure it's active.
     - Otherwise → create a fresh morbix brand row.
   Safe to re-run.
*/

require('dotenv').config();
const { connectDB } = require('../config/db.js');
const Brand = require('../model/brandModel.js');
const { invalidateBrandCache } = require('../services/brandService.js');

const MORBIX = {
  name:            'Morbix',
  slug:            'morbix',
  display_name:    'Morbix',
  domain:          'morbix.com',
  primary_color:   '#202c6e',
  secondary_color: '#2fa39b',
  contact_email:   'support@morbix.com',
  status:          'active',
};

(async () => {
  try {
    await connectDB();

    let brand = await Brand.findOne({ where: { slug: 'morbix' } });
    if (brand) {
      console.log(`Morbix brand already exists — id ${brand.id}.`);
      if (brand.status !== 'active') {
        await brand.update({ status: 'active' });
        console.log('  status set to active.');
      }
    } else {
      brand = await Brand.create(MORBIX);
      console.log(`Morbix brand created — id ${brand.id}, slug "${brand.slug}".`);
    }

    // The dashboard brand dropdown is served from a 5-minute cache
    // (brands:list:*). Writing through the model bypasses the service
    // that would clear it, so flush manually.
    try {
      await invalidateBrandCache();
      console.log('Brand cache invalidated — Morbix will appear in the dashboard dropdown immediately.');
    } catch (e) {
      console.warn('Could not invalidate brand cache:', e.message,
        '\n  (it will refresh on its own within 5 minutes.)');
    }

    console.log('Next: assign categories and products to Morbix in the dashboard.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed Morbix brand:', err.message);
    process.exit(1);
  }
})();

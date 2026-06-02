/* Register the "Velquira" jewellery brand — and migrate the older
   "velqura" slug if it exists.

   The multi-tenant backend resolves a brand from the X-Brand-Name
   request header → brands.slug (see middleware/brandMiddleware.js).
   The Velquira storefront sends `X-Brand-Name: velquira`, so a brand
   row with slug='velquira', status='active' must exist or every API
   call from that frontend returns 404 "Brand not found".

   Run with:
     node scripts/seedVelquiraBrand.js

   Behaviour:
     - If a brand with slug='velquira' exists → ensure it's active.
     - Else if a brand with slug='velqura' exists (the old name) →
       rename it to velquira in place. This preserves the brand id
       and every ProductBrand / Order / SEO association tied to it.
     - Otherwise → create a fresh velquira brand row.
   Safe to re-run.
*/

require('dotenv').config();
const { connectDB } = require('../config/db.js');
const Brand = require('../model/brandModel.js');
const { invalidateBrandCache } = require('../services/brandService.js');

const VELQUIRA = {
  name:            'Velquira',
  slug:            'velquira',
  display_name:    'Velquira',
  domain:          'velquira.com',
  primary_color:   '#C2A36B',
  secondary_color: '#2A241C',
  contact_email:   'support@velquira.com',
  status:          'active',
};

(async () => {
  try {
    await connectDB();

    // 1) Already on the new slug?
    let brand = await Brand.findOne({ where: { slug: 'velquira' } });
    if (brand) {
      console.log(`Velquira brand already exists — id ${brand.id}.`);
      if (brand.status !== 'active') {
        await brand.update({ status: 'active' });
        console.log('  status set to active.');
      }
    } else {
      // 2) Old slug present? Rename it in place to keep all associations.
      brand = await Brand.findOne({ where: { slug: 'velqura' } });
      if (brand) {
        console.log(`Renaming legacy brand "velqura" (id ${brand.id}) → "velquira"…`);
        await brand.update(VELQUIRA);
        console.log('  rename complete. All product / order / SEO links preserved.');
      } else {
        // 3) Nothing exists — create fresh.
        brand = await Brand.create(VELQUIRA);
        console.log(`Velquira brand created — id ${brand.id}, slug "${brand.slug}".`);
      }
    }

    // The dashboard brand dropdown is served from a 5-minute cache
    // (brands:list:*). Writing through the model bypasses the service
    // that would clear it, so flush manually.
    try {
      await invalidateBrandCache();
      console.log('Brand cache invalidated — Velquira will appear in the dashboard dropdown immediately.');
    } catch (e) {
      console.warn('Could not invalidate brand cache:', e.message,
        '\n  (it will refresh on its own within 5 minutes.)');
    }

    console.log('Next: assign categories and products to Velquira in the dashboard.');
    process.exit(0);
  } catch (err) {
    console.error('Failed to seed Velquira brand:', err.message);
    process.exit(1);
  }
})();
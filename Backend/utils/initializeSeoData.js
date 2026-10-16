const { SeoMetadata } = require('../model/associations.js');
const Brand = require('../model/brandModel.js');

// Default public pages every brand should have an editable SEO row for. Titles
// and descriptions are brand-named starting points — admins edit them in the
// dashboard. Canonical is left null so each storefront supplies its own (its
// domain differs per brand); robots keeps public pages indexable.
const DEFAULT_PAGES = [
  { page_name: 'home',       slug: '/',            title: (b) => `${b} — Online Store`,            desc: (b) => `Shop premium products at ${b}. Free shipping, easy returns and secure payments.` },
  { page_name: 'about',      slug: '/about',       title: (b) => `About ${b}`,                     desc: (b) => `Learn about ${b}, our mission and the story behind the brand.` },
  { page_name: 'contact',    slug: '/contact',     title: (b) => `Contact ${b}`,                   desc: (b) => `Get in touch with ${b} for orders, returns and product queries.` },
  { page_name: 'products',   slug: '/products',    title: (b) => `All Products — ${b}`,            desc: (b) => `Browse the full catalog at ${b}. Filter by category and price.` },
  { page_name: 'categories', slug: '/collections', title: (b) => `Shop by Collection — ${b}`,      desc: (b) => `Browse curated collections at ${b}.` },
  { page_name: 'blog',       slug: '/journal',     title: (b) => `${b} Journal`,                   desc: (b) => `Guides, tips and news from ${b}.` },
  { page_name: 'faq',        slug: '/faq',         title: (b) => `FAQ — ${b}`,                     desc: (b) => `Frequently asked questions about ${b}.` },
];

// Seeds default page SEO rows ONCE PER BRAND, then never overwrites them.
//  • findOrCreate on the (page_name, brand_id) pair → an existing row (seeded
//    earlier OR edited in the dashboard) is left exactly as-is. So each brand is
//    seeded a single time and admin edits are permanent.
//  • Also a one-time, idempotent cleanup of legacy brand_id=null rows: an orphan
//    (no brand_id=1 twin) is promoted to brand_id=1 to keep its edits; a null row
//    that duplicates a brand_id=1 row is deleted. After it runs once there are no
//    null rows left, so later startups are a cheap no-op.
const initializeSeoData = async () => {
    try {
        // ── 1. Clean up legacy brand_id=null rows (data-preserving) ──────────
        try {
            const nullRows = await SeoMetadata.findAll({ where: { brand_id: null } });
            let promoted = 0, removed = 0;
            for (const row of nullRows) {
                const twin = await SeoMetadata.findOne({ where: { page_name: row.page_name, brand_id: 1 } });
                if (twin) { await row.destroy(); removed += 1; }
                else { await row.update({ brand_id: 1 }); promoted += 1; }
            }
            if (promoted || removed) {
                console.log(`SEO cleanup: promoted ${promoted} orphan null row(s) to brand_id=1, removed ${removed} duplicate(s)`);
            }
        } catch (cleanupErr) {
            console.error('SEO null-row cleanup skipped:', cleanupErr.message);
        }

        // ── 2. Seed default page SEO once per active brand ───────────────────
        const brands = await Brand.findAll({ where: { status: 'active' } });
        if (!brands.length) { console.log('SEO seed: no active brands'); return; }

        let created = 0, failed = 0;
        for (const brand of brands) {
            const brandName = brand.display_name || brand.name || 'Our Store';
            for (const page of DEFAULT_PAGES) {
                // Per-row try/catch so one brand/page failure (e.g. a lingering
                // constraint) can never abort seeding for the remaining brands.
                try {
                    const [, wasCreated] = await SeoMetadata.findOrCreate({
                        where: { page_name: page.page_name, brand_id: brand.id },
                        defaults: {
                            page_name: page.page_name,
                            slug: page.slug,
                            meta_title: page.title(brandName),
                            meta_description: page.desc(brandName),
                            meta_keywords: `${brandName}, buy online, india`,
                            canonical_url: null,
                            robots: 'index, follow, max-image-preview:large',
                            brand_id: brand.id,
                        },
                    });
                    if (wasCreated) created += 1;
                } catch (rowErr) {
                    failed += 1;
                    console.error(`SEO seed: ${page.page_name} / brand ${brand.id} failed: ${rowErr.message}`);
                }
            }
        }
        if (failed) console.error(`SEO seed: ${failed} row(s) failed (see above)`);
        console.log(`SEO seed: ensured ${DEFAULT_PAGES.length} pages × ${brands.length} brand(s); created ${created} new row(s), left the rest untouched`);
    } catch (error) {
        console.error('Error initializing SEO data:', error);
    }
};

module.exports = { initializeSeoData };

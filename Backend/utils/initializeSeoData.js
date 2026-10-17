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

        // ── 3. One-time correction of CrossCoin's placeholder page SEO ───────
        // Several rows were seeded long ago with generic boilerplate ("Welcome
        // to Our Store…", "Browse Our Products…") and findOrCreate never
        // overwrites them. Replace each with real brand copy — but ONLY while it
        // still matches a KNOWN placeholder title, so an admin's own edit is
        // never clobbered. Idempotent: once corrected (or customised) the title
        // no longer matches and this is a no-op.
        try {
            const CC_SEO = [
                {
                    page: 'home',
                    stale: ['Welcome to Our Store - Your One-Stop Shopping Destination', 'Cross Coin - Your Trusted Shopping Partner', 'CrossCoin — Online Store', 'Cross Coin — Online Store'],
                    title: 'CrossCoin — Everyday Performance Socks | Free Shipping ₹799+',
                    desc: "Shop CrossCoin's premium performance & everyday socks — breathable, built to last, honestly priced. COD, 7-day returns & fast Pan-India delivery.",
                    kw: 'crosscoin socks, ankle socks, performance socks, mens socks, womens socks, buy socks online india',
                },
                {
                    page: 'products',
                    stale: ['Browse Our Products - Quality Products at Great Prices', 'All Products — CrossCoin', 'All Products — Cross Coin'],
                    title: 'Shop All Socks — CrossCoin',
                    desc: "Browse CrossCoin's full range of performance & everyday socks — ankle, crew, no-show and more. Filter by category and price. Free shipping ₹799+.",
                    kw: 'crosscoin socks, shop socks online, ankle socks, crew socks, no-show socks, buy socks india',
                },
                {
                    page: 'categories',
                    stale: ['Shop by Category - Find What You Need', 'Shop by Collection — CrossCoin', 'Shop by Collection — Cross Coin'],
                    title: 'Shop Socks by Collection — CrossCoin',
                    desc: 'Explore CrossCoin sock collections — performance, everyday, printed and more. Find your pair with free shipping and easy returns.',
                    kw: 'crosscoin collections, sock collections, performance socks, everyday socks india',
                },
                {
                    page: 'about',
                    stale: ['About Us - Your One-Stop Shopping Destination', 'About CrossCoin', 'About Cross Coin'],
                    title: 'About CrossCoin — Everyday Socks, Minted to Last',
                    desc: 'CrossCoin makes honest, everyday performance socks — comfortable, durable and fairly priced. Learn the story behind the brand.',
                    kw: 'about crosscoin, crosscoin brand, sock brand india',
                },
                {
                    page: 'contact',
                    stale: ["Contact Us - We're Here to Help", 'Contact CrossCoin', 'Contact Cross Coin'],
                    title: 'Contact CrossCoin — Support & Help',
                    desc: "Questions about orders, returns or sizing? Reach the CrossCoin team — we're here to help across India.",
                    kw: 'contact crosscoin, crosscoin support, socks customer service india',
                },
            ];
            const cc = brands.find((b) => (b.slug || '').toLowerCase() === 'crosscoin'
                || (b.name || '').toLowerCase().replace(/\s+/g, '') === 'crosscoin');
            if (cc) {
                let fixed = 0;
                for (const row of CC_SEO) {
                    const rec = await SeoMetadata.findOne({ where: { page_name: row.page, brand_id: cc.id } });
                    if (rec && row.stale.includes((rec.meta_title || '').trim())) {
                        await rec.update({ meta_title: row.title, meta_description: row.desc, meta_keywords: row.kw });
                        fixed += 1;
                    }
                }
                if (fixed) console.log(`SEO: corrected ${fixed} CrossCoin placeholder page meta row(s) → real brand copy`);
            }
        } catch (fixErr) {
            console.error('SEO page-meta correction skipped:', fixErr.message);
        }
    } catch (error) {
        console.error('Error initializing SEO data:', error);
    }
};

module.exports = { initializeSeoData };

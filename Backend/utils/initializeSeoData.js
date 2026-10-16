const { SeoMetadata } = require('../model/associations.js');
const { defaultSeoData } = require('../config/defaultSeoData.js');

const initializeSeoData = async () => {
    try {
        // One-time, idempotent cleanup of legacy brand_id=null SEO rows. These were
        // created by an earlier seed and are the rows the storefront never reads
        // (it prefers brand_id=1), so admin edits that landed on them looked lost.
        // Data-preserving: an orphan null row (no brand_id=1 twin) is PROMOTED to
        // brand_id=1 so its edits survive; a null row that merely duplicates an
        // existing brand_id=1 row is deleted. After this runs once there are no
        // null rows left, so on later startups it is a cheap no-op.
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

        // Get all existing page names
        const existingPages = await SeoMetadata.findAll({
            attributes: ['page_name']
        });
        const existingPageNames = existingPages.map(page => page.page_name);

        // Filter out pages that already exist
        const newPages = defaultSeoData.filter(
            page => !existingPageNames.includes(page.page_name)
        );

        if (newPages.length > 0) {
            // Create new SEO entries scoped to the default brand (id 1 / crosscoin).
            // The public reader and the admin writer both key off brand_id=1 when
            // no brand is resolved, so seeding at brand_id=1 (not null) keeps the
            // seed row, the storefront read, and the dashboard edit on the SAME row
            // — otherwise an admin edit (brand_id=1) is invisible behind a stale
            // brand_id=null seed row.
            await SeoMetadata.bulkCreate(newPages.map((p) => ({ ...p, brand_id: 1 })));
            console.log(`Created ${newPages.length} new SEO entries`);
        } else {
            console.log('All default SEO entries already exist');
        }
    } catch (error) {
        console.error('Error initializing SEO data:', error);
    }
};

module.exports = { initializeSeoData }; 
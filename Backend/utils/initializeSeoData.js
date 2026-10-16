const { SeoMetadata } = require('../model/associations.js');
const { defaultSeoData } = require('../config/defaultSeoData.js');

const initializeSeoData = async () => {
    try {
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
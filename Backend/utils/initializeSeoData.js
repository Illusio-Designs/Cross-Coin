import { SeoMetadata } from '../model/associations.js';
import { defaultSeoData } from '../config/defaultSeoData.js';

export const initializeSeoData = async () => {
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
            // Create new SEO entries
            await SeoMetadata.bulkCreate(newPages);
            console.log(`Created ${newPages.length} new SEO entries`);
        } else {
            console.log('All default SEO entries already exist');
        }
    } catch (error) {
        console.error('Error initializing SEO data:', error);
    }
}; 
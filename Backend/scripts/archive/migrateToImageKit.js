const fs = require('fs/promises');
const fsSync = require('fs');
const path = require('path');
const { Category } = require('../model/categoryModel.js');
const { Slider } = require('../model/sliderModel.js');
const imagekitService = require('../services/imagekitService.js');
const { logger } = require('../config/logging.js');

/**
 * Migration script to upload existing category and slider images to ImageKit
 * Run this once when deploying the ImageKit integration
 */

const UPLOAD_DIRS = {
    categories: path.join(__dirname, '../uploads/categories'),
    sliders: path.join(__dirname, '../uploads/slider')
};

const IMAGEKIT_FOLDERS = {
    categories: '/categories',
    sliders: '/sliders'
};

/**
 * Migrate category images to ImageKit
 */
async function migrateCategoryImages() {
    try {
        logger.info('Starting category image migration...');
        
        const categories = await Category.findAll({
            where: {
                image: { [require('sequelize').Op.not]: null }
            }
        });

        logger.info(`Found ${categories.length} categories with images`);

        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;

        for (const category of categories) {
            try {
                // Check if image is already an ImageKit path
                if (category.image.startsWith('/')) {
                    logger.info(`Category ${category.id} (${category.name}) already has ImageKit path: ${category.image}`);
                    skippedCount++;
                    continue;
                }

                const imagePath = path.join(UPLOAD_DIRS.categories, category.image);
                
                // Check if file exists
                if (!fsSync.existsSync(imagePath)) {
                    logger.warn(`Image file not found for category ${category.id} (${category.name})`);
                    logger.warn(`Expected path: ${imagePath}`);
                    logger.warn(`Stored filename: ${category.image}`);
                    failureCount++;
                    continue;
                }

                logger.info(`Reading file for category ${category.id} (${category.name}): ${imagePath}`);
                
                // Read file
                const fileBuffer = await fs.readFile(imagePath);
                logger.info(`File read successfully, size: ${fileBuffer.length} bytes`);
                
                // Upload to ImageKit
                logger.info(`Uploading to ImageKit for category ${category.id}...`);
                const uploadResult = await imagekitService.uploadImage(
                    fileBuffer,
                    `category-${category.id}-${Date.now()}.webp`,
                    IMAGEKIT_FOLDERS.categories
                );

                if (!uploadResult.success) {
                    throw new Error('Upload failed');
                }

                logger.info(`Upload successful. ImageKit path: ${uploadResult.filePath}`);

                // Update database with ImageKit path
                await category.update({
                    image: uploadResult.filePath
                });

                logger.info(`✓ Migrated category ${category.id}: ${category.name} to ${uploadResult.filePath}`);
                successCount++;

            } catch (error) {
                logger.error(`✗ Failed to migrate category ${category.id} (${category.name}):`, error.message);
                logger.error(`Stack: ${error.stack}`);
                failureCount++;
            }
        }

        logger.info(`Category migration completed: ${successCount} success, ${failureCount} failed, ${skippedCount} skipped`);
        return { successCount, failureCount, skippedCount };

    } catch (error) {
        logger.error('Category migration error:', error);
        throw error;
    }
}

/**
 * Migrate slider images to ImageKit
 */
async function migrateSliderImages() {
    try {
        logger.info('Starting slider image migration...');
        
        const sliders = await Slider.findAll({
            where: {
                image: { [require('sequelize').Op.not]: null }
            }
        });

        logger.info(`Found ${sliders.length} sliders with images`);

        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;

        for (const slider of sliders) {
            try {
                // Check if image is already an ImageKit path
                if (slider.image.startsWith('/')) {
                    logger.info(`Slider ${slider.id} (${slider.title}) already has ImageKit path: ${slider.image}`);
                    skippedCount++;
                    continue;
                }

                const imagePath = path.join(UPLOAD_DIRS.sliders, slider.image);
                
                // Check if file exists
                if (!fsSync.existsSync(imagePath)) {
                    logger.warn(`Image file not found for slider ${slider.id} (${slider.title})`);
                    logger.warn(`Expected path: ${imagePath}`);
                    logger.warn(`Stored filename: ${slider.image}`);
                    failureCount++;
                    continue;
                }

                logger.info(`Reading file for slider ${slider.id} (${slider.title}): ${imagePath}`);
                
                // Read file
                const fileBuffer = await fs.readFile(imagePath);
                logger.info(`File read successfully, size: ${fileBuffer.length} bytes`);
                
                // Upload to ImageKit
                logger.info(`Uploading to ImageKit for slider ${slider.id}...`);
                const uploadResult = await imagekitService.uploadImage(
                    fileBuffer,
                    `slider-${slider.id}-${Date.now()}.webp`,
                    IMAGEKIT_FOLDERS.sliders
                );

                if (!uploadResult.success) {
                    throw new Error('Upload failed');
                }

                logger.info(`Upload successful. ImageKit path: ${uploadResult.filePath}`);

                // Update database with ImageKit path
                await slider.update({
                    image: uploadResult.filePath
                });

                logger.info(`✓ Migrated slider ${slider.id}: ${slider.title} to ${uploadResult.filePath}`);
                successCount++;

            } catch (error) {
                logger.error(`✗ Failed to migrate slider ${slider.id} (${slider.title}):`, error.message);
                logger.error(`Stack: ${error.stack}`);
                failureCount++;
            }
        }

        logger.info(`Slider migration completed: ${successCount} success, ${failureCount} failed, ${skippedCount} skipped`);
        return { successCount, failureCount, skippedCount };

    } catch (error) {
        logger.error('Slider migration error:', error);
        throw error;
    }
}

/**
 * Run all migrations
 */
async function runMigrations() {
    try {
        logger.info('='.repeat(50));
        logger.info('Starting ImageKit Migration');
        logger.info('='.repeat(50));

        const categoryResults = await migrateCategoryImages();
        const sliderResults = await migrateSliderImages();

        logger.info('='.repeat(50));
        logger.info('Migration Summary:');
        logger.info(`Categories: ${categoryResults.successCount} success, ${categoryResults.failureCount} failed`);
        logger.info(`Sliders: ${sliderResults.successCount} success, ${sliderResults.failureCount} failed`);
        logger.info('='.repeat(50));

        return {
            categories: categoryResults,
            sliders: sliderResults
        };

    } catch (error) {
        logger.error('Migration failed:', error);
        throw error;
    }
}

module.exports = { runMigrations, migrateCategoryImages, migrateSliderImages };

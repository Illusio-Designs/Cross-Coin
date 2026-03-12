const fs = require('fs');
const path = require('path');
const imagekitService = require('../services/imagekitService');
const { ProductImage } = require('../model/associations.js');

async function migrateImagesToImageKit() {
  try {
    console.log('🔄 Starting automatic image migration to ImageKit...');

    // Get all product images from database that haven't been migrated yet
    const images = await ProductImage.findAll({
      where: {
        image_url: {
          [require('sequelize').Op.notLike]: 'https://%'
        }
      }
    });

    if (images.length === 0) {
      console.log('✅ All images already migrated to ImageKit');
      return;
    }

    console.log(`📦 Found ${images.length} images to migrate`);

    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (const image of images) {
      try {
        // Skip if already migrated
        if (image.image_url.startsWith('https://')) {
          skippedCount++;
          continue;
        }

        // Read image from local storage
        // Handle both single and double 'uploads' in path
        let imagePath = image.image_url;
        if (imagePath.startsWith('uploads/uploads/')) {
          imagePath = imagePath.replace('uploads/uploads/', 'uploads/');
        }
        
        const localPath = path.join(__dirname, '../', imagePath);
        
        if (!fs.existsSync(localPath)) {
          console.warn(`⚠️  File not found: ${localPath}`);
          failureCount++;
          continue;
        }

        const fileBuffer = fs.readFileSync(localPath);
        const fileName = path.basename(image.image_url);

        // Upload to ImageKit
        const uploadResult = await imagekitService.uploadImage(
          fileBuffer,
          fileName,
          '/products'
        );

        // Update database with ImageKit path
        // Also fix the double 'uploads' issue in the database
        let dbImageUrl = image.image_url;
        if (dbImageUrl.startsWith('uploads/uploads/')) {
          dbImageUrl = dbImageUrl.replace('uploads/uploads/', 'uploads/');
        }
        
        await image.update({
          image_url: uploadResult.filePath,
        });

        successCount++;
        console.log(`✅ Migrated: ${fileName}`);
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to migrate ${image.image_url}:`, error.message);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`✅ Success: ${successCount}`);
    console.log(`⚠️  Failed: ${failureCount}`);
    console.log(`⏭️  Skipped: ${skippedCount}`);
    console.log(`\n🎉 Migration complete!`);
  } catch (error) {
    console.error('❌ Migration error:', error);
  }
}

module.exports = migrateImagesToImageKit;

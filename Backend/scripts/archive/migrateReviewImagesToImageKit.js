require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { ReviewImage } = require('../../model/reviewImageModel');
const imagekitService = require('../../services/imagekitService');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const { sequelize } = require('../../config/db');
  await sequelize.authenticate();

  const images = await ReviewImage.findAll({
    where: { fileName: { [require('sequelize').Op.and]: [
      { [require('sequelize').Op.notLike]: '%ik.imagekit.io%' },
      { [require('sequelize').Op.notLike]: '/reviews/%' }
    ]}}
  });

  console.log(`Found ${images.length} review images to migrate`);
  let success = 0, skipped = 0, failed = 0;

  for (const image of images) {
    const localPath = path.join(__dirname, '../uploads/reviews', image.fileName);
    if (!fs.existsSync(localPath)) {
      console.warn(`⚠️ File not found for ReviewImage ${image.id}: ${localPath}`);
      skipped++;
      continue;
    }
    try {
      const buffer = fs.readFileSync(localPath);
      const result = await imagekitService.uploadImage(buffer, image.fileName, '/reviews');
      await image.update({ fileName: result.filePath });
      console.log(`✅ Migrated ReviewImage ${image.id}: ${result.filePath}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed ReviewImage ${image.id}:`, err.message);
      failed++;
    }
  }

  console.log(`\nDone: ${success} migrated, ${skipped} skipped, ${failed} failed`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { User } = require('../../model/userModel');
const imagekitService = require('../../services/imagekitService');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const { sequelize } = require('../../config/db');
  await sequelize.authenticate();
  
  const users = await User.findAll({
    where: { profileImage: { [require('sequelize').Op.and]: [
      { [require('sequelize').Op.not]: null },
      { [require('sequelize').Op.notLike]: '%ik.imagekit.io%' },
      { [require('sequelize').Op.notLike]: '/profiles/%' }
    ]}}
  });
  
  console.log(`Found ${users.length} users to migrate`);
  let success = 0, skipped = 0, failed = 0;
  
  for (const user of users) {
    const localPath = path.join(__dirname, '../uploads/users', user.profileImage);
    if (!fs.existsSync(localPath)) {
      console.warn(`⚠️ File not found for user ${user.id}: ${localPath}`);
      skipped++;
      continue;
    }
    try {
      const buffer = fs.readFileSync(localPath);
      const result = await imagekitService.uploadImage(buffer, user.profileImage, '/profiles');
      await user.update({ profileImage: result.filePath });
      console.log(`✅ Migrated user ${user.id}: ${result.filePath}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed user ${user.id}:`, err.message);
      failed++;
    }
  }
  
  console.log(`\nDone: ${success} migrated, ${skipped} skipped, ${failed} failed`);
  process.exit(0);
}

migrate().catch(err => { console.error(err); process.exit(1); });

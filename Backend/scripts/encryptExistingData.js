require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const path = require('path');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

const { ShippingAddress } = require('../model/shippingAddressModel');
const { GuestUser } = require('../model/guestUserModel');
const { BrandSetting } = require('../model/brandSettingModel');
const { isEncrypted } = require('../utils/encryption');

const BATCH_SIZE = 500;

async function encryptShippingPhones() {
  let lastId = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const batch = await ShippingAddress.findAll({
      where: {
        id: { [Op.gt]: lastId },
        phone: { [Op.ne]: null },
      },
      order: [['id', 'ASC']],
      limit: BATCH_SIZE,
    });

    if (!batch.length) break;

    for (const addr of batch) {
      scanned++;
      const rawPhone = addr.getDataValue('phone');
      if (!rawPhone) continue;

      if (isEncrypted(rawPhone)) {
        skipped++;
        continue;
      }

      // Assigning the plaintext back triggers the model setter to encrypt.
      addr.phone = rawPhone;
      await addr.save();
      updated++;
    }

    lastId = batch[batch.length - 1].id;
    console.log(`ShippingAddress: scanned=${scanned}, updated=${updated}, skipped=${skipped}`);
  }

  console.log(`ShippingAddress encryption done: updated=${updated}, skipped=${skipped}, scanned=${scanned}`);
}

async function encryptGuestPhones() {
  let lastId = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const batch = await GuestUser.findAll({
      where: {
        id: { [Op.gt]: lastId },
        phone: { [Op.ne]: null },
      },
      order: [['id', 'ASC']],
      limit: BATCH_SIZE,
    });

    if (!batch.length) break;

    for (const guest of batch) {
      scanned++;
      const rawPhone = guest.getDataValue('phone');
      if (!rawPhone) continue;

      if (isEncrypted(rawPhone)) {
        skipped++;
        continue;
      }

      guest.phone = rawPhone;
      await guest.save();
      updated++;
    }

    lastId = batch[batch.length - 1].id;
    console.log(`GuestUser: scanned=${scanned}, updated=${updated}, skipped=${skipped}`);
  }

  console.log(`GuestUser encryption done: updated=${updated}, skipped=${skipped}, scanned=${scanned}`);
}

async function encryptBrandSettings() {
  let lastId = 0;
  let scanned = 0;
  let updated = 0;
  let skipped = 0;

  while (true) {
    const batch = await BrandSetting.findAll({
      where: {
        id: { [Op.gt]: lastId },
        is_encrypted: true,
        value: { [Op.ne]: null },
      },
      order: [['id', 'ASC']],
      limit: BATCH_SIZE,
    });

    if (!batch.length) break;

    for (const setting of batch) {
      scanned++;
      const rawValue = setting.getDataValue('value');
      if (!rawValue) continue;

      if (isEncrypted(rawValue)) {
        skipped++;
        continue;
      }

      // Assigning plaintext triggers the `beforeSave` hook to encrypt.
      setting.value = rawValue;
      await setting.save();
      updated++;
    }

    lastId = batch[batch.length - 1].id;
    console.log(`BrandSetting: scanned=${scanned}, updated=${updated}, skipped=${skipped}`);
  }

  console.log(`BrandSetting encryption done: updated=${updated}, skipped=${skipped}, scanned=${scanned}`);
}

async function main() {
  console.log(`Running encryptExistingData.js from: ${path.resolve(__dirname)}`);
  await sequelize.authenticate();

  await encryptShippingPhones();
  await encryptGuestPhones();
  await encryptBrandSettings();

  console.log('encryptExistingData.js completed successfully');
  process.exit(0);
}

main().catch((err) => {
  console.error('encryptExistingData.js failed:', err);
  process.exit(1);
});


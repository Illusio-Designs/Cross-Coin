/**
 * Integration test harness — sqlite::memory backed.
 *
 * Why sqlite + not Docker MySQL: we want `npm test` to work on a fresh
 * checkout with zero infrastructure. sqlite covers ~95% of Sequelize
 * behaviour; the few divergences (JSON column ops, FULLTEXT, MySQL-only
 * date functions) get mocked or skipped per test.
 *
 * Usage in a test file:
 *
 *   const { setupTestDb, teardownTestDb } = require('./_setup.js');
 *   beforeAll(setupTestDb);
 *   afterAll(teardownTestDb);
 *
 * Exposes:
 *   - sequelize    — the Sequelize instance bound to sqlite::memory
 *   - models       — every loaded model, by name
 *   - resetTables  — drop + recreate every table between tests
 */

const { Sequelize, DataTypes } = require('sequelize');
const path = require('path');
const fs = require('fs');

let sequelize = null;
const models = {};

async function setupTestDb() {
  // Use a NEW sequelize bound to sqlite, not the production one. We
  // intentionally don't call config/db.js because that wires to MySQL.
  sequelize = new Sequelize('sqlite::memory:', {
    logging: false,
    dialect: 'sqlite',
  });

  // Patch the production sequelize export so any model file that does
  // `require('../config/db.js').sequelize` picks up our test instance.
  // This is the trick that lets us reuse the real model definitions
  // unchanged.
  const dbConfig = require('../../config/db.js');
  dbConfig.sequelize = sequelize;
  // Some places destructure { sequelize } at require time; reassigning
  // the property handles that.

  // Best-effort: load every model file. Errors from MySQL-specific
  // definitions are caught and logged; the affected tests will fail
  // explicitly if they touch those models.
  const modelDir = path.join(__dirname, '..', '..', 'model');
  const modelFiles = fs.readdirSync(modelDir).filter((f) => f.endsWith('Model.js'));

  for (const file of modelFiles) {
    try {
      const mod = require(path.join(modelDir, file));
      const candidate = mod && typeof mod === 'object' ? mod : null;
      if (!candidate) continue;
      for (const [name, value] of Object.entries(candidate)) {
        if (value && typeof value.sync === 'function') {
          models[name] = value;
        }
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[test-setup] skipping ${file}: ${err.message}`);
    }
  }

  await sequelize.sync({ force: true });
  return { sequelize, models };
}

async function teardownTestDb() {
  if (sequelize) {
    try { await sequelize.close(); } catch { /* ignore */ }
    sequelize = null;
  }
}

async function resetTables() {
  if (!sequelize) return;
  await sequelize.sync({ force: true });
}

module.exports = {
  setupTestDb,
  teardownTestDb,
  resetTables,
  get sequelize() { return sequelize; },
  models,
};

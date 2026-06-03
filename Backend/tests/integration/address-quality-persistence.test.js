/**
 * Integration test: address quality score persistence end-to-end.
 *
 * Verifies that:
 *   1. AddressQualityScore.upsert() works against a real Sequelize
 *      backend (sqlite-memory, with the same model as production)
 *   2. The composite address_hash + pincode index keeps rows unique
 *   3. delivery_success_count / delivery_failure_count increments via
 *      Sequelize .increment() actually update the row
 *
 * This is the smallest meaningful integration test — it exercises a
 * full request-equivalent path: model -> sequelize -> sqlite. Adding
 * more tests follows the same pattern.
 */

jest.mock('../../config/logging.js', () => ({
  logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn(), debug: jest.fn() },
}));

const crypto = require('crypto');
const { setupTestDb, teardownTestDb, resetTables, models } = require('./_setup.js');

function hashOf(parts) {
  return crypto.createHash('sha256').update(parts.join('|').toLowerCase()).digest('hex');
}

describe('AddressQualityScore — persistence (sqlite-memory)', () => {
  let AddressQualityScore;

  beforeAll(async () => {
    await setupTestDb();
    AddressQualityScore = models.AddressQualityScore;
    if (!AddressQualityScore) {
      throw new Error('AddressQualityScore model not loaded — check Backend/model/addressQualityScoreModel.js');
    }
  });

  afterAll(teardownTestDb);
  beforeEach(resetTables);

  test('upsert inserts a new row with quality_score', async () => {
    const hash = hashOf(['mg road', 'koramangala', 'bangalore', 'karnataka', '560034']);
    await AddressQualityScore.upsert({
      address_hash: hash,
      pincode: '560034',
      quality_score: 78,
    });

    const row = await AddressQualityScore.findOne({ where: { address_hash: hash } });
    expect(row).not.toBeNull();
    expect(row.quality_score).toBe(78);
    expect(row.pincode).toBe('560034');
    expect(row.delivery_success_count).toBe(0);
    expect(row.delivery_failure_count).toBe(0);
  });

  test('upsert with same address_hash updates rather than duplicates', async () => {
    const hash = hashOf(['mg road', '', 'bangalore', 'karnataka', '560034']);
    await AddressQualityScore.upsert({ address_hash: hash, pincode: '560034', quality_score: 65 });
    await AddressQualityScore.upsert({ address_hash: hash, pincode: '560034', quality_score: 85 });

    const rows = await AddressQualityScore.findAll({ where: { address_hash: hash } });
    expect(rows).toHaveLength(1);
    expect(rows[0].quality_score).toBe(85);
  });

  test('increment delivery_success_count via Sequelize .increment()', async () => {
    const hash = hashOf(['hsr layout', '', 'bangalore', 'karnataka', '560102']);
    await AddressQualityScore.upsert({ address_hash: hash, pincode: '560102', quality_score: 80 });

    await AddressQualityScore.increment('delivery_success_count', { where: { address_hash: hash } });
    await AddressQualityScore.increment('delivery_success_count', { where: { address_hash: hash } });
    await AddressQualityScore.increment('delivery_failure_count', { where: { address_hash: hash } });

    const row = await AddressQualityScore.findOne({ where: { address_hash: hash } });
    expect(row.delivery_success_count).toBe(2);
    expect(row.delivery_failure_count).toBe(1);
  });
});

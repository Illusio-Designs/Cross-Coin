const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

let schema;
const ensureSchema = () => {
  schema ||= (async () => {
    await sequelize.query(`CREATE TABLE IF NOT EXISTS meta_brand_wallet_snapshots (
      brand_id INT NOT NULL PRIMARY KEY,
      amount DECIMAL(14,2) NOT NULL,
      currency CHAR(3) NOT NULL,
      recorded_at DATETIME NOT NULL,
      recorded_by INT NOT NULL
    ) ENGINE=InnoDB`);
  })().catch((error) => { schema = null; throw error; });
  return schema;
};

function parseBrandId(value) {
  if (value == null || value === '') return null;
  if (!['number', 'string'].includes(typeof value) || !/^\d+$/.test(String(value)) ||
      !Number.isSafeInteger(Number(value)) || Number(value) <= 0 || Number(value) > 2147483647) {
    throw Object.assign(new Error('Choose a valid brand.'), { status: 400 });
  }
  return Number(value);
}

function snapshot(row) {
  return {
    amount: row?.amount == null ? null : Number(row.amount),
    currency: row?.currency || 'INR',
    recordedAt: row?.recorded_at ? new Date(row.recorded_at).toISOString() : null,
  };
}

async function listBalances(brandId) {
  const selectedBrand = parseBrandId(brandId);
  await ensureSchema();
  const brands = await sequelize.query(`SELECT b.id, COALESCE(b.display_name, b.name) AS brand_name, w.amount, w.currency, w.recorded_at
      FROM brands b LEFT JOIN meta_brand_wallet_snapshots w ON w.brand_id = b.id
      WHERE b.status = 'active' AND (:brandId IS NULL OR b.id = :brandId) ORDER BY b.id`,
  { replacements: { brandId: selectedBrand }, type: QueryTypes.SELECT });
  return brands.map((brand) => ({
    provider: 'meta', brandId: Number(brand.id), brandName: brand.brand_name, ...snapshot(brand),
  }));
}

async function listWalletMonitor(brandId) {
  const balances = await listBalances(brandId);
  if (!balances.length) return balances;
  const spend = await require('./metaAdsService.js').getRecentDailySpend(parseBrandId(brandId)).catch((error) => {
    require('../config/logging.js').logger.warn('Meta wallet monitor could not load cached ad spend', { message: error.message });
    return [];
  });
  const byBrandCurrency = new Map(spend.map((row) => [`${row.brand_id}:${row.currency}`, Number(row.daily_spend)]));
  return balances.map((entry) => ({
    ...entry, dailySpend: byBrandCurrency.get(`${entry.brandId}:${entry.currency}`) ?? null,
  }));
}

async function saveBalance({ provider, amount, currency, brandId }, actorId) {
  const value = String(amount ?? '').trim();
  const selectedBrand = provider === 'meta' ? parseBrandId(brandId) : null;
  if (!selectedBrand
      || !/^\d{1,12}(?:\.\d{1,2})?$/.test(value)
      || !['INR', 'USD', 'EUR'].includes(currency)
      || !Number.isSafeInteger(Number(actorId)) || Number(actorId) <= 0) {
    throw Object.assign(new Error('Choose a Meta brand and enter a valid balance and currency.'), { status: 400 });
  }
  await ensureSchema();
  const active = await sequelize.query("SELECT id FROM brands WHERE id = :brandId AND status = 'active'", {
    replacements: { brandId: selectedBrand }, type: QueryTypes.SELECT,
  });
  if (!active.length) throw Object.assign(new Error('Choose an active Meta brand.'), { status: 400 });
  await sequelize.query(`INSERT INTO meta_brand_wallet_snapshots (brand_id, amount, currency, recorded_at, recorded_by)
    VALUES (:identity, :value, :currency, UTC_TIMESTAMP(), :actorId)
    ON DUPLICATE KEY UPDATE amount = VALUES(amount), currency = VALUES(currency),
      recorded_at = VALUES(recorded_at), recorded_by = VALUES(recorded_by)`,
  { replacements: { identity: selectedBrand, value, currency, actorId } });
}

module.exports = { listBalances, listWalletMonitor, saveBalance };

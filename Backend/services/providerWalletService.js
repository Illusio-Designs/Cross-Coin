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
    await sequelize.query(`CREATE TABLE IF NOT EXISTS meta_wallet_account_sync (
      brand_id INT NOT NULL,
      account_id VARCHAR(32) NOT NULL,
      amount DECIMAL(14,2) NULL,
      currency CHAR(3) NULL,
      synced_at DATETIME(3) NULL,
      checked_at DATETIME(3) NOT NULL,
      status VARCHAR(16) NOT NULL,
      PRIMARY KEY (brand_id, account_id)
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
  const brands = await sequelize.query(`SELECT b.id, COALESCE(b.display_name, b.name) AS brand_name, w.amount, w.currency, w.recorded_at,
      s.amount AS synced_amount, s.currency AS synced_currency, s.synced_at, s.checked_at, s.status AS sync_status
      FROM brands b LEFT JOIN meta_brand_wallet_snapshots w ON w.brand_id = b.id
      LEFT JOIN brand_settings m ON m.brand_id = b.id AND m.\`key\` = 'META_AD_ACCOUNT_ID'
      LEFT JOIN meta_wallet_account_sync s ON s.brand_id = b.id
        AND BINARY LOWER(TRIM(m.value)) IN (BINARY s.account_id, BINARY CONCAT('act_', s.account_id))
      WHERE b.status = 'active' AND (:brandId IS NULL OR b.id = :brandId) ORDER BY b.id`,
  { replacements: { brandId: selectedBrand }, type: QueryTypes.SELECT });
  return brands.map((brand) => {
    const syncedAt = brand.synced_at && new Date(brand.synced_at);
    // Manual snapshots store whole seconds. Prefer the manual entry in a tie.
    const synced = syncedAt && (!brand.recorded_at
      || Math.floor(syncedAt.getTime() / 1000) * 1000 > new Date(brand.recorded_at).getTime());
    const balance = synced
      ? { amount: Number(brand.synced_amount), currency: brand.synced_currency, recordedAt: syncedAt.toISOString() }
      : snapshot(brand);
    return {
      provider: 'meta', brandId: Number(brand.id), brandName: brand.brand_name, ...balance,
      source: synced ? 'meta' : brand.recorded_at ? 'manual' : null,
      syncStatus: brand.sync_status || null,
      checkedAt: brand.checked_at ? new Date(brand.checked_at).toISOString() : null,
    };
  });
}

async function recordWalletCheck({ brandId, accountId, checkedAt, status, funds }) {
  await ensureSchema();
  const amount = funds?.amount ?? null;
  const currency = amount == null ? null : funds.currency;
  await sequelize.query(`INSERT INTO meta_wallet_account_sync
      (brand_id, account_id, amount, currency, synced_at, checked_at, status)
    VALUES (:brandId, :accountId, :amount, :currency, :syncedAt, :checkedAt, :status)
    ON DUPLICATE KEY UPDATE
      amount = IF(VALUES(synced_at) IS NOT NULL AND (synced_at IS NULL OR VALUES(synced_at) >= synced_at), VALUES(amount), amount),
      currency = IF(VALUES(synced_at) IS NOT NULL AND (synced_at IS NULL OR VALUES(synced_at) >= synced_at), VALUES(currency), currency),
      synced_at = COALESCE(GREATEST(synced_at, VALUES(synced_at)), synced_at, VALUES(synced_at)),
      status = IF(VALUES(checked_at) >= checked_at, VALUES(status), status),
      checked_at = GREATEST(checked_at, VALUES(checked_at))`,
  { replacements: { brandId, accountId, amount, currency, checkedAt, syncedAt: amount == null ? null : checkedAt, status } });
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

async function checkWalletFunds(brandId) {
  const selectedBrand = parseBrandId(brandId);
  if (!selectedBrand) throw Object.assign(new Error('Choose a valid brand.'), { status: 400 });
  return require('./metaAdsService.js').getPrepaidFundingDisplay(selectedBrand);
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

module.exports = { listBalances, listWalletMonitor, checkWalletFunds, recordWalletCheck, saveBalance };

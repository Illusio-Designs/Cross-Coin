const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

const PROVIDERS = ['meta', 'ithink'];
let schema;
const ensureSchema = () => {
  schema ||= sequelize.query(`CREATE TABLE IF NOT EXISTS provider_wallet_snapshots (
    provider VARCHAR(16) NOT NULL PRIMARY KEY,
    amount DECIMAL(14,2) NOT NULL,
    currency CHAR(3) NOT NULL,
    recorded_at DATETIME NOT NULL,
    recorded_by INT NOT NULL
  ) ENGINE=InnoDB`).catch((error) => { schema = null; throw error; });
  return schema;
};

async function listBalances() {
  await ensureSchema();
  const rows = await sequelize.query('SELECT provider, amount, currency, recorded_at FROM provider_wallet_snapshots', { type: QueryTypes.SELECT });
  return PROVIDERS.map((provider) => {
    const row = rows.find((entry) => entry.provider === provider);
    return { provider, amount: row ? Number(row.amount) : null, currency: row?.currency || 'INR',
      recordedAt: row?.recorded_at ? new Date(row.recorded_at).toISOString() : null };
  });
}

async function saveBalance({ provider, amount, currency }, actorId) {
  const value = String(amount ?? '').trim();
  if (!PROVIDERS.includes(provider) || !/^\d{1,12}(?:\.\d{1,2})?$/.test(value)
      || !(provider === 'ithink' ? currency === 'INR' : ['INR', 'USD', 'EUR'].includes(currency))
      || !Number.isSafeInteger(Number(actorId)) || Number(actorId) <= 0) {
    throw Object.assign(new Error('Enter a valid wallet balance and currency.'), { status: 400 });
  }
  await ensureSchema();
  await sequelize.query(`INSERT INTO provider_wallet_snapshots (provider, amount, currency, recorded_at, recorded_by)
    VALUES (:provider, :value, :currency, UTC_TIMESTAMP(), :actorId)
    ON DUPLICATE KEY UPDATE amount = VALUES(amount), currency = VALUES(currency),
      recorded_at = VALUES(recorded_at), recorded_by = VALUES(recorded_by)`,
  { replacements: { provider, value, currency, actorId } });
  return listBalances();
}

module.exports = { listBalances, saveBalance };

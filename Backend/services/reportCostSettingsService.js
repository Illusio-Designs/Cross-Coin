const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');

let schema;
function ensureSchema() {
  if (!schema) {
    schema = sequelize.query(`CREATE TABLE IF NOT EXISTS report_cost_settings (
      id TINYINT UNSIGNED PRIMARY KEY,
      shipping DECIMAL(12,2) NOT NULL,
      service DECIMAL(12,2) NOT NULL,
      gateway_pct DECIMAL(5,2) NOT NULL,
      cod_pct DECIMAL(5,2) NOT NULL
    )`).catch((error) => { schema = null; throw error; });
  }
  return schema;
}

function validateRates(input = {}) {
  const rates = {};
  for (const [key, max] of Object.entries({ shipping: 9999999999.99, service: 9999999999.99, gatewayPct: 100, codPct: 100 })) {
    const raw = input?.[key];
    if (!['string', 'number'].includes(typeof raw) || !/^\d+(\.\d{1,2})?$/.test(String(raw).trim())) return null;
    const value = Number(raw);
    if (value > max) return null;
    rates[key] = value;
  }
  return rates;
}

async function readRates() {
  await ensureSchema();
  const [row] = await sequelize.query(
    'SELECT shipping, service, gateway_pct AS gatewayPct, cod_pct AS codPct FROM report_cost_settings WHERE id = 1',
    { type: QueryTypes.SELECT },
  );
  return row ? validateRates(row) : null;
}

async function saveRates(rates) {
  await ensureSchema();
  await sequelize.query(`INSERT INTO report_cost_settings (id, shipping, service, gateway_pct, cod_pct)
    VALUES (1, :shipping, :service, :gatewayPct, :codPct)
    ON DUPLICATE KEY UPDATE shipping = VALUES(shipping), service = VALUES(service),
      gateway_pct = VALUES(gateway_pct), cod_pct = VALUES(cod_pct)`, { replacements: rates });
  return rates;
}

module.exports = { readRates, saveRates, validateRates };

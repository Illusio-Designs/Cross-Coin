'use strict';

const { logger } = require('../config/logging.js');

// Collect external effects while saving, then schedule them only after the
// managed transaction promise resolves. A later event-loop turn is not proof
// of commit, and commit failures must discard all collected work.
async function committedTransaction(sequelize, work) {
  const effects = [];
  const result = await sequelize.transaction((transaction) => work(transaction, (label, task) => {
    effects.push({ label, task });
  }));
  for (const { label, task } of effects) {
    setImmediate(async () => {
      try { await task(); }
      catch (error) { logger.warn(`[afterCommit] ${label} failed: ${error.message}`); }
    });
  }
  return result;
}

module.exports = { committedTransaction };

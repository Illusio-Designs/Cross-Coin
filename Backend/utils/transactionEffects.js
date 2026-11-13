'use strict';

const { setImmediate } = require('timers');
const { logger } = require('../config/logging.js');
const pending = new WeakMap();

// For shipping's explicitly-owned transactions. Every owner must finish through
// commitTransaction/rollbackTransaction, including nested courier selection.
// Do not use Sequelize 6's afterCommit hook: it also runs on a failed COMMIT.
function deferTransactionEffect(transaction, label, task) {
  if (!transaction || transaction.finished) throw new Error('An active transaction is required for deferred shipping effects');
  if (!pending.has(transaction)) pending.set(transaction, []);
  pending.get(transaction).push({ label, task });
}

async function commitTransaction(transaction) {
  try { await transaction.commit(); }
  catch (error) { pending.delete(transaction); throw error; }
  const effects = pending.get(transaction) || [];
  pending.delete(transaction);
  for (const { label, task } of effects) {
    setImmediate(async () => {
      try { await task(); }
      catch (error) { logger.warn(`[shipping afterCommit] ${label} failed: ${error.message}`); }
    });
  }
}

async function rollbackTransaction(transaction) {
  pending.delete(transaction);
  // A rejected Sequelize COMMIT may already have closed the connection and
  // marked the transaction finished. Preserve that original failure.
  if (!transaction.finished) await transaction.rollback();
}

module.exports = { deferTransactionEffect, commitTransaction, rollbackTransaction };

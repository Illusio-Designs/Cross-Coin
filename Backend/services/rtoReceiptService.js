'use strict';

const { QueryTypes, Transaction } = require('sequelize');
const { sequelize } = require('../config/db.js');

const RECEIPT_ACTION = 'verify_rto_receipt';

function receiptSql(order) {
  const delivered = `(${order}.status = 'rto delivered' OR (${order}.status = 'returned_rto' AND NOT EXISTS (
    SELECT 1 FROM returns r WHERE r.order_id = ${order}.id
  )))`;
  const verifiedAt = `(SELECT MAX(a.created_at) FROM order_audit_logs a
    WHERE a.order_id = ${order}.id AND a.action = '${RECEIPT_ACTION}')`;
  return {
    delivered,
    all: `(${order}.status = 'rto' OR ${delivered})`,
    verifiedAt,
    pending: `(${delivered} AND ${verifiedAt} IS NULL)`,
    verified: `(${delivered} AND ${verifiedAt} IS NOT NULL)`,
  };
}

async function verifyRtoReceipt(orderId, staffId) {
  const { auditLog } = require('./orderService.js');
  const receipt = receiptSql('o');
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
    const [order] = await sequelize.query(
      `SELECT o.id, o.status, ${receipt.delivered} AS eligible
         FROM orders o WHERE o.id = :orderId FOR UPDATE`,
      { replacements: { orderId }, transaction, type: QueryTypes.SELECT }
    );
    if (!order) return { status: 'missing' };
    if (!Number(order.eligible)) return { status: 'ineligible' };

    const readVerification = async () => {
      const [result] = await sequelize.query(
        `SELECT created_at FROM order_audit_logs WHERE order_id = :orderId AND action = :action
          ORDER BY id DESC LIMIT 1`,
        { replacements: { orderId, action: RECEIPT_ACTION }, transaction, type: QueryTypes.SELECT }
      );
      return result?.created_at;
    };
    const verifiedAt = await readVerification();
    if (verifiedAt) return { status: 'verified', verifiedAt };

    await auditLog(orderId, RECEIPT_ACTION, staffId, 'admin', { courier_status: order.status }, transaction);
    return { status: 'verified', verifiedAt: await readVerification() };
  });
}

module.exports = { receiptSql, verifyRtoReceipt };

// Returns & Refunds controller.
// Consumer: create a return request (with photos), list/view own returns.
// Admin (order manager): list, review, approve (part/full refund), reject, upload payout proof.
// Refunds flow through the existing refundService (prepaid → Razorpay auto);
// COD/manual refunds require an uploaded payout proof and are recorded here.
const fs = require('fs');
const { logger } = require('../config/logging.js');
const { Return, Order, User, Payment, OrderStatusHistory } = require('../model/associations.js');
const imagekitService = require('../services/imagekitService.js');
const settingsHelper = require('../services/settingsHelper.js');
const refundService = require('../services/refundService.js');

const VALID_REASONS = ['damaged', 'defective', 'wrong', 'notdesc', 'changed', 'other'];
const REASONS_NEED_PHOTO = ['damaged', 'defective', 'wrong', 'notdesc'];
// Returns are always refunded (no exchanges): prepaid → original payment
// method, COD → UPI payout. Old 'exchange' rows are refunded the same way.
const OPEN_STATUSES = ['requested', 'under_review', 'approved', 'pickup_scheduled', 'picked_up', 'received'];

// ── helpers ──────────────────────────────────────────────────────────────
function genReturnNumber() {
  return 'RET-' + Date.now().toString(36).toUpperCase().slice(-6) + Math.random().toString(36).toUpperCase().slice(2, 4);
}

function photoUrls(paths) {
  try {
    return (Array.isArray(paths) ? paths : []).map((p) => ({ path: p, url: imagekitService.getOptimizedUrl(p, 'medium') }));
  } catch (e) { return (Array.isArray(paths) ? paths : []).map((p) => ({ path: p, url: p })); }
}

function proofUrl(p) {
  if (!p) return null;
  try { return imagekitService.getOptimizedUrl(p, 'large'); } catch (e) { return p; }
}

async function storeUploads(files, folder) {
  const out = [];
  for (const file of files || []) {
    try {
      const buffer = await fs.promises.readFile(file.path);
      const r = await imagekitService.uploadImage(buffer, file.filename, folder);
      out.push(r && r.filePath ? r.filePath : file.filename);
    } catch (e) {
      logger.warn(`return upload to ${folder} failed, keeping local: ${e.message}`);
      out.push(file.filename);
    } finally {
      fs.unlink(file.path, () => {});
    }
  }
  return out;
}

async function getDeliveredAt(orderId) {
  const row = await OrderStatusHistory.findOne({
    where: { order_id: orderId, status: 'delivered' },
    order: [['created_at', 'DESC']],
  });
  return row ? row.created_at : null;
}

async function getWindowDays(brandId) {
  const raw = await settingsHelper.getSetting(brandId, 'RETURN_WINDOW_DAYS', '7');
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 7;
}

async function notify(fnName, phone, data, brandId) {
  try {
    if (!phone) return;
    const wa = require('../services/whatsappService.js');
    if (typeof wa[fnName] === 'function') await wa[fnName](phone, data, brandId);
  } catch (e) { logger.warn(`return whatsapp ${fnName} skipped: ${e.message}`); }
}

// Book a reverse (return) pickup with the courier. Fail-soft: any problem is
// logged and the admin can arrange pickup manually. Returns the AWB or null.
async function bookReversePickup(ret, order, brandId) {
  try {
    const flag = String(await settingsHelper.getSetting(brandId, 'RETURN_AUTO_PICKUP', 'true')).toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'no') return null;
    if (ret.pickup_awb) return ret.pickup_awb; // already booked

    // Which courier handles reverse pickups for this brand. Explicit by design:
    // if unset, we never guess a courier — the admin arranges pickup manually.
    const reverseLogistics = await settingsHelper.getSetting(brandId, 'ITHINK_REVERSE_LOGISTICS', null);
    if (!reverseLogistics) {
      logger.info(`reverse pickup skipped for ${ret.return_number}: set ITHINK_REVERSE_LOGISTICS to enable auto pickup`);
      return null;
    }

    // Reload the order with the associations prepareShippingOrderData needs.
    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { association: 'User' },
        { association: 'GuestUser' },
        { association: 'ShippingAddress' },
        { association: 'OrderItems', include: [{ association: 'Product' }, { association: 'ProductVariation' }] },
      ],
    });
    if (!fullOrder || !fullOrder.ShippingAddress) {
      logger.warn(`reverse pickup skipped for ${ret.return_number}: order/address not available`);
      return null;
    }

    // Reuse the exact forward-order assembler; createReverseOrder flips it to a
    // reverse (Prepaid) pickup from the customer back to the warehouse. The
    // reference is the return number so the reverse AWB never collides with
    // the forward order's booking.
    const { prepareShippingOrderData } = require('./orderShippingController.js');
    const orderData = await prepareShippingOrderData(fullOrder, 'ithink', reverseLogistics, 'surface');
    orderData.orderId = ret.return_number;
    orderData.payment_Mode = 2; // reverse pickups are always prepaid (2 = PREPAID)

    const factory = require('../services/shippingProviderFactory.js');
    const provider = await factory.getShippingProvider(brandId);
    const result = await provider.createReverseOrder(orderData);
    const awb = result && (result.waybill || result.awb);
    if (awb) {
      await ret.update({ pickup_provider: 'ithink', pickup_awb: String(awb), pickup_status: 'scheduled', status: 'pickup_scheduled' });
      logger.info(`reverse pickup booked for ${ret.return_number}: AWB ${awb}`);
      return String(awb);
    }
    logger.warn(`reverse pickup for ${ret.return_number} returned no AWB: ${result && result.message}`);
    return null;
  } catch (e) {
    logger.warn(`reverse pickup booking skipped for ${ret.return_number}: ${e.message}`);
    return null;
  }
}

// Put the returned goods back into stock exactly once per order. The
// rto_stock_restoration ledger is the idempotency guard (shared with RTO), so
// a double click or a retried receipt never restocks twice. Returns units.
async function restockReturn(ret, order, adminId) {
  const { sequelize } = require('../config/db.js');
  const { OrderItem } = require('../model/orderItemModel.js');
  const { ProductVariation } = require('../model/productVariationModel.js');
  return sequelize.transaction(async (t) => {
    const [[done]] = await sequelize.query(
      'SELECT COUNT(*) AS n FROM rto_stock_restoration WHERE order_id = ?',
      { replacements: [order.id], transaction: t }
    );
    if (Number(done?.n) > 0) return 0;
    const items = await OrderItem.findAll({ where: { order_id: order.id }, transaction: t });
    let units = 0;
    for (const item of items) {
      let before = 0, after = 0;
      if (item.variation_id) {
        const v = await ProductVariation.findByPk(item.variation_id, { transaction: t, lock: t.LOCK.UPDATE });
        if (v) {
          before = Number(v.stock) || 0;
          after = before + Number(item.quantity || 0);
          await v.update({ stock: after }, { transaction: t });
          units += Number(item.quantity || 0);
        }
      }
      await sequelize.query(
        `INSERT INTO rto_stock_restoration
           (order_id, order_number, product_id, variation_id, quantity_restored, stock_before, stock_after, restored_by, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        { replacements: [order.id, order.order_number, item.product_id, item.variation_id || null,
            item.quantity, before, after, `admin:${adminId}`, `Restocked on receipt of return ${ret.return_number}`], transaction: t }
      );
    }
    return units;
  });
}

// Issue the refund for a return whose parcel is back (or that the admin chose
// to refund without a pickup). Gateway payments refund automatically via
// refundService; COD/manual payouts need the proof screenshot first.
// Returns { ok, code?, message, refund? }.
async function issueReturnRefund(ret, order, adminId, brandId) {
  const { Op } = require('sequelize');
  const eligible = Number(ret.requested_amount) || Number(order.final_amount) || 0;
  const refundAmount = ret.refund_amount != null ? Number(ret.refund_amount) : eligible;

  // Gateway payments are stored as 'successful' / 'completed' (no 'paid');
  // 'refund_pending' is a paid payment whose earlier refund failed (retry).
  const payment = await Payment.findOne({ where: { order_id: order.id, status: { [Op.in]: ['successful', 'completed', 'refund_pending'] } }, order: [['createdAt', 'DESC']] });
  const isGateway = payment && (
    String(payment.transaction_id || '').startsWith('pay_')
    || String(payment.payment_gateway || '').toLowerCase() === 'customcheckout'
  );

  if (isGateway) {
    if (!['cancelled', 'return_initiated', 'returned_rto', 'rto delivered'].includes(order.status)) {
      await order.update({ status: 'return_initiated' });
    }
    const result = await refundService.processRefund({
      paymentId: payment.id,
      amount: refundAmount >= eligible ? null : refundAmount,
      reason: `Return ${ret.return_number} (${ret.reason})`,
      adminId,
      brandId,
    });
    await ret.update({ payment_id: payment.id, status: 'refunded', refunded_at: new Date() });
    await closeReturnedOrder(order, adminId, ret);
    return { ok: true, message: `Refund of ₹${refundAmount} issued to the original payment method.`, refund: result && result.refund };
  }

  if (!ret.payout_proof) {
    return { ok: false, code: 'PROOF_REQUIRED', message: 'Upload the payout proof screenshot, then press Issue refund.' };
  }
  const newPayStatus = refundAmount >= eligible ? 'refunded' : 'partial_refund';
  await order.update({ payment_status: newPayStatus });
  await OrderStatusHistory.create({
    order_id: order.id, status: order.status, updated_by: adminId,
    notes: `Manual refund ₹${refundAmount} for return ${ret.return_number} (proof on file)`,
  });
  try {
    const { auditLog } = require('../services/orderService.js');
    await auditLog(order.id, 'refund', adminId, 'admin', { return_number: ret.return_number, amount: refundAmount, manual: true });
  } catch (e) { logger.warn(`audit skipped: ${e.message}`); }
  await ret.update({ status: 'refunded', refunded_at: new Date() });
  await closeReturnedOrder(order, adminId, ret);
  const user = await User.findByPk(ret.user_id);
  notify('sendRefundProcessed', user && user.phone, {
    name: user && user.username, orderNumber: order.order_number, amount: refundAmount, paymentMethod: 'UPI/Bank',
  }, brandId);
  return { ok: true, message: `Manual refund of ₹${refundAmount} recorded.` };
}

// A fully handled return closes the order at its terminal returned state.
async function closeReturnedOrder(order, adminId, ret) {
  try {
    await order.reload();
    if (order.status === 'return_initiated') {
      await order.update({ status: 'returned_rto' });
      await OrderStatusHistory.create({
        order_id: order.id, status: 'returned_rto', updated_by: adminId,
        notes: `Return ${ret.return_number} completed`,
      });
    }
  } catch (e) { logger.warn(`closing order for ${ret.return_number} skipped: ${e.message}`); }
}

function serialize(ret) {
  const j = ret.toJSON ? ret.toJSON() : ret;
  return {
    ...j,
    requested_amount: j.requested_amount != null ? Number(j.requested_amount) : null,
    refund_amount: j.refund_amount != null ? Number(j.refund_amount) : null,
    charges_deducted: j.charges_deducted != null ? Number(j.charges_deducted) : null,
    photos: photoUrls(j.photos),
    payout_proof: proofUrl(j.payout_proof),
  };
}

// ── CONSUMER: create a return request ────────────────────────────────────
module.exports.createReturn = async (req, res) => {
  try {
    const userId = req.user.id;
    const brandId = req.brandId || null;
    const { order_id, reason, note, upi_id, payout_phone } = req.body;
    let items = req.body.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = null; } }

    if (!order_id) return res.status(400).json({ success: false, message: 'order_id is required' });
    if (!VALID_REASONS.includes(reason)) return res.status(400).json({ success: false, message: 'Invalid reason' });

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
    if (order.user_id !== userId) return res.status(403).json({ success: false, message: 'Access denied' });
    if (order.status !== 'delivered' && order.status !== 'return_initiated') {
      return res.status(400).json({ success: false, message: 'Returns can only be requested for delivered orders.' });
    }

    // 7-day window (from delivery)
    const deliveredAt = await getDeliveredAt(order.id);
    const windowDays = await getWindowDays(brandId);
    if (deliveredAt) {
      const days = (Date.now() - new Date(deliveredAt).getTime()) / 86400000;
      if (days > windowDays) {
        return res.status(400).json({ success: false, message: `The ${windowDays}-day return window for this order has closed.` });
      }
    }

    // one active return per order
    const existing = await Return.findOne({ where: { order_id: order.id, status: OPEN_STATUSES }, order: [['created_at', 'DESC']] });
    if (existing) {
      return res.status(409).json({ success: false, message: 'A return request for this order is already in progress.', return: serialize(existing) });
    }

    // photos (required for certain reasons)
    const files = req.files || [];
    if (REASONS_NEED_PHOTO.includes(reason) && files.length === 0) {
      return res.status(400).json({ success: false, message: 'Please add at least one photo for this reason.' });
    }
    // Prepaid → refunded to the original payment method. COD → paid out by
    // UPI, so the customer's UPI ID and mobile number are required.
    const isCod = order.payment_type === 'cod';
    const res_ = isCod ? 'upi' : 'original';
    const upi = String(upi_id || '').trim();
    const payoutPhone = String(payout_phone || '').replace(/\D/g, '').slice(-10);
    if (isCod && !/^[\w.\-]{2,}@[a-zA-Z][\w.\-]*$/.test(upi)) {
      return res.status(400).json({ success: false, message: 'Please enter a valid UPI ID (e.g. name@okaxis) for your refund.' });
    }
    if (isCod && !/^[6-9]\d{9}$/.test(payoutPhone)) {
      return res.status(400).json({ success: false, message: 'Please enter the 10-digit mobile number linked to your UPI.' });
    }
    const photos = await storeUploads(files.slice(0, 4), '/returns');

    // eligible amount
    let requestedAmount = 0;
    if (Array.isArray(items) && items.length) {
      requestedAmount = items.reduce((a, it) => a + (Number(it.price) || 0) * (Number(it.qty) || 1), 0);
    } else {
      requestedAmount = Number(order.final_amount) || 0;
    }

    const ret = await Return.create({
      return_number: genReturnNumber(),
      order_id: order.id,
      user_id: userId,
      brand_id: brandId,
      items: Array.isArray(items) ? items : null,
      reason,
      note: note ? String(note).slice(0, 1000) : null,
      photos,
      resolution: res_,
      upi_id: isCod ? upi.slice(0, 80) : null,
      payout_phone: isCod ? payoutPhone : null,
      status: 'requested',
      is_cod: isCod,
      requested_amount: requestedAmount,
    });

    // move the order into return_initiated (mirrors initiateReturn) + audit
    if (order.status === 'delivered') {
      await order.update({ status: 'return_initiated' });
      await OrderStatusHistory.create({
        order_id: order.id, status: 'return_initiated', updated_by: userId,
        notes: `Return ${ret.return_number} requested (${reason})`,
      });
      try {
        const { auditLog } = require('../services/orderService.js');
        await auditLog(order.id, 'return_initiated', userId, 'user', { return_number: ret.return_number, reason });
      } catch (e) { logger.warn(`audit skipped for ${ret.return_number}: ${e.message}`); }
    }

    notify('sendReturnRequested', req.user.phone, {
      name: req.user.username, orderNumber: order.order_number, returnNumber: ret.return_number,
    }, brandId);

    return res.status(201).json({ success: true, message: 'Return request submitted.', return: serialize(ret) });
  } catch (error) {
    logger.error('createReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to submit return request', error: error.message });
  }
};

// ── CONSUMER: list my returns ────────────────────────────────────────────
module.exports.getMyReturns = async (req, res) => {
  try {
    const where = { user_id: req.user.id };
    if (req.brandId) where.brand_id = req.brandId;
    const rows = await Return.findAll({
      where,
      include: [{ model: Order, as: 'Order', attributes: ['id', 'order_number', 'final_amount', 'status', 'payment_type'] }],
      order: [['created_at', 'DESC']],
      limit: 100,
    });
    return res.json({ success: true, returns: rows.map(serialize) });
  } catch (error) {
    logger.error('getMyReturns error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load returns' });
  }
};

// ── shared: get one return (owner or staff) ──────────────────────────────
module.exports.getReturn = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id, {
      include: [
        { model: Order, as: 'Order', attributes: ['id', 'order_number', 'final_amount', 'status', 'payment_type'] },
        { model: User, as: 'User', attributes: ['id', 'username', 'email', 'phone'] },
      ],
    });
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    const isStaff = req.user.role && req.user.role !== 'consumer';
    if (!isStaff && ret.user_id !== req.user.id) return res.status(403).json({ success: false, message: 'Access denied' });
    return res.json({ success: true, return: serialize(ret) });
  } catch (error) {
    logger.error('getReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load return' });
  }
};

// ── ADMIN: list returns ──────────────────────────────────────────────────
module.exports.listReturns = async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const cappedLimit = Math.min(parseInt(limit) || 20, 200);
    const offset = (parseInt(page) - 1) * cappedLimit;
    const where = {};
    if (req.brandId) where.brand_id = req.brandId;
    if (status) where.status = status;
    const { count, rows } = await Return.findAndCountAll({
      where,
      include: [
        { model: Order, as: 'Order', attributes: ['id', 'order_number', 'final_amount', 'status', 'payment_type'] },
        { model: User, as: 'User', attributes: ['id', 'username', 'email', 'phone'] },
      ],
      order: [['created_at', 'DESC']],
      limit: cappedLimit, offset,
    });
    return res.json({
      success: true,
      returns: rows.map(serialize),
      pagination: { total: count, page: parseInt(page), limit: cappedLimit, totalPages: Math.ceil(count / cappedLimit) },
    });
  } catch (error) {
    logger.error('listReturns error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load returns' });
  }
};

// ── ADMIN: upload manual payout proof ────────────────────────────────────
module.exports.uploadProof = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (!req.file) return res.status(400).json({ success: false, message: 'No proof image uploaded' });
    const [stored] = await storeUploads([req.file], '/returns');
    await ret.update({ payout_proof: stored });
    return res.json({ success: true, message: 'Proof uploaded', payout_proof: proofUrl(stored) });
  } catch (error) {
    logger.error('uploadProof error:', error);
    return res.status(500).json({ success: false, message: 'Failed to upload proof' });
  }
};

// ── ADMIN: approve — fix the refund amount and book the reverse pickup ────
// The refund is NOT issued here: money goes back only after the parcel is
// received at the warehouse and staff press Issue refund.
module.exports.approveReturn = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const ret = await Return.findByPk(req.params.id, { include: [{ model: Order, as: 'Order' }] });
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (ret.status === 'refunded') return res.status(400).json({ success: false, message: 'This return is already refunded.' });
    if (ret.status === 'rejected') return res.status(400).json({ success: false, message: 'This return was rejected.' });

    const order = ret.Order || await Order.findByPk(ret.order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const eligible = Number(ret.requested_amount) || Number(order.final_amount) || 0;
    let refundAmount = req.body.refund_amount != null ? Number(req.body.refund_amount) : eligible;
    if (!Number.isFinite(refundAmount) || refundAmount < 0) refundAmount = eligible;
    refundAmount = Math.min(refundAmount, eligible);
    const charges = Math.max(0, +(eligible - refundAmount).toFixed(2));
    const adminNote = req.body.admin_note ? String(req.body.admin_note).slice(0, 1000) : null;

    await ret.update({
      refund_amount: refundAmount, charges_deducted: charges, admin_note: adminNote,
      reviewed_by: req.user.id, reviewed_at: new Date(),
      status: ['requested', 'under_review'].includes(ret.status) ? 'approved' : ret.status,
    });

    const awb = await bookReversePickup(ret, order, brandId);
    await ret.reload();
    const user = await User.findByPk(ret.user_id);
    notify('sendReturnUpdate', user && user.phone, {
      name: user && user.username, returnNumber: ret.return_number, status: 'approved',
      detail: awb ? `Pickup booked (AWB ${awb}) — the courier will collect it soon` : 'Approved — we will arrange the pickup',
    }, brandId);

    return res.json({
      success: true,
      message: awb
        ? `Approved. Reverse pickup booked (AWB ${awb}). Issue the refund once the parcel is received.`
        : 'Approved. Arrange the pickup, then press Mark received when the parcel arrives.',
      return: serialize(ret),
    });
  } catch (error) {
    logger.error('approveReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve return', error: error.message });
  }
};

// ── ADMIN: courier collected the parcel ──────────────────────────────────
module.exports.markPickedUp = async (req, res) => {
  try {
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (!['approved', 'pickup_scheduled'].includes(ret.status)) {
      return res.status(400).json({ success: false, message: `Cannot mark picked up from "${ret.status}".` });
    }
    await ret.update({ status: 'picked_up', pickup_status: 'picked_up' });
    return res.json({ success: true, message: 'Marked as picked up.', return: serialize(ret) });
  } catch (error) {
    logger.error('markPickedUp error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update return' });
  }
};

// ── ADMIN: parcel received at the warehouse → restock ────────────────────
// body.restock (default true): put the items back into stock. Set false when
// the item is damaged and can't be resold. The refund is a separate step
// (Issue refund) so staff check the item first.
module.exports.receiveReturn = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const ret = await Return.findByPk(req.params.id, { include: [{ model: Order, as: 'Order' }] });
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (!['approved', 'pickup_scheduled', 'picked_up', 'received'].includes(ret.status)) {
      return res.status(400).json({ success: false, message: `Cannot receive a return in "${ret.status}" status.` });
    }
    const order = ret.Order || await Order.findByPk(ret.order_id);
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

    const restock = req.body.restock !== false && req.body.restock !== 'false';
    const units = restock ? await restockReturn(ret, order, req.user.id) : 0;
    await ret.update({ status: 'received', pickup_status: 'received' });
    const stockNote = restock ? (units > 0 ? ` ${units} unit(s) back in stock.` : ' (stock already restored)') : ' Not restocked.';

    const next = ret.is_cod
      ? 'Pay the customer by UPI, upload the payout screenshot, then press Issue refund.'
      : 'Press Issue refund to refund the original payment method.';
    return res.json({ success: true, message: `Received.${stockNote} ${next}`, return: serialize(ret) });
  } catch (error) {
    logger.error('receiveReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to receive return', error: error.message });
  }
};

// ── ADMIN: issue (or retry) the refund for a received return ─────────────
// Prepaid: refunds the original payment method via the gateway. COD: records
// the manual UPI payout (screenshot required). Also retries a failed refund.
module.exports.refundReturn = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const ret = await Return.findByPk(req.params.id, { include: [{ model: Order, as: 'Order' }] });
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (ret.status === 'refunded') return res.status(400).json({ success: false, message: 'Already refunded.' });
    if (ret.status !== 'received') {
      return res.status(400).json({ success: false, message: 'Mark the parcel as received before refunding.' });
    }
    const order = ret.Order || await Order.findByPk(ret.order_id);
    // The amount is decided here, after the parcel is received and checked
    // (deduct shipping / damage charges for a part refund).
    if (req.body.refund_amount != null) {
      const eligible = Number(ret.requested_amount) || Number(order.final_amount) || 0;
      const amt = Number(req.body.refund_amount);
      if (!Number.isFinite(amt) || amt <= 0 || amt > eligible + 0.01) {
        return res.status(400).json({ success: false, message: `Refund amount must be between ₹1 and ₹${eligible}.` });
      }
      const refundAmount = Math.round(amt * 100) / 100;
      await ret.update({ refund_amount: refundAmount, charges_deducted: Math.max(0, +(eligible - refundAmount).toFixed(2)) });
    }
    const r = await issueReturnRefund(ret, order, req.user.id, brandId);
    await ret.reload();
    if (!r.ok) return res.status(400).json({ success: false, code: r.code, message: r.message, return: serialize(ret) });
    return res.json({ success: true, message: r.message, return: serialize(ret), refund: r.refund });
  } catch (error) {
    logger.error('refundReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to issue refund', error: error.message });
  }
};

// ── ADMIN: reject ────────────────────────────────────────────────────────
// Rejecting puts the order back to 'delivered' (it was moved to
// return_initiated when the request came in), so it no longer counts as a
// return and the Refund action disappears from the orders page.
module.exports.rejectReturn = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (ret.status === 'refunded') return res.status(400).json({ success: false, message: 'Already refunded.' });
    if (['picked_up', 'received'].includes(ret.status)) {
      return res.status(400).json({ success: false, message: 'The parcel is already on its way back — receive it instead of rejecting.' });
    }
    await ret.update({
      status: 'rejected',
      admin_note: req.body.reason ? String(req.body.reason).slice(0, 1000) : ret.admin_note,
      reviewed_by: req.user.id, reviewed_at: new Date(),
    });

    const order = await Order.findByPk(ret.order_id);
    const stillOpen = await Return.count({ where: { order_id: ret.order_id, status: OPEN_STATUSES } });
    if (order && order.status === 'return_initiated' && stillOpen === 0) {
      await order.update({ status: 'delivered' });
      await OrderStatusHistory.create({
        order_id: order.id, status: 'delivered', updated_by: req.user.id,
        notes: `Return ${ret.return_number} rejected — order back to delivered`,
      });
    }

    const user = await User.findByPk(ret.user_id);
    notify('sendReturnUpdate', user && user.phone, {
      name: user && user.username, returnNumber: ret.return_number, status: 'rejected',
      detail: req.body.reason || 'Not eligible',
    }, brandId);
    return res.json({ success: true, message: 'Return rejected', return: serialize(ret) });
  } catch (error) {
    logger.error('rejectReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to reject return' });
  }
};

// ── Courier webhook hook: advance a return from its reverse-pickup AWB ────
// Called by the shipping webhook before order matching. Returns true when the
// AWB belonged to a return pickup (so the forward order is never touched).
module.exports.applyReversePickupEvent = async (awb, courierStatus) => {
  if (!awb) return false;
  const ret = await Return.findOne({ where: { pickup_awb: String(awb) } });
  if (!ret) return false;
  const st = String(courierStatus || '').toLowerCase();
  const patch = { pickup_status: String(courierStatus || '').slice(0, 40) || ret.pickup_status };
  // Collected from the customer → picked_up. Arrival at the warehouse is only
  // flagged in pickup_status: the admin confirms receipt (and condition) with
  // Mark received, which is what restocks and refunds.
  if (/pick(ed)?\s*up|in\s*transit|dispatched|shipped/.test(st) && ['approved', 'pickup_scheduled'].includes(ret.status)) {
    patch.status = 'picked_up';
  }
  if (/deliver/.test(st)) patch.pickup_status = 'delivered_to_warehouse';
  await ret.update(patch);
  logger.info(`↩︎ Reverse pickup ${awb} for ${ret.return_number}: ${courierStatus}`);
  return true;
};

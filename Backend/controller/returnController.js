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
const VALID_RESOLUTIONS = ['original', 'upi', 'exchange'];
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

// Book a reverse (return) pickup with the courier. Feature-flagged + fail-soft:
// no-op until shippingService.createReversePickup exists (built in the pickup phase).
async function bookReversePickup(ret, order, brandId) {
  try {
    if (ret.resolution === 'exchange') return;
    const flag = String(await settingsHelper.getSetting(brandId, 'RETURN_AUTO_PICKUP', 'true')).toLowerCase();
    if (flag === 'false' || flag === '0' || flag === 'no') return;
    const shippingService = require('../services/shippingService.js');
    if (typeof shippingService.createReversePickup !== 'function') return;
    const result = await shippingService.createReversePickup(order, ret, brandId);
    if (result && result.awb) {
      await ret.update({
        pickup_provider: result.provider || 'ithink',
        pickup_awb: result.awb,
        pickup_status: 'scheduled',
      });
    }
  } catch (e) {
    logger.warn(`reverse pickup booking skipped for ${ret.return_number}: ${e.message}`);
  }
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
    const { order_id, reason, note, resolution, upi_id } = req.body;
    let items = req.body.items;
    if (typeof items === 'string') { try { items = JSON.parse(items); } catch (e) { items = null; } }

    if (!order_id) return res.status(400).json({ success: false, message: 'order_id is required' });
    if (!VALID_REASONS.includes(reason)) return res.status(400).json({ success: false, message: 'Invalid reason' });
    const res_ = VALID_RESOLUTIONS.includes(resolution) ? resolution : 'original';

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
    if (res_ === 'upi' && !String(upi_id || '').trim()) {
      return res.status(400).json({ success: false, message: 'Please provide a UPI ID for the refund.' });
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
      upi_id: res_ === 'upi' ? String(upi_id).trim().slice(0, 80) : null,
      status: 'requested',
      is_cod: order.payment_type === 'cod',
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

// ── ADMIN: approve + issue refund (part/full) ────────────────────────────
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

    // book the reverse pickup (fail-soft; sets pickup_* fields)
    await bookReversePickup(ret, order, brandId);

    const patch = {
      refund_amount: refundAmount, charges_deducted: charges, admin_note: adminNote,
      reviewed_by: req.user.id, reviewed_at: new Date(),
    };

    if (ret.resolution === 'exchange') {
      patch.status = 'approved';
      await ret.update(patch);
      const exUser = await User.findByPk(ret.user_id);
      notify('sendReturnUpdate', exUser && exUser.phone, {
        name: exUser && exUser.username, returnNumber: ret.return_number, status: 'approved',
        detail: 'Exchange approved — pickup arranged',
      }, brandId);
      return res.json({ success: true, message: 'Exchange approved. Pickup arranged.', return: serialize(ret) });
    }

    // resolve the live refundable payment for this order
    const payment = await Payment.findOne({ where: { order_id: order.id, status: 'paid' }, order: [['createdAt', 'DESC']] });
    const isPrepaid = payment && payment.transaction_id && String(payment.transaction_id).startsWith('pay_');

    if (isPrepaid) {
      // order must be in a refundable status — createReturn sets return_initiated
      if (!['cancelled', 'return_initiated', 'returned_rto', 'rto delivered'].includes(order.status)) {
        await order.update({ status: 'return_initiated' });
      }
      // refundService handles Razorpay, payment/order updates, history, and the
      // refund_processed WhatsApp. amount=null means full refund.
      const result = await refundService.processRefund({
        paymentId: payment.id,
        amount: refundAmount >= eligible ? null : refundAmount,
        reason: `Return ${ret.return_number} approved (${ret.reason})`,
        adminId: req.user.id,
        brandId,
      });
      patch.payment_id = payment.id;
      patch.status = 'refunded';
      patch.refunded_at = new Date();
      await ret.update(patch);
      return res.json({ success: true, message: `Refund of ₹${refundAmount} issued via Razorpay.`, return: serialize(ret), refund: result && result.refund });
    }

    // COD / manual payout — needs a proof screenshot first
    if (!ret.payout_proof) {
      // still save the amount decision + pickup, but don't mark refunded
      patch.status = 'approved';
      await ret.update(patch);
      return res.status(400).json({ success: false, code: 'PROOF_REQUIRED', message: 'Upload the payout proof screenshot before issuing a manual refund.', return: serialize(ret) });
    }
    const newPayStatus = refundAmount >= eligible ? 'refunded' : 'partial_refund';
    await order.update({ payment_status: newPayStatus });
    await OrderStatusHistory.create({
      order_id: order.id, status: order.status, updated_by: req.user.id,
      notes: `Manual refund ₹${refundAmount} for return ${ret.return_number} (proof on file)`,
    });
    try {
      const { auditLog } = require('../services/orderService.js');
      await auditLog(order.id, 'refund', req.user.id, 'admin', { return_number: ret.return_number, amount: refundAmount, manual: true });
    } catch (e) { logger.warn(`audit skipped: ${e.message}`); }
    patch.status = 'refunded';
    patch.refunded_at = new Date();
    await ret.update(patch);
    // notify (manual) — reuse refund_processed template
    const user = await User.findByPk(ret.user_id);
    notify('sendRefundProcessed', user && user.phone, {
      name: user && user.username, orderNumber: order.order_number, amount: refundAmount, paymentMethod: 'UPI/Bank',
    }, brandId);
    return res.json({ success: true, message: `Manual refund of ₹${refundAmount} recorded.`, return: serialize(ret) });
  } catch (error) {
    logger.error('approveReturn error:', error);
    return res.status(500).json({ success: false, message: 'Failed to approve return', error: error.message });
  }
};

// ── ADMIN: reject ────────────────────────────────────────────────────────
module.exports.rejectReturn = async (req, res) => {
  try {
    const brandId = req.brandId || 1;
    const ret = await Return.findByPk(req.params.id);
    if (!ret) return res.status(404).json({ success: false, message: 'Return not found' });
    if (ret.status === 'refunded') return res.status(400).json({ success: false, message: 'Already refunded.' });
    await ret.update({
      status: 'rejected',
      admin_note: req.body.reason ? String(req.body.reason).slice(0, 1000) : ret.admin_note,
      reviewed_by: req.user.id, reviewed_at: new Date(),
    });
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

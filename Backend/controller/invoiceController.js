'use strict';

const { logger } = require('../config/logging.js');

function sendPdf(res, bytes, filename) {
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'private, max-age=300');
  res.end(Buffer.from(bytes));
}

// GET /api/orders/:id/invoice — the order's owner or any staff role.
exports.getOrderInvoice = async (req, res) => {
  try {
    const { Order } = require('../model/orderModel.js');
    const { hasAnyRole, STAFF_ROLES } = require('../middleware/authMiddleware.js');
    const order = await Order.findByPk(req.params.id, { attributes: ['id', 'user_id'] });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    if (!hasAnyRole(req.user, STAFF_ROLES) && order.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }
    const { buildInvoicePdf } = require('../services/invoiceService.js');
    const { bytes, filename } = await buildInvoicePdf({ id: order.id });
    sendPdf(res, bytes, filename);
  } catch (err) {
    logger.error('getOrderInvoice: ' + err.message);
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Failed to generate invoice' });
  }
};

// GET /api/invoice/:orderNumber?t=<hmac> — public but unguessable: the token is
// an HMAC over the order number, used in the WhatsApp document link.
exports.getPublicInvoice = async (req, res) => {
  try {
    const { verifyInvoiceToken, buildInvoicePdf } = require('../services/invoiceService.js');
    const orderNumber = String(req.params.orderNumber || '').trim();
    if (!orderNumber || !verifyInvoiceToken(orderNumber, req.query.t)) {
      return res.status(403).json({ message: 'Invalid invoice link' });
    }
    const { bytes, filename } = await buildInvoicePdf({ order_number: orderNumber });
    sendPdf(res, bytes, filename);
  } catch (err) {
    logger.error('getPublicInvoice: ' + err.message);
    res.status(err.status || 500).json({ message: err.status ? err.message : 'Failed to generate invoice' });
  }
};

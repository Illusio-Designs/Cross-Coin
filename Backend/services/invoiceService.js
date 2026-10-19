'use strict';

/**
 * GST invoice generation (pdf-lib, A4).
 *
 * Per-brand tax settings (brand_settings, category 'general'):
 *   GST_PERCENTAGE  – tax rate applied to the order total (default 18)
 *   GSTIN           – the brand's GST registration number (blank = plain invoice)
 *   GST_LEGAL_NAME  – registered legal name (falls back to the brand name)
 *   GST_ADDRESS     – registered address printed in the header
 *   GST_STATE       – dispatch state; same state as delivery → CGST+SGST split,
 *                     different state → IGST (blank = always CGST+SGST)
 *
 * Catalog prices are GST-inclusive, so the invoice backs the tax OUT of the
 * charged total: taxable = total / (1 + rate), tax = total − taxable.
 *
 * The invoice number is the order number (unique, sequential per day) and the
 * public download link is authorized by an HMAC token over that number, so the
 * same PDF can be fetched by WhatsApp's servers without a login.
 */

const crypto = require('crypto');

const money = (n) => `Rs. ${Number(n || 0).toFixed(2)}`;

function invoiceSecret() {
  return process.env.INVOICE_URL_SECRET || process.env.JWT_SECRET || '';
}

function invoiceToken(orderNumber) {
  return crypto.createHmac('sha256', invoiceSecret())
    .update(`invoice:${String(orderNumber)}`)
    .digest('hex')
    .slice(0, 32);
}

function verifyInvoiceToken(orderNumber, token) {
  try {
    const expected = invoiceToken(orderNumber);
    const given = String(token || '');
    if (given.length !== expected.length) return false;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(given));
  } catch (_) {
    return false;
  }
}

function publicInvoiceUrl(orderNumber) {
  const base = (process.env.API_URL || 'https://api.crosscoin.in').replace(/\/+$/, '');
  return `${base}/api/invoice/${encodeURIComponent(orderNumber)}?t=${invoiceToken(orderNumber)}`;
}

async function loadOrderForInvoice(where) {
  const { Order } = require('../model/orderModel.js');
  const { OrderItem } = require('../model/orderItemModel.js');
  const { Product } = require('../model/productModel.js');
  const { ProductVariation } = require('../model/productVariationModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const Brand = require('../model/brandModel.js');

  return Order.findOne({
    where,
    include: [
      {
        model: OrderItem, as: 'OrderItems',
        include: [
          { model: Product, as: 'Product', attributes: ['id', 'name'], required: false },
          { model: ProductVariation, as: 'ProductVariation', attributes: ['id', 'sku'], required: false },
        ],
      },
      { model: ShippingAddress, as: 'ShippingAddress', required: false },
      { model: Brand, as: 'Brand', attributes: ['id', 'name'], required: false },
    ],
  });
}

// Compute the GST breakdown for an order under a brand's settings.
async function gstBreakdown(order) {
  const settingsHelper = require('./settingsHelper.js');
  const brandId = order.brand_id || 1;

  const rate = parseFloat(await settingsHelper.getSetting(brandId, 'GST_PERCENTAGE', '18', { brandOnly: true })) || 18;
  const gstin = (await settingsHelper.getSetting(brandId, 'GSTIN', '', { brandOnly: true }) || '').trim();
  const legalName = (await settingsHelper.getSetting(brandId, 'GST_LEGAL_NAME', '', { brandOnly: true }) || '').trim();
  const address = (await settingsHelper.getSetting(brandId, 'GST_ADDRESS', '', { brandOnly: true }) || '').trim();
  const gstState = (await settingsHelper.getSetting(brandId, 'GST_STATE', '', { brandOnly: true }) || '').trim();

  const total = parseFloat(order.final_amount) || 0;
  const taxable = total / (1 + rate / 100);
  const tax = total - taxable;

  const shipState = String(order.ShippingAddress?.state || '').trim().toLowerCase();
  const interState = Boolean(gstState) && Boolean(shipState) && gstState.toLowerCase() !== shipState;

  return {
    rate, gstin, legalName, address, gstState,
    total,
    taxable: Math.round(taxable * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    interState,
    // split for display
    parts: interState
      ? [{ label: `IGST @ ${rate}%`, amount: tax }]
      : [
          { label: `CGST @ ${rate / 2}%`, amount: tax / 2 },
          { label: `SGST @ ${rate / 2}%`, amount: tax / 2 },
        ],
  };
}

/**
 * Render the invoice PDF for an order.
 * @param {object} where - Sequelize where for the order ({ id } or { order_number })
 * @returns {{ bytes: Uint8Array, filename: string, order: object }}
 */
async function buildInvoicePdf(where) {
  const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

  const order = await loadOrderForInvoice(where);
  if (!order) { const e = new Error('Order not found'); e.status = 404; throw e; }

  const gst = await gstBreakdown(order);
  const addr = order.ShippingAddress || {};
  const brandName = gst.legalName || order.Brand?.name || 'Store';

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const ink = rgb(0.1, 0.1, 0.12);
  const grey = rgb(0.45, 0.45, 0.48);
  const line = rgb(0.85, 0.85, 0.87);
  const L = 48;                 // left margin
  const R = 595.28 - 48;        // right edge
  let y = 790;

  const text = (str, x, yy, opts = {}) => page.drawText(String(str ?? ''), {
    x, y: yy, size: opts.size || 9.5, font: opts.bold ? bold : font,
    color: opts.color || ink, maxWidth: opts.maxWidth, lineHeight: opts.lineHeight || 12,
  });
  const right = (str, xRight, yy, opts = {}) => {
    const f = opts.bold ? bold : font;
    const w = f.widthOfTextAtSize(String(str ?? ''), opts.size || 9.5);
    text(str, xRight - w, yy, opts);
  };
  const hr = (yy) => page.drawLine({ start: { x: L, y: yy }, end: { x: R, y: yy }, thickness: 0.7, color: line });

  // ── Header ────────────────────────────────────────────────────────────────
  text(brandName, L, y, { size: 16, bold: true });
  right(gst.gstin ? 'TAX INVOICE' : 'INVOICE', R, y, { size: 13, bold: true, color: grey });
  y -= 16;
  if (gst.address) { text(gst.address, L, y, { size: 8.5, color: grey, maxWidth: 300 }); y -= 12 * Math.ceil(gst.address.length / 68); }
  if (gst.gstin) { text(`GSTIN: ${gst.gstin}`, L, y, { size: 9, bold: true }); y -= 14; }
  y -= 6;
  hr(y); y -= 18;

  // ── Invoice meta + bill-to ────────────────────────────────────────────────
  const created = order.createdAt ? new Date(order.createdAt) : new Date();
  const dateStr = created.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  text('Invoice No.', L, y, { size: 8, color: grey }); text('Invoice Date', L + 140, y, { size: 8, color: grey });
  text('Payment', L + 260, y, { size: 8, color: grey });
  y -= 12;
  text(order.order_number, L, y, { bold: true });
  text(dateStr, L + 140, y);
  text(String(order.payment_type || '').toUpperCase() === 'COD' ? 'Cash on Delivery' : 'Prepaid', L + 260, y);
  y -= 22;

  text('Billed & shipped to', L, y, { size: 8, color: grey }); y -= 12;
  text(addr.full_name || 'Customer', L, y, { bold: true }); y -= 12;
  const addrLine = [addr.address, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ');
  if (addrLine) {
    text(addrLine, L, y, { size: 9, maxWidth: R - L });
    y -= 12 * Math.max(1, Math.ceil(addrLine.length / 95));
  }
  if (addr.phone) { text(`Phone: ${addr.phone}`, L, y, { size: 9, color: grey }); y -= 12; }
  if (addr.state) { text(`Place of supply: ${addr.state}`, L, y, { size: 9, color: grey }); y -= 12; }
  y -= 8;

  // ── Items table ───────────────────────────────────────────────────────────
  const C_QTY = R - 180, C_PRICE = R - 110, C_AMT = R;
  hr(y); y -= 14;
  text('Item', L, y, { size: 8, color: grey, bold: true });
  right('Qty', C_QTY, y, { size: 8, color: grey, bold: true });
  right('Price', C_PRICE, y, { size: 8, color: grey, bold: true });
  right('Amount', C_AMT, y, { size: 8, color: grey, bold: true });
  y -= 8; hr(y); y -= 14;

  let itemsGross = 0;
  for (const it of order.OrderItems || []) {
    const name = it.Product?.name || 'Item';
    const sku = it.ProductVariation?.sku ? `  (${it.ProductVariation.sku})` : '';
    const qty = Number(it.quantity) || 1;
    const lineAmt = parseFloat(it.subtotal) || (parseFloat(it.price) || 0) * qty;
    itemsGross += lineAmt;
    text((name + sku).slice(0, 62), L, y, { size: 9.5 });
    right(String(qty), C_QTY, y);
    right(money(it.price), C_PRICE, y);
    right(money(lineAmt), C_AMT, y);
    y -= 15;
    if (y < 180) break; // single-page safety; long orders keep the totals legible
  }
  y -= 2; hr(y); y -= 16;

  // ── Totals ────────────────────────────────────────────────────────────────
  const discount = parseFloat(order.discount_amount) || 0;
  const shipping = parseFloat(order.shipping_fee) || 0;
  const rows = [['Items total', money(itemsGross)]];
  if (discount > 0) rows.push(['Discount', `- ${money(discount)}`]);
  rows.push(['Shipping', shipping > 0 ? money(shipping) : 'Free']);
  for (const [label, val] of rows) {
    right(label, C_PRICE, y, { size: 9, color: grey });
    right(val, C_AMT, y, { size: 9 });
    y -= 14;
  }
  right('Grand total (incl. GST)', C_PRICE, y, { size: 10.5, bold: true });
  right(money(gst.total), C_AMT, y, { size: 10.5, bold: true });
  y -= 24;

  // ── GST breakdown ─────────────────────────────────────────────────────────
  text('GST breakdown (prices are tax-inclusive)', L, y, { size: 8, color: grey, bold: true }); y -= 14;
  right('Taxable value', C_PRICE, y, { size: 9, color: grey });
  right(money(gst.taxable), C_AMT, y, { size: 9 });
  y -= 13;
  for (const part of gst.parts) {
    right(part.label, C_PRICE, y, { size: 9, color: grey });
    right(money(part.amount), C_AMT, y, { size: 9 });
    y -= 13;
  }
  right('Total tax', C_PRICE, y, { size: 9, bold: true });
  right(money(gst.tax), C_AMT, y, { size: 9, bold: true });
  y -= 26;

  hr(y); y -= 14;
  text('This is a computer-generated invoice and does not require a signature.', L, y, { size: 8, color: grey });

  const bytes = await doc.save();
  const filename = `Invoice-${order.order_number}.pdf`;
  return { bytes, filename, order };
}

module.exports = { buildInvoicePdf, invoiceToken, verifyInvoiceToken, publicInvoiceUrl, gstBreakdown };

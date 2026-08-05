'use strict';

const { WhatsappConversation, WhatsappMessage, WhatsappCannedResponse, WhatsappBroadcast } = require('../model/whatsappConversationModel.js');
const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');
const { Op } = require('sequelize');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function errMsg(err) {
  return err?.response?.data?.error?.message || err?.message || 'Unknown error';
}

// Shared-number mode: one verified WhatsApp number serves every brand, so we
// can't tell the brand from the number. Attribute an inbound message to the
// brand of the customer's MOST RECENT order (matched by shipping/guest phone).
// Falls back to the shared default brand when the customer has no orders yet.
async function resolveBrandByPhone(phone) {
  const DEFAULT_BRAND = Number(process.env.WHATSAPP_SHARED_BRAND_ID) || 1;
  try {
    const digits = String(phone || '').replace(/\D/g, '').slice(-10);
    if (digits.length !== 10) return DEFAULT_BRAND;
    const { Order } = require('../model/orderModel.js');
    const { ShippingAddress } = require('../model/shippingAddressModel.js');
    const { GuestUser } = require('../model/guestUserModel.js');
    const recent = { attributes: ['brand_id', 'createdAt'], order: [['createdAt', 'DESC']] };

    const viaAddr = await Order.findOne({
      ...recent,
      include: [{ model: ShippingAddress, as: 'ShippingAddress', attributes: [], required: true, where: { phone: { [Op.like]: `%${digits}` } } }],
    });
    if (viaAddr?.brand_id) return viaAddr.brand_id;

    const viaGuest = await Order.findOne({
      ...recent,
      include: [{ model: GuestUser, as: 'GuestUser', attributes: [], required: true, where: { phone: { [Op.like]: `%${digits}` } } }],
    });
    if (viaGuest?.brand_id) return viaGuest.brand_id;
  } catch (e) {
    logger.warn('[WhatsApp] brand resolve by phone failed: ' + e.message);
  }
  return DEFAULT_BRAND;
}

// ─── Webhook: verify (GET) ────────────────────────────────────────────────────
exports.verifyWebhook = (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'crosscoin_wa_verify';
  const { 'hub.mode': mode, 'hub.verify_token': token, 'hub.challenge': challenge } = req.query;
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Forbidden' });
};

// ─── Webhook: receive (POST) ──────────────────────────────────────────────────
exports.receiveWebhook = async (req, res) => {
  // Always respond 200 immediately so Meta doesn't retry
  res.status(200).json({ status: 'ok' });

  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;

    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;
        const value = change.value;

        // ── Incoming messages ──
        for (const msg of (value.messages || [])) {
          const phone       = msg.from;
          // Shared number → attribute this message to the customer's brand.
          const brandId     = await resolveBrandByPhone(phone);
          const contactName = value.contacts?.find(c => c.wa_id === phone)?.profile?.name || null;
          const waMessageId = msg.id;
          const sentAt      = new Date(parseInt(msg.timestamp) * 1000);

          // Determine message type and body
          let msgType = msg.type;
          let msgBody = '';
          let displayText = '';

          if (msg.type === 'text') {
            msgBody = msg.text?.body || '';
            displayText = msgBody;
          } else if (msg.type === 'audio') {
            const mediaId = msg.audio?.id;
            msgBody = JSON.stringify({ url: mediaId, mime_type: msg.audio?.mime_type });
            displayText = 'Voice message';
          } else if (msg.type === 'image') {
            const mediaId = msg.image?.id;
            msgBody = JSON.stringify({ url: mediaId, caption: msg.image?.caption, mime_type: msg.image?.mime_type });
            displayText = msg.image?.caption || 'Image';
          } else if (msg.type === 'video') {
            const mediaId = msg.video?.id;
            msgBody = JSON.stringify({ url: mediaId, caption: msg.video?.caption, mime_type: msg.video?.mime_type });
            displayText = msg.video?.caption || 'Video';
          } else if (msg.type === 'document') {
            const mediaId = msg.document?.id;
            msgBody = JSON.stringify({ url: mediaId, caption: msg.document?.filename || msg.document?.caption, mime_type: msg.document?.mime_type });
            displayText = msg.document?.filename || 'Document';
          } else if (msg.type === 'sticker') {
            const mediaId = msg.sticker?.id;
            msgBody = JSON.stringify({ url: mediaId, mime_type: msg.sticker?.mime_type });
            displayText = 'Sticker';
          } else if (msg.type === 'location') {
            msgBody = JSON.stringify({ lat: msg.location?.latitude, lng: msg.location?.longitude, name: msg.location?.name });
            displayText = `Location: ${msg.location?.name || `${msg.location?.latitude}, ${msg.location?.longitude}`}`;
          } else if (msg.type === 'reaction') {
            msgType = 'reaction';
            msgBody = msg.reaction?.emoji || '👍';
            displayText = msg.reaction?.emoji || '👍';
          } else if (msg.type === 'button') {
            // Quick Reply button tap from a template message
            msgBody    = msg.button?.payload || msg.button?.text || '';
            displayText = msg.button?.text   || 'Button tap';
          } else {
            msgBody = `[${msg.type}]`;
            displayText = `[${msg.type}]`;
          }

          // One thread per customer (shared number): key by phone only, and tag
          // the thread with the resolved brand so the dashboard shows which brand
          // this customer last dealt with. findOrCreate returns [instance, created]
          const [conv, created] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone },
            defaults: {
              brand_id:        brandId,
              customer_name:   contactName,
              wa_contact_id:   phone,
              last_message:    displayText,
              last_message_at: sentAt,
              unread_count:    1,
              status:          'open',
            },
          });

          if (!created) {
            await conv.update({
              brand_id:        brandId, // keep the tag on the latest brand context
              last_message:    displayText,
              last_message_at: sentAt,
              unread_count:    conv.unread_count + 1,
              customer_name:   contactName || conv.customer_name,
              status:          'open',
            });
          }

          await WhatsappMessage.create({
            conversation_id: conv.id,
            wa_message_id:   waMessageId,
            direction:       'inbound',
            type:            msgType,
            body:            msgBody,
            status:          'received',
            sent_at:         sentAt,
          });

          // Emit real-time notification
          const notificationService = require('../services/notificationService.js');
          notificationService.emitNewWhatsApp(phone, displayText);

          logger.info(`WhatsApp inbound [${phone}] [${msgType}]: ${displayText}`);

          // ── COD Address Confirmation — auto-detect "YES" / "NO" replies ──
          if (msgType === 'text' && msgBody) {
            const normalised = msgBody.trim().toLowerCase();
            const confirmKeywords  = ['yes', 'confirm', 'confirmed', 'haan', 'ha', 'ok', 'correct', 'sahi hai', 'theek hai', 'right'];
            const rejectionKeywords = ['no', 'nahi', 'nope', 'wrong', 'incorrect', 'galat', 'change', 'update', 'different'];
            const isConfirmation = confirmKeywords.includes(normalised);
            const isRejection    = !isConfirmation && rejectionKeywords.some(k => normalised.includes(k));

            if (isConfirmation || isRejection) {
              try {
                const { Order } = require('../model/orderModel.js');
                const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
                const { ShippingAddress } = require('../model/shippingAddressModel.js');
                const { sequelize: sq } = require('../config/db.js');
                const { Op: OpCod } = require('sequelize');

                const phoneDigits = phone.replace(/\D/g, '').slice(-10);
                const pendingOrder = await Order.findOne({
                  where: {
                    status: 'awaiting_confirmation',
                    payment_type: 'cod',
                    cod_address_confirmed: false,
                  },
                  include: [{
                    model: ShippingAddress,
                    as: 'ShippingAddress',
                    where: { phone: { [OpCod.like]: `%${phoneDigits}` } },
                    required: true,
                  }],
                  order: [['created_at', 'DESC']],
                });

                if (pendingOrder) {
                  const whatsappSvc = require('../services/whatsappService.js');

                  if (isConfirmation) {
                    // ── YES: confirm address, advance order to confirmed, trigger FShip sync ──
                    const t = await sq.transaction();
                    try {
                      await pendingOrder.update({
                        cod_address_confirmed: true,
                        cod_address_confirmed_at: new Date(),
                        status: 'confirmed',
                      }, { transaction: t });
                      await OrderStatusHistory.create({
                        order_id: pendingOrder.id,
                        status: 'confirmed',
                        notes: 'Auto-confirmed: customer replied YES via WhatsApp',
                        updated_by: null,
                      }, { transaction: t });
                      await t.commit();
                    } catch (txErr) {
                      await t.rollback();
                      throw txErr;
                    }

                    // Trigger FShip sync via event (fire-and-forget)
                    const orderEmitter = require('../services/orderEvents.js');
                    setImmediate(() => {
                      try { orderEmitter.emit('order.confirmed', pendingOrder); }
                      catch (e) { logger.warn('[WhatsApp] order.confirmed emit failed:', e.message); }
                    });

                    await whatsappSvc.sendTextMessage(
                      phone,
                      `✅ Thank you! Your address for order *#${pendingOrder.order_number}* has been confirmed.\n\nWe'll process and ship it shortly. You'll receive a tracking update once it's on the way!`,
                      brandId
                    );
                    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_confirmed' });
                    logger.info(`[WhatsApp] COD address confirmed + order advanced to confirmed: ${pendingOrder.order_number}`);

                  } else {
                    // ── NO: flag order for manual review, notify admin, guide customer ──
                    // Keep cod_address_confirmed: false so the order stays discoverable if customer
                    // later replies YES or admin resends the confirmation message.

                    await whatsappSvc.sendTextMessage(
                      phone,
                      `We're sorry to hear that! Please reply with your correct delivery address and we'll update it before shipping.\n\nOr contact our support team and mention your order *#${pendingOrder.order_number}*.`,
                      brandId
                    );
                    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_rejected' });
                    logger.warn(`[WhatsApp] COD address rejected for order ${pendingOrder.order_number} by ${phone}`);
                  }
                }
              } catch (confirmErr) {
                logger.error('[WhatsApp] COD address confirmation error:', confirmErr.message);
              }
            }
          }

          // ── COD Address Confirmation — Quick Reply button taps ────────────
          // Payload format: "confirm_cod_<orderNumber>" or "reject_cod_<orderNumber>"
          if (msgType === 'button' && msgBody) {
            const isConfirmBtn = msgBody.startsWith('confirm_cod_');
            const isRejectBtn  = msgBody.startsWith('reject_cod_');

            if (isConfirmBtn || isRejectBtn) {
              try {
                const orderNumber = msgBody.replace(/^(confirm|reject)_cod_/, '');
                const { Order } = require('../model/orderModel.js');
                const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
                const { sequelize: sq } = require('../config/db.js');

                const pendingOrder = await Order.findOne({
                  where: {
                    order_number: orderNumber,
                    status: 'awaiting_confirmation',
                    payment_type: 'cod',
                    cod_address_confirmed: false,
                  },
                });

                if (pendingOrder) {
                  const whatsappSvc = require('../services/whatsappService.js');

                  if (isConfirmBtn) {
                    // ── Button: Confirm Address ──
                    const t = await sq.transaction();
                    try {
                      await pendingOrder.update({
                        cod_address_confirmed: true,
                        cod_address_confirmed_at: new Date(),
                        status: 'confirmed',
                      }, { transaction: t });
                      await OrderStatusHistory.create({
                        order_id: pendingOrder.id,
                        status: 'confirmed',
                        notes: 'Auto-confirmed: customer tapped Confirm Address button via WhatsApp',
                        updated_by: null,
                      }, { transaction: t });
                      await t.commit();
                    } catch (txErr) {
                      await t.rollback();
                      throw txErr;
                    }

                    const orderEmitter = require('../services/orderEvents.js');
                    setImmediate(() => {
                      try { orderEmitter.emit('order.confirmed', pendingOrder); }
                      catch (e) { logger.warn('[WhatsApp] order.confirmed emit failed:', e.message); }
                    });

                    await whatsappSvc.sendTextMessage(
                      phone,
                      `✅ Thank you! Your address for order *#${pendingOrder.order_number}* has been confirmed.\n\nWe'll process and ship it shortly. You'll receive a tracking update once it's on the way!`,
                      brandId
                    );
                    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_confirmed' });
                    logger.info(`[WhatsApp] COD button confirmed: ${pendingOrder.order_number}`);

                  } else {
                    // ── Button: Wrong Address ──
                    await whatsappSvc.sendTextMessage(
                      phone,
                      `No problem! Please reply with your correct delivery address and we'll update it before shipping.\n\nOr contact our support team and mention order *#${pendingOrder.order_number}*.`,
                      brandId
                    );
                    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_rejected' });
                    logger.warn(`[WhatsApp] COD button rejected: ${pendingOrder.order_number}`);
                  }
                }
              } catch (btnErr) {
                logger.error('[WhatsApp] COD button reply error:', btnErr.message);
              }
            }
          }
        }

        // ── Status updates (sent → delivered → read) ──
        for (const status of (value.statuses || [])) {
          await WhatsappMessage.update(
            { status: status.status },
            { where: { wa_message_id: status.id } }
          );
        }
      }
    }
  } catch (err) {
    logger.error('WhatsApp webhook error: ' + err.message);
  }
};

// ─── Stats ────────────────────────────────────────────────────────────────────
exports.getStats = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const { Op } = require('sequelize');

    const [
      totalConversations,
      openConversations,
      resolvedConversations,
      totalMessages,
      sentMessages,
      deliveredMessages,
      readMessages,
      last7Days,
    ] = await Promise.all([
      WhatsappConversation.count({ where: { brand_id: brandId } }),
      WhatsappConversation.count({ where: { brand_id: brandId, status: 'open' } }),
      WhatsappConversation.count({ where: { brand_id: brandId, status: 'resolved' } }),
      WhatsappMessage.count(),
      WhatsappMessage.count({ where: { direction: 'outbound' } }),
      WhatsappMessage.count({ where: { direction: 'outbound', status: 'delivered' } }),
      WhatsappMessage.count({ where: { direction: 'outbound', status: 'read' } }),
      // messages per day for last 7 days
      WhatsappMessage.findAll({
        where: {
          direction: 'outbound',
          sent_at: { [Op.gte]: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
        attributes: [
          [require('sequelize').fn('DATE', require('sequelize').col('sent_at')), 'day'],
          [require('sequelize').fn('COUNT', require('sequelize').col('id')), 'count'],
        ],
        group: [require('sequelize').fn('DATE', require('sequelize').col('sent_at'))],
        order: [[require('sequelize').fn('DATE', require('sequelize').col('sent_at')), 'ASC']],
        raw: true,
      }),
    ]);

    const deliveryRate = sentMessages > 0 ? ((deliveredMessages / sentMessages) * 100).toFixed(1) : '0.0';
    const readRate     = sentMessages > 0 ? ((readMessages     / sentMessages) * 100).toFixed(1) : '0.0';
    const unreadCount  = await WhatsappConversation.sum('unread_count', { where: { brand_id: brandId } }) || 0;

    res.json({
      success: true,
      stats: {
        totalConversations,
        openConversations,
        resolvedConversations,
        totalMessages,
        sentMessages,
        deliveredMessages,
        readMessages,
        deliveryRate,
        readRate,
        unreadCount,
        last7Days,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Conversations ────────────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    // Shared number → allow an "All brands" view (brandId 'all' or 0) so staff
    // see every conversation regardless of which brand it's tagged to.
    const brandParam = String(req.query.brandId || '').toLowerCase();
    const allBrands  = brandParam === 'all' || brandParam === '0';
    const brandId = parseInt(req.query.brandId) || 1;
    const status  = req.query.status || 'open';
    const page    = parseInt(req.query.page) || 1;
    const limit   = 20;

    const where = allBrands ? {} : { brand_id: brandId };
    if (status !== 'all') where.status = status;

    const { count, rows } = await WhatsappConversation.findAndCountAll({
      where,
      order: [['last_message_at', 'DESC']],
      limit,
      offset: (page - 1) * limit,
    });

    res.json({ success: true, conversations: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Messages ─────────────────────────────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    // Paginated: newest LIMIT by default; ?before=<messageId> loads the previous
    // page (for "load older"). hasMore tells the client whether to keep the
    // "Load older messages" control visible.
    const LIMIT = 40;
    const before = parseInt(req.query.before) || null;
    const where = { conversation_id: id };
    if (before) where.id = { [Op.lt]: before };

    let rows = await WhatsappMessage.findAll({
      where,
      order: [['id', 'DESC']],
      limit: LIMIT + 1,
    });
    const hasMore = rows.length > LIMIT;
    if (hasMore) rows = rows.slice(0, LIMIT);
    rows.reverse(); // chronological (oldest → newest)

    // Attach quoted message data for replies
    const quotedIds = rows.filter(m => m.quoted_message_id).map(m => m.quoted_message_id);
    let quotedMap = {};
    if (quotedIds.length > 0) {
      const quotedMsgs = await WhatsappMessage.findAll({ where: { id: quotedIds } });
      quotedMsgs.forEach(q => { quotedMap[q.id] = q; });
    }
    const messagesWithQuotes = rows.map(m => {
      const plain = m.toJSON();
      if (m.quoted_message_id && quotedMap[m.quoted_message_id]) {
        plain._quotedMsg = quotedMap[m.quoted_message_id].toJSON();
      }
      return plain;
    });

    if (!before) await conv.update({ unread_count: 0 }); // mark read only on newest load

    res.json({ success: true, conversation: conv, messages: messagesWithQuotes, hasMore });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Live inbox stream (long-poll) ───────────────────────────────────────────
// GET /api/whatsapp/stream?brandId=&status=&since=<ISO>[&wait=0]
// Returns the current conversation list; if nothing is newer than `since`, holds
// the request open (~25s) and returns the instant an inbound message arrives.
// cPanel-safe (plain HTTP, no SSE/WebSocket), and holds no DB connection while
// parked. The client reconnects after each response for a live inbox.
exports.streamUpdates = async (req, res) => {
  try {
    const notificationService = require('../services/notificationService.js');
    const brandParam = String(req.query.brandId || '').toLowerCase();
    const allBrands  = brandParam === 'all' || brandParam === '0';
    const brandId    = parseInt(req.query.brandId) || 1;
    const status     = req.query.status || 'open';
    const wait       = req.query.wait !== '0';
    const sinceTs    = req.query.since ? new Date(req.query.since) : null;

    const fetchList = async () => {
      const where = allBrands ? {} : { brand_id: brandId };
      if (status !== 'all') where.status = status;
      return WhatsappConversation.findAll({ where, order: [['last_message_at', 'DESC']], limit: 40 });
    };

    let list = await fetchList();
    const newest = list[0]?.last_message_at ? new Date(list[0].last_message_at) : null;
    const hasNew = !sinceTs || (newest && newest > sinceTs);

    if (wait && !hasNew) {
      let closed = false;
      req.on('close', () => { closed = true; });
      await notificationService.waitForWhatsApp(25000);
      if (closed) return;
      await new Promise((r) => setTimeout(r, 150));
      list = await fetchList();
    }

    res.json({ success: true, conversations: list, serverTime: new Date() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send reply ───────────────────────────────────────────────────────────────
exports.sendReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, brandId = 1, quotedWaMessageId } = req.body;

    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const result = await whatsappService.sendTextMessage(conv.customer_phone, message.trim(), brandId, quotedWaMessageId || null);
    if (result?.rate_limited) {
      return res.status(429).json({ success: false, message: 'Hourly message limit reached for this customer (10/hour). Please try again later.' });
    }

    // Find the DB id of the quoted message
    let quotedMsgDbId = null;
    if (quotedWaMessageId) {
      const quotedMsg = await WhatsappMessage.findOne({ where: { wa_message_id: quotedWaMessageId } });
      quotedMsgDbId = quotedMsg?.id || null;
    }

    const saved = await WhatsappMessage.create({
      conversation_id:   id,
      wa_message_id:     result?.messages?.[0]?.id || null,
      direction:         'outbound',
      type:              'text',
      body:              message.trim(),
      quoted_message_id: quotedMsgDbId,
      status:            'sent',
      sent_at:           new Date(),
    });

    // Stamp the SLA first-response time on the first agent reply (not on
    // automated notification deliveries) so "avg first response" is accurate.
    const convUpdate = { last_message: message.trim(), last_message_at: new Date() };
    if (!conv.first_response_at) convUpdate.first_response_at = new Date();
    await conv.update(convUpdate);

    res.json({ success: true, message: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Send a media reply (image / video / audio / document) ────────────────────
// Agent attaches a file in the composer → we upload it to Meta, send it to the
// customer, and store it just like an inbound media message so it renders in the
// thread. Uploads/sends on the conversation's OWN brand (shared number).
exports.sendMediaReply = async (req, res) => {
  try {
    const { id } = req.params;
    const caption = (req.body.caption || '').trim();
    const file = req.file;
    if (!file || !file.buffer) return res.status(400).json({ success: false, message: 'No file attached' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const brandId = conv.brand_id || parseInt(req.body.brandId) || 1;
    const kind = whatsappService.mediaKindFromMime(file.mimetype);

    const mediaId = await whatsappService.uploadMedia(file.buffer, file.mimetype, file.originalname, brandId);
    const result = await whatsappService.sendMediaMessage(
      conv.customer_phone,
      { mediaId, kind, caption, filename: file.originalname },
      brandId,
    );

    // Store in the same JSON shape inbound media uses, so MsgContent renders it.
    const body = JSON.stringify({
      url: mediaId,
      mime: file.mimetype,
      caption: kind === 'document' ? file.originalname : (caption || null),
      text: caption || null,
    });
    const preview = kind === 'image' ? '📷 Photo'
      : kind === 'video' ? '🎥 Video'
      : kind === 'audio' ? '🎤 Audio'
      : `📎 ${file.originalname}`;

    const saved = await WhatsappMessage.create({
      conversation_id: id,
      wa_message_id:   result?.messages?.[0]?.id || null,
      direction:       'outbound',
      type:            kind,
      body,
      status:          'sent',
      sent_at:         new Date(),
    });
    await conv.update({ last_message: caption || preview, last_message_at: new Date() });

    res.json({ success: true, message: saved });
  } catch (err) {
    logger.error('[WhatsApp] sendMediaReply failed:', errMsg(err));
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Resolve conversation ─────────────────────────────────────────────────────
exports.resolveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const [updated] = await WhatsappConversation.update({ status: 'resolved' }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Templates ────────────────────────────────────────────────────────────────
exports.listTemplates = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const force = ['1', 'true', 'yes'].includes(String(req.query.force).toLowerCase());
    const data = await whatsappService.listTemplates(brandId, { force });
    res.json({ success: true, templates: data.data || [], paging: data.paging || null });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.createTemplate = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const { name, category, language, components } = req.body;
    if (!name || !components?.length) {
      return res.status(400).json({ success: false, message: 'name and components are required' });
    }
    const result = await whatsappService.createTemplate({ name, category, language, components }, brandId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

exports.deleteTemplate = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const { name } = req.params;
    const result = await whatsappService.deleteTemplate(name, brandId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// GET /templates/defaults — the canonical template definitions (names, category,
// preview) so the dashboard can list them and seed/update them individually.
exports.listDefaultTemplates = async (_req, res) => {
  try {
    res.json({ success: true, defaults: whatsappService.listDefaultTemplateDefs() });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// POST /templates/seed — seed default templates. Pass body.names (array) to seed
// only those (single or a selected batch); omit to seed them all.
exports.seedTemplates = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const names = Array.isArray(req.body.names) && req.body.names.length ? req.body.names : null;
    const results = await whatsappService.seedDefaultTemplates(brandId, names);
    const created  = results.filter(r => r.status === 'created').length;
    const skipped  = results.filter(r => r.status === 'already_exists').length;
    const failed   = results.filter(r => r.status === 'error').length;
    res.json({ success: true, summary: { created, skipped, failed }, results });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// PUT /templates/sync-all — delete + recreate default templates for re-approval.
// Pass body.names (array) to update only those; omit to update them all.
exports.syncAllTemplates = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const names = Array.isArray(req.body.names) && req.body.names.length ? req.body.names : null;
    const results = await whatsappService.updateAllTemplates(brandId, names);
    const updated = results.filter(r => r.status === 'updated').length;
    const failed  = results.filter(r => r.status === 'error').length;
    res.json({ success: true, summary: { updated, failed, total: results.length }, results });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// PUT /templates/:name — delete + recreate a single named template
exports.updateTemplate = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId || req.query.brandId) || 1;
    const { name } = req.params;
    if (!name) return res.status(400).json({ success: false, message: 'Template name is required' });
    const result = await whatsappService.updateTemplate(name, brandId);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Customer contact (website widget — takes phone, sends WA message) ───────
exports.customerContact = async (req, res) => {
  try {
    const { phone, message, name, brandId = 1 } = req.body;
    if (!phone?.trim()) return res.status(400).json({ success: false, message: 'Phone number is required' });
    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    // Send the message to the customer via WhatsApp
    const result = await whatsappService.sendTextMessage(phone.trim(), message.trim(), brandId);

    const normalizedPhone = whatsappService.formatE164(phone.trim()).replace('+', '');

    // Save conversation in DB so it appears in dashboard inbox (one thread per
    // customer — shared number).
    const [conv, created] = await WhatsappConversation.findOrCreate({
      where: { customer_phone: normalizedPhone },
      defaults: {
        brand_id:        brandId,
        customer_name:   name?.trim() || null,
        wa_contact_id:   normalizedPhone,
        last_message:    message.trim(),
        last_message_at: new Date(),
        unread_count:    1,
        status:          'open',
      },
    });

    if (!created) {
      await conv.update({
        last_message:    message.trim(),
        last_message_at: new Date(),
        unread_count:    conv.unread_count + 1,
        customer_name:   name?.trim() || conv.customer_name,
        status:          'open',
      });
    }

    // Save as inbound so it shows in inbox as a customer message
    await WhatsappMessage.create({
      conversation_id: conv.id,
      wa_message_id:   result?.messages?.[0]?.id || null,
      direction:       'inbound',
      type:            'text',
      body:            message.trim(),
      status:          'received',
      sent_at:         new Date(),
    });

    logger.info(`WhatsApp widget contact [${phone}]: ${message.trim()}`);
    res.json({ success: true, message: 'Message sent to your WhatsApp successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Test connection ──────────────────────────────────────────────────────────
exports.testConnection = async (req, res) => {
  try {
    const { phone, brandId = 1 } = req.body;
    if (!phone) return res.status(400).json({ success: false, message: 'phone is required' });
    const result = await whatsappService.testConnection(phone, parseInt(brandId));
    res.json({ success: true, message: 'Test message sent successfully', result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Auto-reply bot ───────────────────────────────────────────────────────────
// Called from receiveWebhook when an inbound message matches a keyword
async function handleAutoReply(phone, text, brandId) {
  const lower = (text || '').toLowerCase().trim();
  try {
    if (lower === 'track' || lower.startsWith('track ') || lower.includes('track my order') || lower.includes('where is my order')) {
      const { Order } = require('../model/orderModel.js');
      const { User } = require('../model/userModel.js');
      const digits = phone.replace(/\D/g, '').slice(-10);
      // Find latest order by phone
      const { ShippingAddress } = require('../model/shippingAddressModel.js');
      const addr = await ShippingAddress.findOne({ where: { phone: { [Op.like]: `%${digits}` } }, order: [['createdAt', 'DESC']] });
      if (addr) {
        const order = await Order.findOne({ where: { shipping_address_id: addr.id }, order: [['createdAt', 'DESC']] });
        if (order) {
          const trackUrl = order.tracking_url || `https://crosscoin.in/OrderTracking?order=${order.order_number}`;
          const reply = `📦 Your latest order *#${order.order_number}*\nStatus: *${order.status}*\nAWB: ${order.tracking_number || 'Not assigned yet'}\n\nTrack here: ${trackUrl}`;
          await whatsappService.sendTextMessage(phone, reply, brandId);
          return;
        }
      }
      await whatsappService.sendTextMessage(phone, `We couldn't find an order linked to this number. Please share your order number (e.g. ORD-20240101-0001) and we'll help you right away!`, brandId);
      return;
    }

    if (lower === 'hi' || lower === 'hello' || lower === 'hey') {
      await whatsappService.sendTextMessage(phone, `👋 Hi! Welcome to *Cross Coin*.\n\nHow can we help you today?\n\nReply with:\n• *track* — Track your order\n• *return* — Return/exchange info\n• *help* — Talk to our team`, brandId);
      return;
    }

    if (lower === 'return' || lower.includes('return') || lower.includes('exchange')) {
      await whatsappService.sendTextMessage(phone, `↩️ *Returns & Exchanges*\n\nWe accept returns within 7 days of delivery.\n\nTo initiate a return, please share your order number and reason.\n\nOr visit: https://crosscoin.in/policy`, brandId);
      return;
    }

    if (lower === 'stop' || lower === 'unsubscribe' || lower === 'opt out') {
      await WhatsappConversation.update({ opted_out: true }, { where: { customer_phone: phone, brand_id: brandId } });
      await whatsappService.sendTextMessage(phone, `You've been unsubscribed from Cross Coin WhatsApp notifications. Reply *START* to re-subscribe.`, brandId);
      return;
    }

    if (lower === 'start' || lower === 'subscribe') {
      await WhatsappConversation.update({ opted_out: false }, { where: { customer_phone: phone, brand_id: brandId } });
      await whatsappService.sendTextMessage(phone, `✅ You're now subscribed to Cross Coin WhatsApp updates. You'll receive order notifications and offers.`, brandId);
      return;
    }

    // Task 18: Cancel window — customer replies CANCEL within 2h of COD order confirmation
    if (lower === 'cancel' || lower === 'cancel order') {
      try {
        const { Order } = require('../model/orderModel.js');
        const { OrderItem } = require('../model/orderItemModel.js');
        const { ProductVariation } = require('../model/productVariationModel.js');
        const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
        const { ShippingAddress } = require('../model/shippingAddressModel.js');
        const { Op } = require('sequelize');

        const digits = phone.replace(/\D/g, '').slice(-10);
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

        // Find most recent confirmed COD order for this phone within 2 hours
        const addr = await ShippingAddress.findOne({
          where: { phone: { [Op.like]: `%${digits}` } },
          order: [['createdAt', 'DESC']],
        });

        let order = null;
        if (addr) {
          order = await Order.findOne({
            where: {
              shipping_address_id: addr.id,
              status: 'confirmed',
              payment_type: 'cod',
              createdAt: { [Op.gte]: twoHoursAgo },
            },
            order: [['createdAt', 'DESC']],
          });
        }

        if (!order) {
          await whatsappService.sendTextMessage(
            phone,
            `Your order is already being processed and cannot be cancelled via WhatsApp.\n\nTo cancel, please contact our support team with your order number.`,
            brandId
          );
          return;
        }

        // Cancel the order
        order.status = 'cancelled';
        order.payment_status = 'cancelled';
        await order.save();

        // Restore stock
        const items = await OrderItem.findAll({ where: { order_id: order.id } });
        for (const item of items) {
          if (item.variation_id) {
            await ProductVariation.increment('stock', { by: item.quantity, where: { id: item.variation_id } });
          }
        }

        await OrderStatusHistory.create({
          order_id: order.id,
          status: 'cancelled',
          updated_by: null,
          notes: 'Cancelled by customer via WhatsApp',
          created_by: 'whatsapp_bot',
        });

        await whatsappService.sendTextMessage(
          phone,
          `✅ Your order *#${order.order_number}* has been cancelled successfully.\n\nIf you have any questions, reply *help* to talk to our team.`,
          brandId
        );
        logger.info(`Order ${order.order_number} cancelled via WhatsApp by ${phone}`);
      } catch (cancelErr) {
        logger.error('WA cancel order error: ' + cancelErr.message);
        await whatsappService.sendTextMessage(phone, `Sorry, we couldn't process your cancellation right now. Please contact support.`, brandId);
      }
      return;
    }
  } catch (err) {
    logger.warn('Auto-reply error: ' + err.message);
  }
}

// Patch receiveWebhook to call auto-reply
// ─── COD address confirmation from a customer's WhatsApp reply ────────────────
// Handles a free-text YES/NO and a quick-reply button tap (payload
// "confirm_cod_<orderNumber>" / "reject_cod_<orderNumber>"): confirms the
// address, advances the order to `confirmed`, and fires order.confirmed so the
// shipping sync can proceed. Called from the LIVE webhook handler below.
async function processCodReply(phone, kind, value, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { sequelize: sq } = require('../config/db.js');
  const { Op: OpCod } = require('sequelize');
  const whatsappSvc = require('../services/whatsappService.js');
  const notificationService = require('../services/notificationService.js');

  let pendingOrder = null;
  let intent = null; // 'confirm' | 'reject'

  if (kind === 'button') {
    const payload = String(value || '');
    if (payload.startsWith('confirm_cod_')) intent = 'confirm';
    else if (payload.startsWith('reject_cod_')) intent = 'reject';
    if (!intent) return;
    const orderNumber = payload.replace(/^(confirm|reject)_cod_/, '');
    pendingOrder = await Order.findOne({
      where: { order_number: orderNumber, status: 'awaiting_confirmation', payment_type: 'cod', cod_address_confirmed: false },
    });
  } else {
    const normalised = String(value || '').trim().toLowerCase();
    const confirmKeywords  = ['yes', 'confirm', 'confirmed', 'haan', 'ha', 'ok', 'correct', 'sahi hai', 'theek hai', 'right'];
    const rejectionKeywords = ['no', 'nahi', 'nope', 'wrong', 'incorrect', 'galat', 'change', 'update', 'different'];
    if (confirmKeywords.includes(normalised)) intent = 'confirm';
    else if (rejectionKeywords.some(k => normalised.includes(k))) intent = 'reject';
    if (!intent) return;
    const phoneDigits = phone.replace(/\D/g, '').slice(-10);
    pendingOrder = await Order.findOne({
      where: { status: 'awaiting_confirmation', payment_type: 'cod', cod_address_confirmed: false },
      include: [{ model: ShippingAddress, as: 'ShippingAddress', where: { phone: { [OpCod.like]: `%${phoneDigits}` } }, required: true }],
      order: [['created_at', 'DESC']],
    });
  }

  if (!pendingOrder) return;

  if (intent === 'confirm') {
    const t = await sq.transaction();
    try {
      await pendingOrder.update({ cod_address_confirmed: true, cod_address_confirmed_at: new Date(), status: 'confirmed' }, { transaction: t });
      await OrderStatusHistory.create({
        order_id: pendingOrder.id, status: 'confirmed',
        notes: `Auto-confirmed: customer ${kind === 'button' ? 'tapped Confirm Address' : 'replied YES'} via WhatsApp`,
        updated_by: null,
      }, { transaction: t });
      await t.commit();
    } catch (txErr) { await t.rollback(); throw txErr; }

    // Emitting order.confirmed sends the 'order_confirmation' (thank-you +
    // processing) template — no separate text here, so the customer gets ONE
    // clean confirmation message per the merged-stage design.
    const orderEmitter = require('../services/orderEvents.js');
    setImmediate(() => { try { orderEmitter.emit('order.confirmed', pendingOrder); } catch (e) { logger.warn('[WhatsApp] order.confirmed emit failed: ' + e.message); } });
    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_confirmed' });
    logger.info(`[WhatsApp] COD address confirmed → order ${pendingOrder.order_number}`);
  } else {
    // Wrong address → ask for the corrected address and remember which order the
    // customer's next message should update.
    const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
    await WhatsappConversation.update({ awaiting_address_for: pendingOrder.order_number }, { where: { customer_phone: phone } });
    const addr = await ShippingAddress.findByPk(pendingOrder.shipping_address_id).catch(() => null);
    const firstName = (addr?.full_name || '').split(' ')[0] || 'there';
    await whatsappSvc.sendAddressRequest(phone, { name: firstName, orderNumber: pendingOrder.order_number }, brandId);
    notificationService.emitNewOrder({ ...pendingOrder.toJSON(), _event: 'cod_address_rejected' });
    logger.warn(`[WhatsApp] COD address rejected → requested new address for ${pendingOrder.order_number}`);
  }
}

// ─── Capture a customer's corrected delivery address (Wrong Address flow) ─────
// Fired when the customer's text reply arrives while their conversation is
// flagged awaiting_address_for a specific order. Updates the shipping address
// (+ extracts the pincode) and re-sends the COD confirmation so they can confirm.
async function captureNewAddress(phone, addressText, orderNumber, brandId) {
  const { Order } = require('../model/orderModel.js');
  const { ShippingAddress } = require('../model/shippingAddressModel.js');
  const { WhatsappConversation } = require('../model/whatsappConversationModel.js');
  const whatsappSvc = require('../services/whatsappService.js');

  // Clear the flag first so we never double-capture the same reply.
  await WhatsappConversation.update({ awaiting_address_for: null }, { where: { customer_phone: phone } });

  const order = await Order.findOne({ where: { order_number: orderNumber, status: 'awaiting_confirmation', payment_type: 'cod' } });
  if (!order) return;
  const addr = await ShippingAddress.findByPk(order.shipping_address_id);
  if (!addr) return;

  const clean = String(addressText || '').trim();
  const pin = (clean.match(/\b(\d{6})\b/) || [])[1] || addr.pincode;
  await addr.update({ address: clean, pincode: pin });

  const firstName = (addr.full_name || '').split(' ')[0] || 'there';
  await whatsappSvc.sendCodConfirmation(phone, {
    name: firstName,
    orderNumber: order.order_number,
    amount: parseFloat(order.final_amount).toFixed(2),
    fullAddress: [addr.full_name, clean].filter(Boolean).join(', '),
  }, brandId);
  logger.info(`[WhatsApp] Captured corrected COD address for ${orderNumber} (pincode ${pin})`);
}

const _origReceiveWebhook = exports.receiveWebhook;
exports.receiveWebhook = async (req, res) => {
  res.status(200).json({ status: 'ok' });
  try {
    const body = req.body;
    if (body.object !== 'whatsapp_business_account') return;
    for (const entry of (body.entry || [])) {
      for (const change of (entry.changes || [])) {
        if (change.field !== 'messages') continue;
        const value = change.value;
        for (const msg of (value.messages || [])) {
          const phone       = msg.from;
          // Shared number → attribute this message to the customer's brand
          // (by their most recent order); tags the one-per-customer thread.
          const brandId     = await resolveBrandByPhone(phone);
          const contactName = value.contacts?.find(c => c.wa_id === phone)?.profile?.name || null;
          const waMessageId = msg.id;
          const sentAt      = new Date(parseInt(msg.timestamp) * 1000);

          // ── Resolve message type + body + media_url ──────────────────────
          let msgType = 'text';
          let text    = '';
          let mediaUrl = null;
          let mediaMime = null;
          let mediaCaption = null;
          let buttonPayload = null;

          switch (msg.type) {
            case 'text':
              msgType  = 'text';
              text     = msg.text?.body || '';
              break;
            case 'image':
              msgType      = 'image';
              mediaUrl     = msg.image?.url || msg.image?.id || null;
              mediaMime    = msg.image?.mime_type || 'image/jpeg';
              mediaCaption = msg.image?.caption || null;
              text         = mediaCaption || '📷 Image';
              break;
            case 'audio':
            case 'voice':
              msgType  = 'audio';
              mediaUrl = msg.audio?.url || msg.audio?.id || msg.voice?.url || msg.voice?.id || null;
              mediaMime = msg.audio?.mime_type || msg.voice?.mime_type || 'audio/ogg';
              text     = '🎤 Voice message';
              break;
            case 'video':
              msgType      = 'video';
              mediaUrl     = msg.video?.url || msg.video?.id || null;
              mediaMime    = msg.video?.mime_type || 'video/mp4';
              mediaCaption = msg.video?.caption || null;
              text         = mediaCaption || '🎥 Video';
              break;
            case 'document':
              msgType      = 'document';
              mediaUrl     = msg.document?.url || msg.document?.id || null;
              mediaMime    = msg.document?.mime_type || 'application/octet-stream';
              mediaCaption = msg.document?.filename || msg.document?.caption || null;
              text         = mediaCaption || '📎 Document';
              break;
            case 'sticker':
              msgType  = 'image';
              mediaUrl = msg.sticker?.url || msg.sticker?.id || null;
              text     = '🎭 Sticker';
              break;
            case 'location':
              msgType = 'text';
              text    = `📍 Location: ${msg.location?.name || ''} (${msg.location?.latitude}, ${msg.location?.longitude})`;
              break;
            case 'contacts':
              msgType = 'text';
              text    = `👤 Contact: ${msg.contacts?.[0]?.name?.formatted_name || 'Shared contact'}`;
              break;
            case 'reaction':
              msgType = 'reaction';
              text    = msg.reaction?.emoji || '👍';
              break;
            case 'button':
              // Quick-reply button tap (e.g. COD "Confirm Address").
              msgType       = 'button';
              buttonPayload = msg.button?.payload || msg.button?.text || '';
              text          = msg.button?.text || 'Button tap';
              break;
            case 'interactive':
              // Interactive reply (button_reply / list_reply) also carries a payload.
              msgType       = 'button';
              buttonPayload = msg.interactive?.button_reply?.id || msg.interactive?.list_reply?.id || '';
              text          = msg.interactive?.button_reply?.title || msg.interactive?.list_reply?.title || 'Selection';
              break;
            default:
              msgType = 'text';
              text    = `[${msg.type}]`;
          }

          // Only true media types store a JSON metadata blob in `body`; reactions
          // store the emoji, buttons store their payload, everything else the text.
          const MEDIA_TYPES = ['image', 'video', 'audio', 'document'];
          const bodyContent = MEDIA_TYPES.includes(msgType)
            ? JSON.stringify({ url: mediaUrl, mime: mediaMime, caption: mediaCaption, text })
            : (msgType === 'button' ? (buttonPayload || text) : text);

          const lastMsgPreview = msgType !== 'text' ? text : text;

          const [conv, created] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone },
            defaults: { brand_id: brandId, customer_name: contactName, wa_contact_id: phone, last_message: lastMsgPreview, last_message_at: sentAt, unread_count: 1, status: 'open' },
          });
          if (!created) {
            await conv.update({ brand_id: brandId, last_message: lastMsgPreview, last_message_at: sentAt, unread_count: conv.unread_count + 1, customer_name: contactName || conv.customer_name, status: 'open' });
          }

          await WhatsappMessage.create({
            conversation_id: conv.id,
            wa_message_id:   waMessageId,
            direction:       'inbound',
            type:            msgType,
            body:            bodyContent,
            status:          'received',
            sent_at:         sentAt,
          });

          const notificationService = require('../services/notificationService.js');
          notificationService.emitNewWhatsApp(phone, lastMsgPreview);
          logger.info(`WhatsApp inbound [${phone}] (${msgType}): ${lastMsgPreview}`);

          // COD flow:
          //  • if we're awaiting a corrected address from this customer, their
          //    next text IS the new address → capture it and re-confirm;
          //  • otherwise a text YES/NO or "Confirm Address" button advances the
          //    pending COD order to `confirmed`.
          if (msgType === 'text' && text && conv.awaiting_address_for) {
            const _orderNo = conv.awaiting_address_for;
            setImmediate(() => captureNewAddress(phone, text, _orderNo, brandId).catch(e => logger.error('[WhatsApp] capture address error: ' + e.message)));
          } else if (msgType === 'text' && text) {
            setImmediate(() => processCodReply(phone, 'text', text, brandId).catch(e => logger.error('[WhatsApp] COD text reply error: ' + e.message)));
          } else if (msgType === 'button' && buttonPayload) {
            setImmediate(() => processCodReply(phone, 'button', buttonPayload, brandId).catch(e => logger.error('[WhatsApp] COD button reply error: ' + e.message)));
          }

          // Auto-reply bot — only for plain text messages that aren't a captured
          // address (so the address text doesn't trip keyword auto-replies).
          if (msg.type === 'text' && !conv.awaiting_address_for) {
            setImmediate(() => handleAutoReply(phone, text, brandId).catch(() => {}));
          }
        }
        for (const status of (value.statuses || [])) {
          // Meta status updates: sent → delivered → read. (first_response_at is
          // stamped when an AGENT sends a reply — see sendReply — not on the
          // delivery of automated notifications, so SLA stays meaningful.)
          await WhatsappMessage.update({ status: status.status }, { where: { wa_message_id: status.id } });
        }
      }
    }
  } catch (err) {
    logger.error('WhatsApp webhook error: ' + err.message);
  }
};

// ─── Assign conversation to agent ─────────────────────────────────────────────
exports.assignConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { agentId } = req.body;
    const [updated] = await WhatsappConversation.update({ assigned_to: agentId || null }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Tag conversation ─────────────────────────────────────────────────────────
exports.tagConversation = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body; // comma-separated string
    const [updated] = await WhatsappConversation.update({ tags: tags || null }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Opt-out management ───────────────────────────────────────────────────────
exports.setOptOut = async (req, res) => {
  try {
    const { id } = req.params;
    const { opted_out } = req.body;
    const [updated] = await WhatsappConversation.update({ opted_out: !!opted_out }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Conversation not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Canned Responses ─────────────────────────────────────────────────────────
exports.getCannedResponses = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const rows = await WhatsappCannedResponse.findAll({ where: { brand_id: brandId }, order: [['shortcut', 'ASC']] });
    res.json({ success: true, cannedResponses: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createCannedResponse = async (req, res) => {
  try {
    const { brandId = 1, shortcut, title, body } = req.body;
    if (!shortcut || !title || !body) return res.status(400).json({ success: false, message: 'shortcut, title and body are required' });
    const row = await WhatsappCannedResponse.create({ brand_id: brandId, shortcut: shortcut.toLowerCase(), title, body, created_by: req.user?.id || null });
    res.json({ success: true, cannedResponse: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateCannedResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const { shortcut, title, body } = req.body;
    const [updated] = await WhatsappCannedResponse.update({ shortcut, title, body }, { where: { id } });
    if (!updated) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteCannedResponse = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await WhatsappCannedResponse.destroy({ where: { id } });
    if (!deleted) return res.status(404).json({ success: false, message: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Seed default canned responses ───────────────────────────────────────────
exports.seedCannedResponses = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;

    const defaults = [
      // Order related
      { shortcut: '/track',      title: 'Track Order',           body: `📦 To track your order, please visit:\nhttps://crosscoin.in/OrderTracking\n\nOr share your order number (e.g. ORD-20240101-0001) and I'll check it for you right away!` },
      { shortcut: '/orderstatus',title: 'Order Status',          body: `✅ Your order is currently being processed. You'll receive a shipping notification with tracking details once it's dispatched.\n\nUsually takes 1-2 business days. 😊` },
      { shortcut: '/delay',      title: 'Order Delay',           body: `🙏 We sincerely apologize for the delay in your order. Our team is working on it and it will be dispatched within 24 hours.\n\nWe appreciate your patience!` },
      { shortcut: '/shipped',    title: 'Order Shipped',         body: `🚚 Great news! Your order has been shipped.\n\nAWB: {{awb}}\nCourier: {{courier}}\n\nTrack here: https://crosscoin.in/OrderTracking` },
      { shortcut: '/cancel',     title: 'Cancel Order',          body: `We're sorry to hear you'd like to cancel. Please note:\n\n• Orders can be cancelled before dispatch\n• Once shipped, cancellation is not possible\n\nPlease share your order number and we'll check the status for you.` },

      // Returns & Refunds
      { shortcut: '/return',     title: 'Return Policy',         body: `↩️ *Return Policy*\n\nWe accept returns within *7 days* of delivery for:\n• Wrong product received\n• Damaged/defective item\n\nTo initiate a return, share:\n1. Order number\n2. Photo of the product\n3. Reason for return\n\nRefund is processed within 5-7 business days.` },
      { shortcut: '/refund',     title: 'Refund Status',         body: `💰 Refunds are processed within *5-7 business days* after we receive the returned item.\n\nThe amount will be credited to your original payment method.\n\nPlease share your order number to check the status.` },
      { shortcut: '/exchange',   title: 'Exchange Request',      body: `🔄 We'd be happy to help with an exchange!\n\nPlease share:\n1. Your order number\n2. Photo of the item\n3. The size/variant you'd like instead\n\nExchanges are processed within 3-5 business days.` },
      { shortcut: '/damaged',    title: 'Damaged Product',       body: `😔 We're really sorry you received a damaged product! This is not the experience we want for you.\n\nPlease share:\n1. Order number\n2. Clear photos of the damage\n\nWe'll arrange a replacement or full refund immediately.` },

      // Payment
      { shortcut: '/payment',    title: 'Payment Methods',       body: `💳 *Payment Options at Cross Coin:*\n\n• UPI (GPay, PhonePe, Paytm)\n• Credit/Debit Card\n• Net Banking\n• Cash on Delivery (COD)\n\nAll online payments are 100% secure. 🔒` },
      { shortcut: '/cod',        title: 'COD Info',              body: `🏠 *Cash on Delivery is available!*\n\nJust select COD at checkout. Please keep the exact amount ready at the time of delivery.\n\nNote: COD orders may take 1 extra day to process.` },
      { shortcut: '/paymentfail',title: 'Payment Failed',        body: `❌ Sorry your payment didn't go through! Here's what you can try:\n\n1. Check your bank balance\n2. Try a different payment method\n3. Clear browser cache and retry\n\nIf the amount was deducted but order wasn't placed, it will be auto-refunded in 5-7 days.` },

      // Product & Stock
      { shortcut: '/size',       title: 'Size Guide',            body: `📏 *Size Guide for Cross Coin Socks:*\n\n• S/M — Fits shoe size 5-8\n• L/XL — Fits shoe size 9-12\n\nWhen in doubt, size up! Our socks have good stretch. 😊\n\nNeed more help? Share your shoe size and I'll recommend the right size.` },
      { shortcut: '/stock',      title: 'Stock Availability',    body: `🔍 Let me check the stock for you! Please share the product name or link and I'll confirm availability right away.` },
      { shortcut: '/restock',    title: 'Restock Notification',  body: `🔔 I've noted your interest! We'll notify you on WhatsApp as soon as this product is back in stock.\n\nYou can also add it to your Wishlist on our website to get automatic alerts.` },
      { shortcut: '/bulk',       title: 'Bulk Order',            body: `📦 *Bulk Orders Welcome!*\n\nFor orders of 10+ pairs, we offer special pricing.\n\nPlease share:\n1. Product name\n2. Quantity needed\n3. Delivery timeline\n\nOur team will get back with a custom quote within 24 hours.` },

      // Shipping
      { shortcut: '/shipping',   title: 'Shipping Info',         body: `🚚 *Shipping Details:*\n\n• Prepaid orders: FREE shipping\n• COD orders: ₹50 shipping charge\n• Delivery time: 3-7 business days\n• We ship across India 🇮🇳\n\nExpress delivery available in select cities.` },
      { shortcut: '/address',    title: 'Change Address',        body: `📍 Address can be changed only *before the order is dispatched*.\n\nPlease share your order number and new address quickly and we'll update it for you!` },

      // General
      { shortcut: '/hi',         title: 'Welcome Greeting',      body: `👋 Hi! Welcome to *Cross Coin* — India's premium sock brand!\n\nHow can I help you today?\n\n• 📦 Track order → type /track\n• ↩️ Return/exchange → type /return\n• 💳 Payment help → type /payment\n• 📏 Size guide → type /size\n\nOr just type your question!` },
      { shortcut: '/thanks',     title: 'Thank You',             body: `🙏 Thank you for shopping with *Cross Coin*! We hope you love your purchase.\n\nDon't forget to leave us a review — it means the world to us! ⭐\n\nSee you again soon! 😊` },
    ];

    let created = 0; let skipped = 0;
    for (const cr of defaults) {
      const existing = await WhatsappCannedResponse.findOne({ where: { brand_id: brandId, shortcut: cr.shortcut } });
      if (!existing) {
        await WhatsappCannedResponse.create({ brand_id: brandId, ...cr });
        created++;
      } else { skipped++; }
    }
    res.json({ success: true, summary: { created, skipped } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Broadcast Campaigns ──────────────────────────────────────────────────────
exports.getBroadcasts = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const rows = await WhatsappBroadcast.findAll({ where: { brand_id: brandId }, order: [['createdAt', 'DESC']], limit: 50 });
    res.json({ success: true, broadcasts: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createBroadcast = async (req, res) => {
  try {
    const { brandId = 1, name, templateName, audienceFilter, scheduledAt } = req.body;
    if (!name || !templateName) return res.status(400).json({ success: false, message: 'name and templateName are required' });
    const row = await WhatsappBroadcast.create({
      brand_id: brandId, name, template_name: templateName,
      audience_filter: audienceFilter ? JSON.stringify(audienceFilter) : null,
      scheduled_at: scheduledAt || null,
      created_by: req.user?.id || null,
    });
    res.json({ success: true, broadcast: row });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.runBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const broadcast = await WhatsappBroadcast.findByPk(id);
    if (!broadcast) return res.status(404).json({ success: false, message: 'Broadcast not found' });
    if (broadcast.status === 'running') return res.status(400).json({ success: false, message: 'Already running' });

    await broadcast.update({ status: 'running', started_at: new Date() });
    res.json({ success: true, message: 'Broadcast started' });

    // Run in background
    setImmediate(async () => {
      try {
        const { User } = require('../model/userModel.js');
        const { Order } = require('../model/orderModel.js');
        const filter = broadcast.audience_filter ? JSON.parse(broadcast.audience_filter) : {};

        // Build audience: opted-in conversations for this brand
        const convWhere = { brand_id: broadcast.brand_id, opted_out: false };
        if (filter.tags) convWhere.tags = { [Op.like]: `%${filter.tags}%` };

        const convs = await WhatsappConversation.findAll({ where: convWhere, attributes: ['customer_phone', 'customer_name'] });
        const phones = convs.map(c => c.customer_phone);
        const paramsArray = convs.map(c => [c.customer_name || 'there']);

        await broadcast.update({ total_recipients: phones.length });

        const { sent, failed } = await whatsappService.sendBroadcast(phones, broadcast.template_name, paramsArray, broadcast.brand_id);
        await broadcast.update({ status: 'done', sent_count: sent, failed_count: failed, completed_at: new Date() });
        logger.info(`Broadcast ${broadcast.id} done: ${sent} sent, ${failed} failed`);
      } catch (err) {
        await broadcast.update({ status: 'failed' }).catch(() => {});
        logger.error('Broadcast run error: ' + err.message);
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── SLA / Analytics ─────────────────────────────────────────────────────────
exports.getSLAStats = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId) || 1;
    const { sequelize: sq } = require('../config/db.js');

    const [avgResponseTime, tagStats, agentStats] = await Promise.all([
      // Average first response time in minutes
      WhatsappConversation.findOne({
        where: { brand_id: brandId, first_response_at: { [Op.ne]: null } },
        attributes: [[sq.fn('AVG', sq.fn('TIMESTAMPDIFF', sq.literal('SECOND'), sq.col('createdAt'), sq.col('first_response_at'))), 'avg_seconds']],
        raw: true,
      }),
      // Conversations by tag
      sq.query(
        `SELECT tags, COUNT(*) as count FROM whatsapp_conversations WHERE brand_id = ? AND tags IS NOT NULL GROUP BY tags`,
        { replacements: [brandId], type: sq.QueryTypes.SELECT }
      ),
      // Conversations by assigned agent
      sq.query(
        `SELECT assigned_to, COUNT(*) as count FROM whatsapp_conversations WHERE brand_id = ? AND assigned_to IS NOT NULL GROUP BY assigned_to`,
        { replacements: [brandId], type: sq.QueryTypes.SELECT }
      ),
    ]);

    const avgSeconds = parseFloat(avgResponseTime?.avg_seconds || 0);
    res.json({
      success: true,
      sla: {
        avgFirstResponseMinutes: avgSeconds > 0 ? (avgSeconds / 60).toFixed(1) : null,
        tagStats,
        agentStats,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send catalog-FREE product card(s): photo + name/price + product link ─────
// No WhatsApp catalog / retailer_id needed — we send the product image by URL
// with a caption linking to the storefront. Works for every brand immediately.
exports.sendProductLink = async (req, res) => {
  try {
    const { id } = req.params;
    const productIds = Array.isArray(req.body.productIds)
      ? req.body.productIds
      : (req.body.productId ? [req.body.productId] : []);
    if (!productIds.length) return res.status(400).json({ success: false, message: 'productIds required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });
    const brand = conv.brand_id || parseInt(req.body.brandId) || 1;

    const { Product } = require('../model/productModel.js');
    const { ProductVariation } = require('../model/productVariationModel.js');
    const { ProductImage } = require('../model/productImageModel.js');
    const { Brand } = require('../model/brandModel.js');
    const settingsHelper = require('../services/settingsHelper.js');

    // Build the product link from the brand's OWN live domain. Prefer the Brand's
    // `domain` field (the authoritative custom domain), then its STORE_URL setting.
    const brandRow = await Brand.findByPk(brand);
    const storeUrl = String(
      brandRow?.domain
      || (await settingsHelper.getSetting(brand, 'STORE_URL', ''))
      || 'crosscoin.in'
    ).trim().replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Product-detail URL segment differs per storefront: 6 brands use
    // /products/<slug>, Velmique uses /product/<slug>. Allow a per-brand override
    // via the STORE_PRODUCT_PATH setting; otherwise default to 'products' and
    // special-case Velmique.
    let productPath = String(await settingsHelper.getSetting(brand, 'STORE_PRODUCT_PATH', '') || '').trim();
    if (!productPath) {
      const hint = `${brandRow?.domain || ''} ${brandRow?.name || ''} ${brandRow?.slug || ''}`.toLowerCase();
      productPath = /velmique/.test(hint) ? 'product' : 'products';
    }
    productPath = productPath.replace(/^\/+|\/+$/g, '');

    let sent = 0, lastSaved = null;
    for (const pid of productIds) {
      const product = await Product.findByPk(pid);
      if (!product) continue;
      const variation = await ProductVariation.findOne({ where: { productId: pid }, order: [['id', 'ASC']] });
      const image = await ProductImage.findOne({ where: { product_id: pid } });
      const price = variation?.price || product.price || null;
      let img = image?.image_url || null;
      if (img && !/^https?:\/\//i.test(img)) img = `https://${storeUrl}/${String(img).replace(/^\//, '')}`;
      const url = `https://${storeUrl}/${productPath}/${product.slug}`;
      const caption = `*${product.name}*${price ? `\n💰 ₹${price}` : ''}\n\n🛒 View & order:\n${url}`;

      let result;
      if (img) result = await whatsappService.sendImageLink(conv.customer_phone, img, caption, brand);
      else result = await whatsappService.sendTextMessage(conv.customer_phone, caption, brand);
      if (result?.rate_limited) return res.status(429).json({ success: false, message: 'Hourly message limit reached for this customer. Try again later.' });

      lastSaved = await WhatsappMessage.create({
        conversation_id: id,
        wa_message_id:   result?.messages?.[0]?.id || null,
        direction:       'outbound',
        type:            img ? 'image' : 'text',
        body:            img ? JSON.stringify({ url: img, mime: 'image/jpeg', caption, text: caption }) : caption,
        status:          'sent',
        sent_at:         new Date(),
      });
      sent++;
    }
    if (!sent) return res.status(400).json({ success: false, message: 'None of the selected products could be found' });

    await conv.update({ last_message: sent > 1 ? `🛍️ ${sent} products shared` : '🛍️ Product shared', last_message_at: new Date() });
    res.json({ success: true, sent, message: lastSaved });
  } catch (err) {
    logger.error('[WhatsApp] sendProductLink failed:', errMsg(err));
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Send product card to customer (interactive product message) ─────────────
exports.sendProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, variationId, brandId = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const { ProductVariation } = require('../model/productVariationModel.js');

    // Get variation (auto-pick first if not specified)
    let variation;
    if (variationId) {
      variation = await ProductVariation.findByPk(variationId);
      if (!variation || variation.productId !== productId) {
        return res.status(400).json({ success: false, message: 'Variation not found for this product' });
      }
    } else {
      variation = await ProductVariation.findOne({ where: { productId }, order: [['id', 'ASC']] });
      if (!variation) return res.status(400).json({ success: false, message: 'No variation found for this product' });
    }

    // Use whatsapp_retailer_id if synced, otherwise construct it (for backward compatibility)
    const retailerId = variation.whatsapp_retailer_id || `${productId}_${variation.id}`;

    // Warn if not synced to catalog
    if (!variation.whatsapp_retailer_id) {
      logger.warn(`Product ${productId}_${variation.id} not synced to WhatsApp catalog. This may fail if not in catalog.`);
    }

    const result = await whatsappService.sendProductCard(conv.customer_phone, retailerId, brandId);

    const saved = await WhatsappMessage.create({
      conversation_id: id,
      wa_message_id:   result?.messages?.[0]?.id || null,
      direction:       'outbound',
      type:            'template',
      body:            JSON.stringify({ type: 'product', retailerId }),
      status:          'sent',
      sent_at:         new Date(),
    });

    await conv.update({ last_message: '🛍️ Product shared', last_message_at: new Date() });
    res.json({ success: true, message: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Send catalogue section to customer ──────────────────────────────────────
exports.sendCatalogue = async (req, res) => {
  try {
    const { id } = req.params;
    // retailerIds: array of "{productId}_{variationId}" strings
    // OR productIds: array of productIds — we'll auto-resolve to first variation
    const { retailerIds, productIds, headerText, bodyText, brandId = 1 } = req.body;

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    let finalRetailerIds = retailerIds;

    // If only productIds provided, resolve each to whatsapp_retailer_id or "{productId}_{firstVariationId}"
    if (!finalRetailerIds?.length && productIds?.length) {
      const { ProductVariation } = require('../model/productVariationModel.js');
      finalRetailerIds = [];
      for (const pid of productIds) {
        const v = await ProductVariation.findOne({ where: { productId: pid }, order: [['id', 'ASC']] });
        if (v) {
          // Use synced whatsapp_retailer_id if available, fallback to constructed ID
          const rId = v.whatsapp_retailer_id || `${pid}_${v.id}`;
          finalRetailerIds.push(rId);
        }
      }
    }

    if (!finalRetailerIds?.length) return res.status(400).json({ success: false, message: 'No valid retailer IDs resolved' });

    const result = await whatsappService.sendCatalogueMessage(
      conv.customer_phone,
      finalRetailerIds,
      { headerText, bodyText },
      brandId
    );

    const saved = await WhatsappMessage.create({
      conversation_id: id,
      wa_message_id:   result?.messages?.[0]?.id || null,
      direction:       'outbound',
      type:            'template',
      body:            JSON.stringify({ type: 'catalogue', retailerIds: finalRetailerIds }),
      status:          'sent',
      sent_at:         new Date(),
    });

    await conv.update({ last_message: `🛍️ Catalogue shared (${finalRetailerIds.length} products)`, last_message_at: new Date() });
    res.json({ success: true, message: saved });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Media proxy — fetches media from Meta and streams to browser ─────────────
// GET /api/whatsapp/media/:mediaId?brandId=1
// The browser cannot call Meta directly (needs auth token), so we proxy it.
exports.proxyMedia = async (req, res) => {
  try {
    const { mediaId } = req.params;
    const brandId = parseInt(req.query.brandId) || 1;

    // Decode in case it was URL-encoded (full Facebook URLs)
    const decoded = decodeURIComponent(mediaId);

    let downloadUrl, mimeType;

    if (decoded.startsWith('http')) {
      // Full Facebook CDN URL — extract the media ID from the `mid` query param
      // Facebook CDN URLs expire but the mid can be used to re-fetch via Meta API
      try {
        const urlObj = new URL(decoded);
        const mid = urlObj.searchParams.get('mid');
        if (mid) {
          logger.info(`[MediaProxy] Extracted mid from expired URL: ${mid}`);
          const result = await whatsappService.getMediaUrl(mid, brandId);
          downloadUrl = result.url;
          mimeType = result.mimeType;
        } else {
          // No mid param — try direct fetch with auth
          downloadUrl = decoded;
          mimeType = 'application/octet-stream';
        }
      } catch (urlErr) {
        downloadUrl = decoded;
        mimeType = 'application/octet-stream';
      }
    } else {
      // Meta media ID — resolve to download URL first
      logger.info(`[MediaProxy] Calling Meta API for media ID: "${decoded}"`);
      try {
        const result = await whatsappService.getMediaUrl(decoded, brandId);
        downloadUrl = result.url;
        mimeType = result.mimeType;
        logger.info(`[MediaProxy] Got download URL: ${downloadUrl?.substring(0, 80)}`);
      } catch (metaErr) {
        logger.error(`[MediaProxy] Meta API error for ID "${decoded}": ${metaErr?.response?.data ? JSON.stringify(metaErr.response.data) : metaErr.message}`);
        throw metaErr;
      }
    }

    // Stream the bytes back to the browser
    const { stream, contentType, contentLength } = await whatsappService.downloadMedia(downloadUrl, brandId);

    res.setHeader('Content-Type', contentType || mimeType || 'application/octet-stream');
    res.setHeader('Cache-Control', 'private, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    res.setHeader('Accept-Ranges', 'bytes');

    stream.pipe(res);
    stream.on('error', () => res.status(500).end());
  } catch (err) {
    logger.error('Media proxy error: ' + err.message);
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

// ─── Back-in-stock: notify wishlisted customers ───────────────────────────────
exports.notifyBackInStock = async (req, res) => {
  try {
    const { productId, brandId = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId required' });

    const { Wishlist } = require('../model/wishlistModel.js');
    const { Product } = require('../model/productModel.js');
    const { User } = require('../model/userModel.js');

    const product = await Product.findByPk(productId);
    if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

    const wishlistItems = await Wishlist.findAll({
      where: { productId },
      include: [{ model: User, attributes: ['id', 'username', 'phone'] }],
    });

    let sent = 0;
    for (const item of wishlistItems) {
      const phone = item.User?.phone;
      if (!phone) continue;
      // Check opted out
      const conv = await WhatsappConversation.findOne({ where: { customer_phone: { [Op.like]: `%${phone.slice(-10)}` }, brand_id: brandId } });
      if (conv?.opted_out) continue;
      try {
        await whatsappService.sendBackInStock(phone, { productName: product.name, productSlug: product.slug }, brandId);
        sent++;
      } catch (e) { logger.warn('Back-in-stock WA failed: ' + e.message); }
    }

    res.json({ success: true, notified: sent, total: wishlistItems.length });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Sync all products to WhatsApp catalog
exports.syncProductsCatalog = async (req, res) => {
  try {
    const { brandId = 1 } = req.body;
    const result = await whatsappService.syncProductsToCatalog(brandId);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ success: false, message: errMsg(err) });
  }
};

'use strict';

const { WhatsappConversation, WhatsappMessage, WhatsappCannedResponse, WhatsappBroadcast } = require('../model/whatsappConversationModel.js');
const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');
const { Op } = require('sequelize');

// ─── Helpers ──────────────────────────────────────────────────────────────────
function errMsg(err) {
  return err?.response?.data?.error?.message || err?.message || 'Unknown error';
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
        const brandId = 1; // TODO: map phone_number_id → brand for multi-brand

        // ── Incoming messages ──
        for (const msg of (value.messages || [])) {
          const phone       = msg.from;
          const contactName = value.contacts?.find(c => c.wa_id === phone)?.profile?.name || null;
          const text        = msg.type === 'text' ? msg.text?.body : `[${msg.type}]`;
          const waMessageId = msg.id;
          const sentAt      = new Date(parseInt(msg.timestamp) * 1000);

          // findOrCreate returns [instance, created]
          const [conv, created] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone, brand_id: brandId },
            defaults: {
              customer_name:   contactName,
              wa_contact_id:   phone,
              last_message:    text,
              last_message_at: sentAt,
              unread_count:    1,
              status:          'open',
            },
          });

          if (!created) {
            await conv.update({
              last_message:    text,
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
            type:            msg.type === 'text' ? 'text' : 'document',
            body:            text,
            status:          'received',
            sent_at:         sentAt,
          });

          // Emit real-time notification
          const notificationService = require('../services/notificationService.js');
          notificationService.emitNewWhatsApp(phone, text);

          logger.info(`WhatsApp inbound [${phone}]: ${text}`);
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
    const brandId = parseInt(req.query.brandId) || 1;
    const status  = req.query.status || 'open';
    const page    = parseInt(req.query.page) || 1;
    const limit   = 20;

    const where = { brand_id: brandId };
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

    const messages = await WhatsappMessage.findAll({
      where: { conversation_id: id },
      order: [['sent_at', 'ASC'], ['createdAt', 'ASC']],
      limit: 100,
    });

    await conv.update({ unread_count: 0 });

    res.json({ success: true, conversation: conv, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Send reply ───────────────────────────────────────────────────────────────
exports.sendReply = async (req, res) => {
  try {
    const { id } = req.params;
    const { message, brandId = 1 } = req.body;

    if (!message?.trim()) return res.status(400).json({ success: false, message: 'Message is required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const result = await whatsappService.sendTextMessage(conv.customer_phone, message.trim(), brandId);

    const saved = await WhatsappMessage.create({
      conversation_id: id,
      wa_message_id:   result?.messages?.[0]?.id || null,
      direction:       'outbound',
      type:            'text',
      body:            message.trim(),
      status:          'sent',
      sent_at:         new Date(),
    });

    await conv.update({ last_message: message.trim(), last_message_at: new Date() });

    res.json({ success: true, message: saved });
  } catch (err) {
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
    const data = await whatsappService.listTemplates(brandId);
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

exports.seedTemplates = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brandId) || 1;
    const results = await whatsappService.seedDefaultTemplates(brandId);
    const created  = results.filter(r => r.status === 'created').length;
    const skipped  = results.filter(r => r.status === 'already_exists').length;
    const failed   = results.filter(r => r.status === 'error').length;
    res.json({ success: true, summary: { created, skipped, failed }, results });
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

    // Save conversation in DB so it appears in dashboard inbox
    const [conv, created] = await WhatsappConversation.findOrCreate({
      where: { customer_phone: normalizedPhone, brand_id: brandId },
      defaults: {
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
  } catch (err) {
    logger.warn('Auto-reply error: ' + err.message);
  }
}

// Patch receiveWebhook to call auto-reply
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
        const brandId = 1;
        for (const msg of (value.messages || [])) {
          const phone       = msg.from;
          const contactName = value.contacts?.find(c => c.wa_id === phone)?.profile?.name || null;
          const text        = msg.type === 'text' ? msg.text?.body : `[${msg.type}]`;
          const waMessageId = msg.id;
          const sentAt      = new Date(parseInt(msg.timestamp) * 1000);

          const [conv, created] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone, brand_id: brandId },
            defaults: { customer_name: contactName, wa_contact_id: phone, last_message: text, last_message_at: sentAt, unread_count: 1, status: 'open' },
          });
          if (!created) {
            await conv.update({ last_message: text, last_message_at: sentAt, unread_count: conv.unread_count + 1, customer_name: contactName || conv.customer_name, status: 'open' });
          }
          await WhatsappMessage.create({ conversation_id: conv.id, wa_message_id: waMessageId, direction: 'inbound', type: msg.type === 'text' ? 'text' : 'document', body: text, status: 'received', sent_at: sentAt });
          const notificationService = require('../services/notificationService.js');
          notificationService.emitNewWhatsApp(phone, text);
          logger.info(`WhatsApp inbound [${phone}]: ${text}`);
          // Auto-reply bot
          if (msg.type === 'text') {
            setImmediate(() => handleAutoReply(phone, text, brandId).catch(() => {}));
          }
        }
        for (const status of (value.statuses || [])) {
          await WhatsappMessage.update({ status: status.status }, { where: { wa_message_id: status.id } });
          // Track first response time for SLA
          if (status.status === 'delivered') {
            const msg = await WhatsappMessage.findOne({ where: { wa_message_id: status.id } });
            if (msg) {
              const conv = await WhatsappConversation.findByPk(msg.conversation_id);
              if (conv && !conv.first_response_at) {
                await conv.update({ first_response_at: new Date() });
              }
            }
          }
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

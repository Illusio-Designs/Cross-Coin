'use strict';

const { WhatsappConversation, WhatsappMessage } = require('../model/whatsappConversationModel.js');
const whatsappService = require('../services/whatsappService.js');
const { logger } = require('../config/logging.js');

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

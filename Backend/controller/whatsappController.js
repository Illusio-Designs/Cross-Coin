const { WhatsappConversation, WhatsappMessage } = require('../model/whatsappConversationModel.js');
const whatsappService = require('../services/whatsappService.js');
const settingsHelper = require('../services/settingsHelper.js');
const { logger } = require('../config/logging.js');
const { Op } = require('sequelize');

// ── Webhook verify (GET) ──────────────────────────────────────────────────────
exports.verifyWebhook = async (req, res) => {
  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'crosscoin_wa_verify';
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('WhatsApp webhook verified');
    return res.status(200).send(challenge);
  }
  return res.status(403).json({ error: 'Forbidden' });
};

// ── Webhook receive (POST) ────────────────────────────────────────────────────
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
        const brandId = 1; // TODO: map phone_number_id to brand if multi-brand

        // Handle incoming messages
        for (const msg of (value.messages || [])) {
          const phone = msg.from;
          const contactName = value.contacts?.find(c => c.wa_id === phone)?.profile?.name || null;
          const text = msg.type === 'text' ? msg.text?.body : `[${msg.type}]`;
          const waMessageId = msg.id;

          // Find or create conversation
          let [conv] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone, brand_id: brandId },
            defaults: { customer_name: contactName, wa_contact_id: phone, last_message: text, last_message_at: new Date(), unread_count: 1 }
          });

          if (conv._options?.isNewRecord === false) {
            await conv.update({
              last_message: text,
              last_message_at: new Date(),
              unread_count: conv.unread_count + 1,
              customer_name: contactName || conv.customer_name,
              status: 'open'
            });
          }

          // Save message
          await WhatsappMessage.create({
            conversation_id: conv.id,
            wa_message_id: waMessageId,
            direction: 'inbound',
            type: msg.type === 'text' ? 'text' : 'document',
            body: text,
            status: 'received',
            sent_at: new Date(parseInt(msg.timestamp) * 1000)
          });

          logger.info('WhatsApp inbound: ' + phone + ' — ' + text);
        }

        // Handle status updates (delivered, read)
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

// ── List conversations ────────────────────────────────────────────────────────
exports.getConversations = async (req, res) => {
  try {
    const brandId = req.query.brandId || 1;
    const status = req.query.status || 'open';
    const page = parseInt(req.query.page) || 1;
    const limit = 20;

    const where = { brand_id: brandId };
    if (status !== 'all') where.status = status;

    const { count, rows } = await WhatsappConversation.findAndCountAll({
      where,
      order: [['last_message_at', 'DESC']],
      limit,
      offset: (page - 1) * limit
    });

    res.json({ success: true, conversations: rows, total: count, page, pages: Math.ceil(count / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Get messages for a conversation ──────────────────────────────────────────
exports.getMessages = async (req, res) => {
  try {
    const { id } = req.params;
    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    const messages = await WhatsappMessage.findAll({
      where: { conversation_id: id },
      order: [['sent_at', 'ASC'], ['createdAt', 'ASC']],
      limit: 100
    });

    // Mark as read
    await conv.update({ unread_count: 0 });

    res.json({ success: true, conversation: conv, messages });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ── Send reply ────────────────────────────────────────────────────────────────
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
      wa_message_id: result?.messages?.[0]?.id || null,
      direction: 'outbound',
      type: 'text',
      body: message.trim(),
      status: 'sent',
      sent_at: new Date()
    });

    await conv.update({ last_message: message.trim(), last_message_at: new Date() });

    res.json({ success: true, message: saved });
  } catch (err) {
    const msg = err.response?.data?.error?.message || err.message;
    res.status(500).json({ success: false, message: msg });
  }
};

// ── Resolve conversation ──────────────────────────────────────────────────────
exports.resolveConversation = async (req, res) => {
  try {
    const { id } = req.params;
    await WhatsappConversation.update({ status: 'resolved' }, { where: { id } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

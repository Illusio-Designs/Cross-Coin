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
          } else {
            msgBody = `[${msg.type}]`;
            displayText = `[${msg.type}]`;
          }

          // findOrCreate returns [instance, created]
          const [conv, created] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone, brand_id: brandId },
            defaults: {
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

    // Attach quoted message data for replies
    const msgIds = messages.map(m => m.id);
    const quotedIds = messages.filter(m => m.quoted_message_id).map(m => m.quoted_message_id);
    let quotedMap = {};
    if (quotedIds.length > 0) {
      const quotedMsgs = await WhatsappMessage.findAll({ where: { id: quotedIds } });
      quotedMsgs.forEach(q => { quotedMap[q.id] = q; });
    }
    const messagesWithQuotes = messages.map(m => {
      const plain = m.toJSON();
      if (m.quoted_message_id && quotedMap[m.quoted_message_id]) {
        plain._quotedMsg = quotedMap[m.quoted_message_id].toJSON();
      }
      return plain;
    });

    await conv.update({ unread_count: 0 });

    res.json({ success: true, conversation: conv, messages: messagesWithQuotes });
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
          const waMessageId = msg.id;
          const sentAt      = new Date(parseInt(msg.timestamp) * 1000);

          // ── Resolve message type + body + media_url ──────────────────────
          let msgType = 'text';
          let text    = '';
          let mediaUrl = null;
          let mediaMime = null;
          let mediaCaption = null;

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
            default:
              msgType = 'text';
              text    = `[${msg.type}]`;
          }

          // Build metadata JSON stored in body for media messages
          const bodyContent = msgType !== 'text'
            ? JSON.stringify({ url: mediaUrl, mime: mediaMime, caption: mediaCaption, text })
            : text;

          const lastMsgPreview = msgType !== 'text' ? text : text;

          const [conv, created] = await WhatsappConversation.findOrCreate({
            where: { customer_phone: phone, brand_id: brandId },
            defaults: { customer_name: contactName, wa_contact_id: phone, last_message: lastMsgPreview, last_message_at: sentAt, unread_count: 1, status: 'open' },
          });
          if (!created) {
            await conv.update({ last_message: lastMsgPreview, last_message_at: sentAt, unread_count: conv.unread_count + 1, customer_name: contactName || conv.customer_name, status: 'open' });
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

          // Auto-reply bot — only for text messages
          if (msg.type === 'text') {
            setImmediate(() => handleAutoReply(phone, text, brandId).catch(() => {}));
          }
        }
        for (const status of (value.statuses || [])) {
          await WhatsappMessage.update({ status: status.status }, { where: { wa_message_id: status.id } });
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

// ─── Send product card to customer (interactive product message) ─────────────
exports.sendProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { productId, variationId, brandId = 1 } = req.body;
    if (!productId) return res.status(400).json({ success: false, message: 'productId required' });

    const conv = await WhatsappConversation.findByPk(id);
    if (!conv) return res.status(404).json({ success: false, message: 'Conversation not found' });

    // Build retailer ID matching catalogue feed format: "{productId}_{variationId}"
    let retailerId;
    if (variationId) {
      retailerId = `${productId}_${variationId}`;
    } else {
      // Auto-pick first variation
      const { ProductVariation } = require('../model/productVariationModel.js');
      const firstVar = await ProductVariation.findOne({ where: { productId }, order: [['id', 'ASC']] });
      if (!firstVar) return res.status(400).json({ success: false, message: 'No variation found for this product' });
      retailerId = `${productId}_${firstVar.id}`;
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

    // If only productIds provided, resolve each to "{productId}_{firstVariationId}"
    if (!finalRetailerIds?.length && productIds?.length) {
      const { ProductVariation } = require('../model/productVariationModel.js');
      finalRetailerIds = [];
      for (const pid of productIds) {
        const v = await ProductVariation.findOne({ where: { productId: pid }, order: [['id', 'ASC']] });
        if (v) finalRetailerIds.push(`${pid}_${v.id}`);
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

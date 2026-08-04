'use strict';

const axios = require('axios');
const { logger } = require('../config/logging.js');

// Ops alerts to Telegram. Configure with:
//   TELEGRAM_BOT_TOKEN  — from @BotFather
//   TELEGRAM_CHAT_ID    — one or more chat IDs (comma-separated). For a group,
//                         add the bot to the group and use the group's chat id.
// No-ops quietly when not configured, so it never breaks the order flow.
async function sendTelegram(text, { parseMode = 'HTML' } = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatIds = String(process.env.TELEGRAM_CHAT_ID || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  if (!token || !chatIds.length) return { skipped: true };

  const results = [];
  for (const chat_id of chatIds) {
    try {
      const res = await axios.post(
        `https://api.telegram.org/bot${token}/sendMessage`,
        { chat_id, text, parse_mode: parseMode, disable_web_page_preview: true },
        { timeout: 8000 },
      );
      results.push({ chat_id, ok: !!res.data?.ok });
    } catch (e) {
      logger.warn(`[Telegram] send to ${chat_id} failed: ${e.response?.data?.description || e.message}`);
      results.push({ chat_id, ok: false });
    }
  }
  return { results };
}

module.exports = { sendTelegram };

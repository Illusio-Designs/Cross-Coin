// Server-side check of an MSG91 OTP widget access token.
//
// The token only proves "someone verified SOME phone number", so it must be
// tied to the number the request is about: MSG91's verifyAccessToken answers
// { type: 'success', message: '91XXXXXXXXXX' } with the verified number, and
// that number has to equal the phone being logged in / checked out.
//
// Deliberately NOT accepted (each allowed logging in as any customer):
//  - an unverified jwt.decode() of the token (anyone can forge one),
//  - MSG91's "already verified" / 703 answers (no number to bind to — a token
//    verified for one phone could be replayed for another),
//  - the storefronts' 'dev-localhost-bypass' token, unless the server is
//    explicitly started with ALLOW_DEV_OTP_BYPASS=1 (local testing only).
const axios = require('axios');
const { logger } = require('../config/logging.js');

const last10 = (v) => String(v || '').replace(/\D/g, '').slice(-10);

async function verifyMsg91Token(accessToken, phone, tag = 'OTP') {
  const digits = last10(phone);
  if (!accessToken || digits.length !== 10) return { ok: false, reason: 'missing' };

  if (accessToken === 'dev-localhost-bypass') {
    if (process.env.ALLOW_DEV_OTP_BYPASS === '1') {
      logger.warn(`[${tag}] dev OTP bypass used for ••${digits.slice(-4)}`);
      return { ok: true };
    }
    return { ok: false, reason: 'bypass_disabled' };
  }

  const authKey = process.env.MSG91_AUTH_KEY;
  if (!authKey) {
    logger.error(`[${tag}] MSG91_AUTH_KEY is not set — OTP cannot be verified`);
    return { ok: false, reason: 'not_configured' };
  }

  try {
    const { data } = await axios.post(
      'https://control.msg91.com/api/v5/widget/verifyAccessToken',
      { authkey: authKey, 'access-token': accessToken },
      { headers: { 'Content-Type': 'application/json' }, timeout: 10000 },
    );
    if (data?.type !== 'success') {
      logger.warn(`[${tag}] MSG91 rejected the token: ${String(data?.message || '').slice(0, 120)}`);
      return { ok: false, reason: 'rejected' };
    }
    const verified = last10(data?.message);
    if (verified.length !== 10) {
      logger.error(`[${tag}] MSG91 success without a phone number — refusing (response: ${JSON.stringify(data).slice(0, 200)})`);
      return { ok: false, reason: 'no_number' };
    }
    if (verified !== digits) {
      logger.warn(`[${tag}] OTP was verified for ••${verified.slice(-4)} but the request is for ••${digits.slice(-4)}`);
      return { ok: false, reason: 'phone_mismatch' };
    }
    return { ok: true };
  } catch (err) {
    logger.warn(`[${tag}] MSG91 verify failed: status=${err.response?.status} ${String(err.response?.data?.message || err.message).slice(0, 120)}`);
    return { ok: false, reason: 'error' };
  }
}

module.exports = { verifyMsg91Token };

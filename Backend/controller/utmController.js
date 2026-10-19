const UTMTracking = require('../model/utmModel');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../config/logging.js');
const { isBotUserAgent } = require('../utils/botDetect');
// Referrer → source/medium classification (incl. self-referral exclusion) lives
// in utils/channel so the tracker, the report and the anonymous counter agree.
const { deriveSource, deriveMedium } = require('../utils/channel');

// Track UTM parameters
exports.trackUTM = async (req, res) => {
  try {
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      utm_creative,
      landing_page,
      referrer
    } = req.body;

    // Get session ID from cookie or create new one
    let sessionId = req.cookies?.session_id;
    logger.info('🍪 UTM Tracking - Cookies received:', req.cookies);
    logger.info('🔑 UTM Tracking - Session ID from cookie:', sessionId);
    
    if (!sessionId) {
      sessionId = uuidv4();
      logger.info('🆕 UTM Tracking - Creating new session ID:', sessionId);
      
      // Set cookie with proper domain for cross-subdomain sharing
      const cookieOptions = {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-domain in production
        domain: process.env.NODE_ENV === 'production' ? '.crosscoin.in' : undefined // Share across subdomains
      };
      
      res.cookie('session_id', sessionId, cookieOptions);
      logger.info('🍪 UTM Tracking - Cookie set with options:', cookieOptions);
    } else {
      logger.info('✅ UTM Tracking - Using existing session ID:', sessionId);
    }

    // Get user info
    const userId = req.user ? req.user.id : null;
    const guestUserId = req.guestUser ? req.guestUser.id : null;

    // Get IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];
    const brandId = req.brand?.id || null;

    // Drop bot / crawler / monitor traffic so it never enters the funnel counts.
    if (isBotUserAgent(userAgent)) {
      return res.status(200).json({ success: true, skipped: 'bot' });
    }

    // Derive a channel when the visit carries no UTM params so organic/direct
    // traffic is still classified in the report (not just paid campaigns).
    const source = utm_source || deriveSource(referrer);
    const medium = utm_medium || (utm_source ? null : deriveMedium(referrer));

    // One row per session = one "visit"/session in the traffic report. The FIRST
    // touch wins (keeps the landing page + original source that brought them in);
    // repeat pings within the same session don't inflate the count.
    const [utmRecord] = await UTMTracking.findOrCreate({
      where: { session_id: sessionId },
      defaults: {
        user_id: userId,
        guest_user_id: guestUserId,
        session_id: sessionId,
        brand_id: brandId,
        utm_source: source,
        utm_medium: medium,
        utm_campaign,
        utm_term,
        utm_content,
        utm_creative,
        landing_page,
        referrer,
        ip_address: ipAddress,
        user_agent: userAgent,
      },
    });

    // Backfill identity/brand on an existing session row if we learn them later
    // (e.g. a guest logs in, or the first ping missed the brand header).
    const patch = {};
    if (brandId && !utmRecord.brand_id) patch.brand_id = brandId;
    if (userId && !utmRecord.user_id) patch.user_id = userId;
    if (guestUserId && !utmRecord.guest_user_id) patch.guest_user_id = guestUserId;
    if (Object.keys(patch).length) await utmRecord.update(patch);

    res.status(201).json({
      success: true,
      message: 'UTM data tracked successfully',
      data: utmRecord
    });
  } catch (error) {
    logger.error('Error tracking UTM:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking UTM data',
      error: error.message
    });
  }
};


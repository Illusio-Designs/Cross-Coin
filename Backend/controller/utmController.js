const UTMTracking = require('../model/utmModel');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');
const { logger } = require('../config/logging.js');
const { isBotUserAgent } = require('../utils/botDetect');

// Classify a visit that carries no UTM parameters by its referrer so the
// traffic report can still bucket organic / social / direct / referral.
function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, '').toLowerCase(); }
  catch { return ''; }
}
function deriveSource(referrer) {
  const h = hostOf(referrer);
  if (!h) return 'direct';
  // AI assistants first — some live on google/bing/microsoft subdomains, so
  // they must be matched before the search-engine checks below.
  if (/(chatgpt|openai)/.test(h)) return 'chatgpt';
  if (/perplexity/.test(h)) return 'perplexity';
  if (/gemini\.google|bard\.google|gemini\./.test(h)) return 'gemini';
  if (/copilot|(^|\.)bing\.com.*chat/.test(h)) return 'copilot';
  if (/claude\.ai|anthropic/.test(h)) return 'claude';
  if (/(poe\.com|phind|deepseek|you\.com|grok|meta\.ai)/.test(h)) return 'ai';
  if (/google\./.test(h)) return 'google';
  if (/bing\./.test(h)) return 'bing';
  if (/duckduckgo\./.test(h)) return 'duckduckgo';
  if (/(facebook|fb)\./.test(h) || h === 'l.facebook.com') return 'facebook';
  if (/instagram\./.test(h)) return 'instagram';
  if (/(youtube|youtu\.be)/.test(h)) return 'youtube';
  if (/(twitter|t\.co|x\.com)/.test(h)) return 'twitter';
  if (/(whatsapp|wa\.me)/.test(h)) return 'whatsapp';
  if (/linkedin\./.test(h)) return 'linkedin';
  return h; // any other referring domain
}
function deriveMedium(referrer) {
  const h = hostOf(referrer);
  if (!h) return 'none'; // direct
  if (/(google|bing|duckduckgo|yahoo)\./.test(h)) return 'organic';
  if (/(facebook|fb|instagram|youtube|youtu\.be|twitter|t\.co|x\.com|linkedin|whatsapp|wa\.me)/.test(h)) return 'social';
  return 'referral';
}

// Track UTM parameters
exports.trackUTM = async (req, res) => {
  try {
    const {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
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

// Get UTM data by session
exports.getUTMBySession = async (req, res) => {
  try {
    const sessionId = req.cookies?.session_id;
    
    if (!sessionId) {
      return res.status(404).json({
        success: false,
        message: 'No session found'
      });
    }

    const utmData = await UTMTracking.findAll({
      where: { session_id: sessionId },
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: utmData
    });
  } catch (error) {
    logger.error('Error fetching UTM data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UTM data',
      error: error.message
    });
  }
};

// Get UTM analytics
exports.getUTMAnalytics = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const whereClause = {};
    if (startDate && endDate) {
      whereClause.created_at = {
        [Op.between]: [new Date(startDate), new Date(endDate)]
      };
    }

    const analytics = await UTMTracking.findAll({
      where: whereClause,
      attributes: [
        'utm_source',
        'utm_medium',
        'utm_campaign',
        [sequelize.fn('COUNT', sequelize.col('id')), 'count']
      ],
      group: ['utm_source', 'utm_medium', 'utm_campaign'],
      raw: true
    });

    res.status(200).json({
      success: true,
      data: analytics
    });
  } catch (error) {
    logger.error('Error fetching analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching analytics',
      error: error.message
    });
  }
};


// Get all UTM tracking data with order information (Admin only)
exports.getAllUTMData = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const { Order } = require('../model/orderModel.js');

    const whereClause = {};
    if (startDate && endDate) {
      // Set start date to beginning of day
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      
      // Set end date to end of day
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      
      whereClause.created_at = {
        [Op.between]: [start, end]
      };
    }

    logger.info('getAllUTMData whereClause:', whereClause);

    const utmData = await UTMTracking.findAll({
      where: whereClause,
      include: [
        {
          model: Order,
          as: 'Orders',
          attributes: ['id', 'order_number', 'final_amount', 'status', 'created_at'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']]
    });

    logger.info('getAllUTMData result count:', utmData.length);

    res.status(200).json({
      success: true,
      data: utmData
    });
  } catch (error) {
    logger.error('Error fetching all UTM data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UTM data',
      error: error.message
    });
  }
};

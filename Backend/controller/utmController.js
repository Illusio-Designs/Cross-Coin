const { UTMTracking } = require('../model/utmModel');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db');

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
    console.log('🍪 UTM Tracking - Cookies received:', req.cookies);
    console.log('🔑 UTM Tracking - Session ID from cookie:', sessionId);
    
    if (!sessionId) {
      sessionId = uuidv4();
      console.log('🆕 UTM Tracking - Creating new session ID:', sessionId);
      
      // Set cookie with proper domain for cross-subdomain sharing
      const cookieOptions = {
        maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // 'none' for cross-domain in production
        domain: process.env.NODE_ENV === 'production' ? '.crosscoin.in' : undefined // Share across subdomains
      };
      
      res.cookie('session_id', sessionId, cookieOptions);
      console.log('🍪 UTM Tracking - Cookie set with options:', cookieOptions);
    } else {
      console.log('✅ UTM Tracking - Using existing session ID:', sessionId);
    }

    // Get user info
    const userId = req.user ? req.user.id : null;
    const guestUserId = req.guestUser ? req.guestUser.id : null;

    // Get IP and user agent
    const ipAddress = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const utmRecord = await UTMTracking.create({
      user_id: userId,
      guest_user_id: guestUserId,
      session_id: sessionId,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_term,
      utm_content,
      landing_page,
      referrer,
      ip_address: ipAddress,
      user_agent: userAgent
    });

    res.status(201).json({
      success: true,
      message: 'UTM data tracked successfully',
      data: utmRecord
    });
  } catch (error) {
    console.error('Error tracking UTM:', error);
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
    console.error('Error fetching UTM data:', error);
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
    console.error('Error fetching analytics:', error);
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

    console.log('getAllUTMData whereClause:', whereClause);

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

    console.log('getAllUTMData result count:', utmData.length);

    res.status(200).json({
      success: true,
      data: utmData
    });
  } catch (error) {
    console.error('Error fetching all UTM data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching UTM data',
      error: error.message
    });
  }
};

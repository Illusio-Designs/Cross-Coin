const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const { logger } = require('../config/logging.js');
const systemHealth = require('../services/systemHealthService');

// GET /api/admin/system/health — server, job queue, webhooks, errors in 24 h
// and every scheduled job with its last run, next run and last 10 runs.
// Admin only (the dashboard's System health page polls it every 60 s).
router.get('/health', authenticate, isAdmin, async (req, res) => {
  try {
    const data = await systemHealth.getHealth();
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, ...data });
  } catch (error) {
    logger.error('System health error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load system health' });
  }
});

// POST /api/admin/system/jobs/:key/run — run a scheduled job now, through the
// same logged wrapper. 409 while it is already running.
router.post('/jobs/:key/run', authenticate, isAdmin, async (req, res) => {
  try {
    const { status, body } = await systemHealth.runJobNow(String(req.params.key), req.user?.id);
    return res.status(status).json(body);
  } catch (error) {
    logger.error('Run job now error:', error);
    return res.status(500).json({ success: false, message: 'Failed to start the job' });
  }
});

module.exports = router;

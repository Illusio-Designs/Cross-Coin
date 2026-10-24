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

// ── Server logs (Server Watch) ─────────────────────────────────────────────
const serverWatch = require('../services/serverWatchService');

// GET /api/admin/system/server-logs?hours=24&brand=morbix&level=error&q=checkout
// Request counts per hour and per store, logged problems, alerts and the
// alert settings. brand: a store slug, '-' for requests without a store.
router.get('/server-logs', authenticate, isAdmin, async (req, res) => {
  try {
    const data = await serverWatch.overview({ hours: req.query.hours, level: String(req.query.level || ''), search: String(req.query.q || ''), brand: String(req.query.brand || '') });
    res.set('Cache-Control', 'no-store');
    return res.json({ success: true, ...data });
  } catch (error) {
    logger.error('Server logs error:', error);
    return res.status(500).json({ success: false, message: 'Failed to load server logs' });
  }
});

// PUT /api/admin/system/server-logs/settings — recipients, alert hours, rules.
router.put('/server-logs/settings', authenticate, isAdmin, async (req, res) => {
  try {
    const settings = await serverWatch.saveSettings(req.body || {}, req.user?.id);
    return res.json({ success: true, settings });
  } catch (error) {
    logger.error('Server logs settings error:', error);
    return res.status(500).json({ success: false, message: 'Failed to save the settings' });
  }
});

// POST /api/admin/system/server-logs/test — send a test alert to everyone.
router.post('/server-logs/test', authenticate, isAdmin, async (req, res) => {
  try {
    const result = await serverWatch.sendTest();
    return res.json({ success: true, result });
  } catch (error) {
    logger.error('Server logs test error:', error);
    return res.status(500).json({ success: false, message: 'Failed to send the test alert' });
  }
});

module.exports = router;

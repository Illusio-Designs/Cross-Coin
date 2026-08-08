const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const ctrl = require('../controller/adsReportController.js');

// All ads-report endpoints are admin-only.
router.use(authenticate, isAdmin);

router.get('/report', ctrl.getReport);
router.get('/settings', ctrl.getSettings);
router.post('/settings', ctrl.saveSettings);
router.get('/spend', ctrl.getSpend);
router.post('/spend', ctrl.saveSpend);
router.delete('/spend/:id', ctrl.deleteSpend);

// Meta (Facebook) spend sync — pull daily ad spend straight from Meta.
router.get('/meta/config', ctrl.getMetaConfig);
router.post('/meta/config', ctrl.saveMetaConfig);
router.post('/meta/sync', ctrl.syncMetaSpend);

module.exports = router;

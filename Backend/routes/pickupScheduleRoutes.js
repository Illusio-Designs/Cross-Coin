const express = require('express');
const router = express.Router();
const ctrl = require('../controller/pickupScheduleController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');

// Admin — read / update the shared pickup schedule.
router.get('/', authenticate, isAdmin, ctrl.getPickupSchedule);
router.put('/', authenticate, isAdmin, ctrl.setPickupSchedule);
// Helper — the next allowed pickup date.
router.get('/next', ctrl.getNextPickupDate);
// Admin — orders already booked whose pickup falls in a date range (a new block
// can't hold these). Powers the "already booked" warning in the schedule modal.
router.get('/affected', authenticate, isAdmin, ctrl.getAffectedBookedOrders);

module.exports = router;

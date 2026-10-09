const svc = require('../services/pickupScheduleService.js');
const { logger } = require('../config/logging.js');

// GET /api/pickup-schedule — current shared schedule + the next pickup date.
exports.getPickupSchedule = async (req, res) => {
  try {
    const schedule = await svc.getSchedule();
    const nextDate = await svc.getNextPickupDate();
    res.json({ success: true, schedule, nextDate });
  } catch (err) {
    logger.error('getPickupSchedule: ' + err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/pickup-schedule — admin saves weekly offs / blocked dates / cutoff.
exports.setPickupSchedule = async (req, res) => {
  try {
    const schedule = await svc.setSchedule(req.body || {});
    const nextDate = await svc.getNextPickupDate();
    res.json({ success: true, schedule, nextDate });
  } catch (err) {
    logger.error('setPickupSchedule: ' + err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/pickup-schedule/next — the next allowed pickup date.
exports.getNextPickupDate = async (req, res) => {
  try {
    res.json({ success: true, nextDate: await svc.getNextPickupDate() });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/pickup-schedule/affected?from=YYYY-MM-DD&to=YYYY-MM-DD
// Orders that are ALREADY booked (have an AWB, still awaiting pickup) whose
// courier pickup would fall inside the given date range — i.e. the ones a new
// block CANNOT hold, because they're already handed to the courier. Used to warn
// the admin before they block a date. Pickup day ≈ the next working day after
// the order was booked (iThink auto-schedules it; there's no reschedule API).
exports.getAffectedBookedOrders = async (req, res) => {
  try {
    const ymd = (s) => String(s || '').slice(0, 10);
    const from = ymd(req.query.from);
    const to = ymd(req.query.to) || from;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(from)) {
      return res.status(400).json({ success: false, message: 'from (YYYY-MM-DD) is required' });
    }
    const { Order } = require('../model/orderModel.js');
    const { Op } = require('sequelize');
    // Only recently-booked, still-awaiting-pickup orders can be affected; bound
    // the scan to the last 7 days of bookings so this stays cheap.
    const sevenDaysAgo = new Date(Date.now() - 7 * 864e5);
    const candidates = await Order.findAll({
      where: {
        fship_waybill: { [Op.ne]: null },
        status: 'processing', // booked, not yet picked up / manifested
        fship_last_synced_at: { [Op.gte]: sevenDaysAgo },
      },
      attributes: ['order_number', 'fship_last_synced_at'],
      order: [['fship_last_synced_at', 'DESC']],
      limit: 500,
    });
    const affected = [];
    for (const o of candidates) {
      const pick = svc.prospectivePickupDate(o.fship_last_synced_at || new Date());
      if (pick >= from && pick <= to) affected.push({ orderNumber: o.order_number, pickupDate: pick });
    }
    res.json({ success: true, count: affected.length, orders: affected.slice(0, 50) });
  } catch (err) {
    logger.error('getAffectedBookedOrders: ' + err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};

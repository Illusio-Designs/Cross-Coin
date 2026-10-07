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

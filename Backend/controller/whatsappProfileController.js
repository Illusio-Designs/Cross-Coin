'use strict';

// WhatsApp → Profile (admins only). Thin HTTP layer over
// services/whatsappProfileService.js.

const svc = require('../services/whatsappProfileService.js');
const { logger } = require('../config/logging.js');
const { hasAnyRole } = require('../middleware/authMiddleware.js');

// Known errors (not configured, Meta refused) carry a status; anything else is
// a bug on our side — log it without request data (it may hold the token).
const fail = (res, err, where) => {
  if (err && err.status) {
    return res.status(err.status).json({ success: false, code: err.code || undefined, message: err.message });
  }
  logger.error(`[wa-profile] ${where} failed: ${err && err.message}`);
  return res.status(500).json({ success: false, message: 'Something went wrong on our server. Try again in a minute.' });
};
const send = (res, { status, body }) => res.status(status).json(body);
const userId = (req) => (req.user && req.user.id) || null;

exports.getProfile = async (req, res) => {
  try {
    const data = await svc.getProfile({
      refresh: req.query.refresh === '1' || req.query.refresh === 'true',
      includeFull: hasAnyRole(req.user, ['admin']),
    });
    res.json({ success: true, ...data });
  } catch (err) { fail(res, err, 'getProfile'); }
};

exports.updateProfile = async (req, res) => {
  try { send(res, await svc.updateProfile(req.body, userId(req))); } catch (err) { fail(res, err, 'updateProfile'); }
};

exports.uploadPhoto = async (req, res) => {
  try { send(res, await svc.uploadPhoto(req.file, userId(req))); } catch (err) { fail(res, err, 'uploadPhoto'); }
};

exports.requestName = async (req, res) => {
  try { send(res, await svc.requestNameChange(req.body && req.body.name, userId(req))); } catch (err) { fail(res, err, 'requestName'); }
};

exports.getKeys = async (req, res) => {
  try { res.json({ success: true, ...(await svc.getKeys()) }); } catch (err) { fail(res, err, 'getKeys'); }
};

exports.saveKeys = async (req, res) => {
  try { send(res, await svc.saveKeys(req.body, userId(req))); } catch (err) { fail(res, err, 'saveKeys'); }
};

exports.storesIdentity = async (req, res) => {
  try { res.json({ success: true, ...(await svc.storesIdentity()) }); } catch (err) { fail(res, err, 'storesIdentity'); }
};

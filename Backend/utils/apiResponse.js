'use strict';

/**
 * Standardized API response helpers.
 * All responses follow: { success, data, error, meta }
 */

const ok = (res, data = {}, meta = {}) =>
  res.json({ success: true, data, error: null, ...( Object.keys(meta).length ? { meta } : {}) });

const created = (res, data = {}) =>
  res.status(201).json({ success: true, data, error: null });

const badRequest = (res, message) =>
  res.status(400).json({ success: false, data: null, error: message });

const unauthorized = (res, message = 'Unauthorized') =>
  res.status(401).json({ success: false, data: null, error: message });

const forbidden = (res, message = 'Forbidden') =>
  res.status(403).json({ success: false, data: null, error: message });

const notFound = (res, message = 'Not found') =>
  res.status(404).json({ success: false, data: null, error: message });

const conflict = (res, message) =>
  res.status(409).json({ success: false, data: null, error: message });

const serverError = (res, message = 'Internal server error') =>
  res.status(500).json({ success: false, data: null, error: message });

module.exports = { ok, created, badRequest, unauthorized, forbidden, notFound, conflict, serverError };

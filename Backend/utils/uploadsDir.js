'use strict';

const path = require('path');

/**
 * The one folder every local upload lives in (served at /api/uploads).
 *
 * UPLOAD_PATH may be relative to Backend/ (default 'uploads') or absolute. The
 * admin API app (admin-api.crosscoin.in) runs from its own folder, so it sets
 * UPLOAD_PATH to the store app's Backend/uploads: files it saves are then
 * served by api.crosscoin.in, where every saved image URL points.
 */
module.exports = path.resolve(__dirname, '..', process.env.UPLOAD_PATH || 'uploads');

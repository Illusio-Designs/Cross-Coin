'use strict';

/**
 * Load the environment before anything else reads process.env.
 *
 * 1. This app's own .env (from the app folder), as before.
 * 2. The admin API copy (APP_ROLE=admin, set in cPanel → Setup Node.js App;
 *    folder AdminBackend/ next to Backend/) has no .env of its own: it reads
 *    the main API's file, SHARED_ENV_FILE or ../Backend/.env, so both apps
 *    always run with the same keys and there is only one file to keep up to
 *    date. Its local uploads default to the main app's Backend/uploads, which
 *    api.crosscoin.in serves.
 *
 * dotenv never overrides a value that is already set, so cPanel's app
 * variables win over either file.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ quiet: true });

if (String(process.env.APP_ROLE || '').toLowerCase() === 'admin') {
  const mainApp = path.resolve(__dirname, '..', '..', 'Backend');
  const shared = process.env.SHARED_ENV_FILE ? path.resolve(process.env.SHARED_ENV_FILE) : path.join(mainApp, '.env');
  if (fs.existsSync(shared)) dotenv.config({ path: shared, quiet: true });
  else console.warn(`[env] APP_ROLE=admin but ${shared} was not found: set SHARED_ENV_FILE or give this app its own .env`);
  if (!process.env.UPLOAD_PATH) process.env.UPLOAD_PATH = path.join(mainApp, 'uploads');
}

'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Structured Logger — production-grade logging.
 *
 * Features:
 * - Human-readable plain text output (console + files)
 * - File logging (logs/app.log, logs/error.log)
 * - Log levels: debug, info, warn, error
 * - Request context (requestId, userId, url)
 * - Auto-creates logs directory
 */

const LOG_DIR = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });

const LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const ENV = process.env.NODE_ENV || 'development';
const MIN_LEVEL = ENV === 'production' ? 'warn' : ENV === 'test' ? 'error' : 'debug';

// File streams — append mode, auto-flush
let appStream, errorStream;
try {
  appStream = fs.createWriteStream(path.join(LOG_DIR, 'app.log'), { flags: 'a' });
  errorStream = fs.createWriteStream(path.join(LOG_DIR, 'error.log'), { flags: 'a' });
} catch (_) {
  // Fallback: no file logging if directory isn't writable
}

function shouldLog(level) {
  return LEVELS[level] >= LEVELS[MIN_LEVEL];
}

/**
 * Format data into a readable key=value string.
 * Objects become key=value pairs, Errors show message + stack in dev.
 */
function formatData(data) {
  if (!data) return '';
  if (data instanceof Error) {
    const stack = ENV !== 'production' && data.stack ? `\n${data.stack}` : '';
    return data.message + stack;
  }
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const parts = [];
    for (const [k, v] of Object.entries(data)) {
      if (v === null || v === undefined) continue;
      parts.push(`${k}=${typeof v === 'object' ? JSON.stringify(v) : v}`);
    }
    return parts.join(' ');
  }
  return String(data);
}

function formatLine(level, message, data) {
  const ts = new Date().toISOString();
  const dataStr = formatData(data);
  return `${ts} ${level.toUpperCase().padEnd(5)} ${message}${dataStr ? ' ' + dataStr : ''}`;
}

function writeToFile(stream, line) {
  if (stream && !stream.destroyed) {
    try { stream.write(line + '\n'); } catch (_) {}
  }
}

function log(level, message, data) {
  if (!shouldLog(level)) return;

  const line = formatLine(level, message, data);

  // Console output — always plain text
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);

  // File output — plain text
  writeToFile(appStream, line);
  if (level === 'error' || level === 'warn') writeToFile(errorStream, line);

  // Forward errors to Sentry (no-op unless SENTRY_DSN is set). Lazy-required
  // so this file has no hard dependency on the SDK, and wrapped so logging can
  // never throw.
  if (level === 'error' && process.env.SENTRY_DSN) {
    try {
      const Sentry = require('@sentry/node');
      if (data instanceof Error) {
        Sentry.captureException(data, { extra: { message } });
      } else if (data && data.stack) {
        const err = new Error(data.message || message);
        err.stack = data.stack;
        Sentry.captureException(err, { extra: { message } });
      } else {
        Sentry.captureMessage(message, { level: 'error', extra: { data } });
      }
    } catch (_) { /* never let logging break the request */ }
  }
}

const logger = {
  debug: (msg, data) => log('debug', msg, data),
  info:  (msg, data) => log('info', msg, data),
  warn:  (msg, data) => log('warn', msg, data),
  error: (msg, data) => log('error', msg, data),
};

/**
 * Express middleware — logs every request with timing.
 * Adds req.requestId for tracing.
 */
function requestLogger(req, res, next) {
  if (ENV === 'production' && req.path === '/api/health') return next();

  req.requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const entry = {
      requestId: req.requestId,
      method: req.method,
      url: req.originalUrl,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userId: req.user?.id || null,
    };

    if (res.statusCode >= 500) logger.error('Request failed', entry);
    else if (res.statusCode >= 400) logger.warn('Request error', entry);
    else if (ENV !== 'production') logger.info('Request', entry);
  });

  next();
}

const getLoggingConfig = () => ({
  level: MIN_LEVEL,
  environment: ENV,
  logDir: LOG_DIR,
  fileLogging: !!appStream,
});

module.exports = { logger, requestLogger, getLoggingConfig };

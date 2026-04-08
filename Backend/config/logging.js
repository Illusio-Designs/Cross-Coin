'use strict';

const fs = require('fs');
const path = require('path');

/**
 * Structured Logger — production-grade logging.
 *
 * Features:
 * - JSON structured output in production
 * - Human-readable in development
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
const IS_PROD = ENV === 'production';

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

function formatEntry(level, message, data) {
  const entry = {
    timestamp: new Date().toISOString(),
    level: level.toUpperCase(),
    message,
    ...(data && typeof data === 'object' && !(data instanceof Error) ? data : {}),
  };

  if (data instanceof Error) {
    entry.error = data.message;
    if (!IS_PROD) entry.stack = data.stack;
  }

  return entry;
}

function writeToFile(stream, entry) {
  if (stream && !stream.destroyed) {
    try { stream.write(JSON.stringify(entry) + '\n'); } catch (_) {}
  }
}

function log(level, message, data) {
  if (!shouldLog(level)) return;

  const entry = formatEntry(level, message, data);

  // Console output
  if (IS_PROD) {
    // JSON in production for log aggregators
    const line = JSON.stringify(entry);
    if (level === 'error') console.error(line);
    else if (level === 'warn') console.warn(line);
    else console.log(line);
  } else {
    // Human-readable in dev
    const prefix = `[${entry.level}]`;
    const dataStr = data instanceof Error ? data.message : (data ? JSON.stringify(data) : '');
    if (level === 'error') console.error(prefix, message, dataStr);
    else if (level === 'warn') console.warn(prefix, message, dataStr);
    else console.log(prefix, message, dataStr);
  }

  // File output
  writeToFile(appStream, entry);
  if (level === 'error' || level === 'warn') writeToFile(errorStream, entry);
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
  if (IS_PROD && req.path === '/api/health') return next(); // skip health checks

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
    else if (!IS_PROD) logger.info('Request', entry);
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

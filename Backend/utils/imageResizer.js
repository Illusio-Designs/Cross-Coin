'use strict';

// Resized, WebP copies of uploaded images, on request.
//
// Product photos fall back to local storage (/api/uploads/...) when ImageKit
// is over quota. Storefronts ask for them with an ImageKit-style transform
// (?tr=w-500,h-500,q-80,f-auto) — which Express static ignored, so a 109px
// thumbnail downloaded the 2048x2048 PNG original (1.5 MB). This middleware
// honours the width/height/quality/format part of that transform:
//
//   GET /api/uploads/products/x.png?tr=w-500,q-78,f-auto
//     → x.png scaled to fit 500px wide (never enlarged), as WebP when the
//       browser accepts it, cached on disk under uploads/.cache/img/, served
//       with a long cache lifetime.
//
// Anything it can't handle (no transform, not an image, a missing file, a
// sharp error) falls through to the normal static file.

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const crypto = require('crypto');
const { logger } = require('../config/logging.js');

const RASTER = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.tif', '.tiff']);
// Requested widths snap UP to one of these, so a handful of copies per image
// cover every layout (and the cache can't be filled with arbitrary sizes).
const WIDTHS = [64, 128, 200, 300, 400, 500, 600, 800, 900, 1000, 1200, 1400, 1600, 2000];
const MAX_JOBS = 2; // at most this many resizes at once (shared 2 GB host)

let active = 0;
const waiting = [];
const slot = () => new Promise((resolve) => {
  if (active < MAX_JOBS) { active++; resolve(); } else waiting.push(resolve);
});
const release = () => { const next = waiting.shift(); if (next) next(); else active--; };
const inflight = new Map(); // cache file → promise (one resize per variant at a time)

function parseTransform(q) {
  const raw = typeof q.tr === 'string' ? q.tr : '';
  const out = {};
  for (const part of raw.split(',')) {
    const m = /^([a-z]+)-([a-z0-9]+)$/i.exec(part.trim());
    if (m) out[m[1].toLowerCase()] = m[2].toLowerCase();
  }
  if (!out.w && q.w) out.w = String(q.w);
  const w = parseInt(out.w, 10);
  if (!Number.isFinite(w) || w <= 0) return null;
  const h = parseInt(out.h, 10);
  const quality = Math.min(90, Math.max(50, parseInt(out.q, 10) || 78));
  const width = WIDTHS.find((x) => x >= w) || WIDTHS[WIDTHS.length - 1];
  // Keep the requested aspect for the bounding box (fit inside: no crop).
  const height = Number.isFinite(h) && h > 0 ? Math.round((h / w) * width) : null;
  return { width, height, quality, auto: !out.f || out.f === 'auto' || out.f === 'webp' };
}

function longCache(rel) {
  // Product uploads have unique, timestamped names → never change in place.
  return /(^|\/)products\//.test(rel) ? 'public, max-age=31536000, immutable' : 'public, max-age=604800';
}

module.exports = function imageResizer(uploadsDir) {
  const root = path.resolve(uploadsDir);
  const cacheDir = path.join(root, '.cache', 'img');

  return async function resizeUpload(req, res, next) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const t = parseTransform(req.query || {});
    if (!t) return next();
    let rel;
    try { rel = decodeURIComponent(req.path || ''); } catch (_) { return next(); }
    const ext = path.extname(rel).toLowerCase();
    if (!RASTER.has(ext) || rel.includes('/.cache/')) return next();
    const file = path.resolve(root, '.' + rel);
    if (!file.startsWith(root + path.sep)) return next();

    let stat;
    try { stat = await fsp.stat(file); } catch (_) { return next(); }
    if (!stat.isFile()) return next();

    const webp = t.auto && /image\/webp/i.test(req.headers.accept || '');
    const outExt = webp ? '.webp' : (ext === '.png' ? '.png' : ext === '.webp' ? '.webp' : '.jpg');
    const key = crypto.createHash('sha1')
      .update(`${rel}|${stat.mtimeMs}|${stat.size}|${t.width}|${t.height}|${t.quality}|${outExt}`)
      .digest('hex');
    const out = path.join(cacheDir, key.slice(0, 2), key + outExt);

    const send = () => {
      res.set('Cache-Control', longCache(rel));
      res.set('Vary', 'Accept');
      res.set('Cross-Origin-Resource-Policy', 'cross-origin');
      res.set('Access-Control-Allow-Origin', '*');
      res.sendFile(out, { dotfiles: 'allow', headers: { 'Content-Type': outExt === '.webp' ? 'image/webp' : outExt === '.png' ? 'image/png' : 'image/jpeg' } }, (err) => {
        if (err && !res.headersSent) next();
      });
    };

    if (fs.existsSync(out)) return send();

    let job = inflight.get(out);
    if (!job) {
      job = (async () => {
        await slot();
        try {
          const sharp = require('sharp');
          await fsp.mkdir(path.dirname(out), { recursive: true });
          const tmp = `${out}.${process.pid}.${Date.now()}.tmp`;
          let img = sharp(file, { failOn: 'none' }).rotate()
            .resize({ width: t.width, height: t.height || undefined, fit: 'inside', withoutEnlargement: true });
          if (outExt === '.webp') img = img.webp({ quality: t.quality, effort: 4 });
          else if (outExt === '.png') img = img.png({ compressionLevel: 9, palette: true, quality: t.quality });
          else img = img.jpeg({ quality: t.quality, mozjpeg: true });
          await img.toFile(tmp);
          await fsp.rename(tmp, out);
        } finally {
          release();
        }
      })();
      inflight.set(out, job);
      job.finally(() => inflight.delete(out)).catch(() => {});
    }
    try {
      await job;
      return send();
    } catch (e) {
      logger.warn(`[imageResizer] ${rel}: ${e.message}`);
      return next();
    }
  };
};

module.exports.parseTransform = parseTransform;

'use strict';

// Pictures inside a product's rich-text description get their real width and
// height (and an alt text when they have none) so storefronts can reserve
// their space before they load: no layout shift, and the page checks
// ("Image elements do not have explicit width and height", "Image elements
// do not have [alt] attributes") pass. The size is read from the image itself
// with sharp. Runs when a product is saved, plus a background pass at start-up
// for descriptions saved before this existed (idempotent: pictures that
// already have both attributes are left alone, so later runs do nothing).

const axios = require('axios');
const { logger } = require('../config/logging.js');

const MAX_BYTES = 15 * 1024 * 1024;
const _sizes = new Map(); // url → { width, height } | null

function absolute(src) {
  if (/^https?:\/\//i.test(src)) return src;
  const base = (process.env.API_URL || process.env.BACKEND_URL || 'https://api.crosscoin.in').replace(/\/$/, '');
  if (src.startsWith('/')) return `${base}${src}`;
  return null;
}

async function sizeOf(src) {
  if (_sizes.has(src)) return _sizes.get(src);
  let size = null;
  try {
    const sharp = require('sharp');
    let buf = null;
    const data = /^data:image\/[a-z0-9.+-]+;base64,(.+)$/i.exec(src);
    if (data) buf = Buffer.from(data[1], 'base64');
    else {
      const url = absolute(src);
      if (url) {
        const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 10000, maxContentLength: MAX_BYTES, maxBodyLength: MAX_BYTES });
        buf = Buffer.from(res.data);
      }
    }
    if (buf) {
      const m = await sharp(buf).metadata();
      if (m.width && m.height) {
        // EXIF-rotated photos display with width/height swapped.
        const swap = m.orientation && m.orientation >= 5;
        size = { width: swap ? m.height : m.width, height: swap ? m.width : m.height };
      }
    }
  } catch (e) {
    logger.debug(`[descImages] could not size ${String(src).slice(0, 120)}: ${e.message}`);
  }
  _sizes.set(src, size);
  return size;
}

const attr = (tag, name) => {
  const m = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return m ? (m[2] ?? m[3] ?? m[4] ?? '') : null;
};
const escAttr = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

// Returns the html with width/height (and alt) added to <img> tags that lack
// them. Never throws; on any failure the original html comes back.
async function addImageSizes(html, altText = '') {
  if (typeof html !== 'string' || !/<img\b/i.test(html)) return html;
  try {
    const tags = html.match(/<img\b[^>]*>/gi) || [];
    const out = new Map();
    for (const tag of tags) {
      if (out.has(tag)) continue;
      const hasW = attr(tag, 'width') != null && attr(tag, 'width') !== '';
      const hasH = attr(tag, 'height') != null && attr(tag, 'height') !== '';
      const hasAlt = attr(tag, 'alt') != null;
      if (hasW && hasH && hasAlt) continue;
      let add = '';
      if (!hasW || !hasH) {
        const src = attr(tag, 'src');
        const size = src ? await sizeOf(src) : null;
        if (size) add += ` width="${size.width}" height="${size.height}"`;
      }
      if (!hasAlt) add += ` alt="${escAttr(altText)}"`;
      if (!add) continue;
      // Drop a lone width or height so the pair always matches the picture.
      let base = tag;
      if (add.includes('width=')) base = base.replace(/\s(width|height)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      out.set(tag, base.replace(/^<img\b/i, `<img${add}`));
    }
    if (!out.size) return html;
    return html.replace(/<img\b[^>]*>/gi, (t) => out.get(t) || t);
  } catch (e) {
    logger.warn('[descImages] ' + e.message);
    return html;
  }
}

// Background pass over existing products (main app only, after start-up).
async function backfillProductDescriptions() {
  const { sequelize } = require('../config/db.js');
  const { QueryTypes } = require('sequelize');
  const rows = await sequelize.query(
    "SELECT id, name, description FROM products WHERE description LIKE '%<img%'",
    { type: QueryTypes.SELECT });
  let changed = 0;
  for (const r of rows) {
    const next = await addImageSizes(r.description, r.name || '');
    if (next !== r.description) {
      await sequelize.query('UPDATE products SET description = :d WHERE id = :id', { replacements: { d: next, id: r.id } });
      changed++;
    }
  }
  if (changed) logger.info(`[descImages] added picture sizes to ${changed} product description(s)`);
  return { checked: rows.length, changed };
}

module.exports = { addImageSizes, backfillProductDescriptions };

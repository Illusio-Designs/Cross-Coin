const { normalizeProductVideos, videosFromAttributes } = require('./productVideos');

function parseProductAttributes(raw) {
  if (raw === undefined || raw === null || raw === '') return null;
  let obj = raw;
  if (typeof raw === 'string') {
    try { obj = JSON.parse(raw); } catch { return null; }
  }
  if (!obj || typeof obj !== 'object') return null;

  // Sanitize one group into [{name,image}]. Tolerates legacy bare-string values
  // (maps them to { name, image:'' }) without rejecting them.
  const sanitizeGroup = (arr) => Array.isArray(arr) ? arr
    .map((n) => ({
      name: String(n?.name ?? n ?? '').trim().slice(0, 40),
      image: String(n?.image ?? '').trim().slice(0, 500),
    }))
    .filter((n) => n.name)
    .slice(0, 50) : [];

  const result = {};
  // `notes` first and always present — preserves the existing storefront contract.
  result.notes = sanitizeGroup(obj.notes);
  if (Object.prototype.hasOwnProperty.call(obj, '_videos')) {
    result._videos = normalizeProductVideos(obj._videos, { strict: true });
  }

  // Pass through any additional named groups (same {name,image} shape). Keys are
  // lowercased for consistency with how variation attributes are normalized;
  // non-array values are ignored defensively.
  for (const [key, val] of Object.entries(obj)) {
    const k = String(key || '').trim().toLowerCase();
    if (!k || k === 'notes' || k === '_videos' || !Array.isArray(val)) continue;
    const group = sanitizeGroup(val);
    if (group.length) result[k] = group;
  }

  return result;
}


function mergeProductAttributes(raw, previous) {
  if (raw === undefined) return undefined;
  let next = parseProductAttributes(raw);
  // Clients editing fragrance notes alone must not clear managed videos.
  const previousVideos = videosFromAttributes(previous);
  if (!Object.prototype.hasOwnProperty.call(next || {}, '_videos') && previousVideos.length) {
    next = { ...(next || {}), _videos: previousVideos };
  }
  return next;
}

module.exports = { parseProductAttributes, mergeProductAttributes };

const MAX_PRODUCT_VIDEOS = 4;
const MAX_PRODUCT_VIDEO_BYTES = 50 * 1024 * 1024;
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm'];

function mediaUrl(value) {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 2000) return '';
  try {
    const url = new URL(text);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? text : '';
  } catch { return ''; }
}

// Stored in products.attributes._videos, separate from description and images.
function normalizeProductVideos(value, { strict = false } = {}) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    if (strict) throw new Error('Product videos must be an array.');
    return [];
  }
  if (strict && value.length > MAX_PRODUCT_VIDEOS) throw new Error('A product can have up to 4 videos.');
  return value.slice(0, MAX_PRODUCT_VIDEOS).flatMap((item) => {
    const url = mediaUrl(item?.url);
    const poster = mediaUrl(item?.poster);
    if (!url || (item?.poster && !poster)) {
      if (strict) throw new Error('Product videos and covers need valid HTTP or HTTPS URLs.');
      return [];
    }
    return [{ url, poster, caption: String(item?.caption || '').trim().slice(0, 300) }];
  });
}

function matchesVideoHeader(mime, bytes) {
  if (mime === 'video/mp4') return bytes.length >= 12 && bytes.toString('ascii', 4, 8) === 'ftyp';
  if (mime === 'video/webm') return bytes.length >= 4 && bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
  return false;
}

module.exports = { MAX_PRODUCT_VIDEOS, MAX_PRODUCT_VIDEO_BYTES, VIDEO_MIME_TYPES, normalizeProductVideos, matchesVideoHeader };

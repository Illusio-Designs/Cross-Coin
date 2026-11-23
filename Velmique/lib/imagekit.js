/* Right-size ImageKit images per slot (width only + auto format/quality)
   instead of shipping the full-resolution original to every card.
   An existing `tr=` query transform is replaced, never stacked; every other
   query param is kept. Non-ImageKit URLs (local /public files, data: URLs,
   other hosts) are returned untouched. */
const Q = 72;

function supportsResize(src, { uploads = false } = {}) {
  return typeof src === 'string' && (
    src.includes('ik.imagekit.io') || (uploads && /^https?:\/\/[^/]+\/api\/uploads\//i.test(src))
  );
}

export function ik(src, w, options) {
  if (!src || typeof src !== 'string') return src || '';
  if (!supportsResize(src, options) || !w) return src;
  const [base, query = ''] = src.split('?');
  const keep = query.split('&').filter((p) => p && !/^tr=/.test(p));
  return `${base}?${[`tr=w-${Math.round(w)},q-${Q},f-auto`, ...keep].join('&')}`;
}

/* The product gallery also opts into sizing our own API uploads. */
export function ikSrcSet(src, widths, options) {
  if (!supportsResize(src, options)) return undefined;
  return widths.map((w) => `${ik(src, w, options)} ${w}w`).join(', ');
}

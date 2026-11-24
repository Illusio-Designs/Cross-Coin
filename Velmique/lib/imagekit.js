/* Right-size ImageKit and storefront uploads per slot (width only + auto format/quality)
   instead of shipping the full-resolution original to every card.
   An existing `tr=` query transform is replaced, never stacked; every other
   query param is kept. Other hosts and bundled assets are returned untouched. */
const Q = 72;
const API_ORIGIN = new URL(process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in', 'https://api.crosscoin.in').origin;

function supportsResize(src, { uploads = true } = {}) {
  if (typeof src !== 'string') return false;
  try {
    const url = new URL(src);
    if (url.hostname === 'ik.imagekit.io') return true;
    return uploads && (url.origin === API_ORIGIN || url.origin === 'https://api.crosscoin.in')
      && /^\/(?:api\/)?uploads\//i.test(url.pathname)
      && /\.(jpe?g|png|webp|avif|tiff?)$/i.test(url.pathname);
  } catch {
    return false;
  }
}

export function ik(src, w, options) {
  if (!src || typeof src !== 'string') return src || '';
  if (!supportsResize(src, options) || !Number.isFinite(w) || w <= 0) return src;
  const [url, fragment] = src.split('#', 2);
  const [base, ...parts] = url.split('?');
  const query = parts.join('?');
  const keep = query.split('&').filter((p) => p && !/^tr=/.test(p));
  return `${base}?${[`tr=w-${Math.round(w)},q-${Q},f-auto`, ...keep].join('&')}${fragment === undefined ? '' : '#' + fragment}`;
}

export function ikSrcSet(src, widths, options) {
  if (!supportsResize(src, options)) return undefined;
  return widths.map((w) => `${ik(src, w, options)} ${w}w`).join(', ');
}

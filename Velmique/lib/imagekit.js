/* Right-size ImageKit images per slot (width only + auto format/quality)
   instead of shipping the full-resolution original to every card.
   An existing `tr=` query transform is replaced, never stacked; every other
   query param is kept. Non-ImageKit URLs (local /public files, data: URLs,
   other hosts) are returned untouched. */
const Q = 78;

export function ik(src, w) {
  if (!src || typeof src !== 'string') return src || '';
  if (!src.includes('ik.imagekit.io') || !w) return src;
  const [base, query = ''] = src.split('?');
  const keep = query.split('&').filter((p) => p && !/^tr=/.test(p));
  return `${base}?${[`tr=w-${Math.round(w)},q-${Q},f-auto`, ...keep].join('&')}`;
}

/* `srcSet` for an ImageKit URL at the given widths; undefined otherwise, so
   callers can pass it straight through. */
export function ikSrcSet(src, widths) {
  if (!src || typeof src !== 'string' || !src.includes('ik.imagekit.io')) return undefined;
  return widths.map((w) => `${ik(src, w)} ${w}w`).join(', ');
}

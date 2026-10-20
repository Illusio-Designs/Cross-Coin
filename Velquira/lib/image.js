// ImageKit sizing — ask for the width the image is shown at, in WebP/AVIF
// (f-auto), instead of the full-size original. Replaces any existing `tr=`
// query transform; non-ImageKit URLs (local /public files, data:, blob:) are
// returned untouched.
const IK_HOST = 'ik.imagekit.io';

export function ikUrl(src, w, q = 78) {
  if (!src || typeof src !== 'string' || !w || !src.includes(IK_HOST)) return src;
  const [base, query = ''] = src.split('?');
  const rest = query.split('&').filter((p) => p && !/^tr=/.test(p));
  return `${base}?tr=w-${Math.round(w)},q-${q},f-auto${rest.length ? '&' + rest.join('&') : ''}`;
}

/** `srcSet` for the given widths (ImageKit only; undefined otherwise). */
export function ikSrcSet(src, widths = []) {
  if (!src || typeof src !== 'string' || !src.includes(IK_HOST) || !widths.length) return undefined;
  return widths.map((w) => `${ikUrl(src, w)} ${w}w`).join(', ');
}

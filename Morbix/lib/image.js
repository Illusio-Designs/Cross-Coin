/* ImageKit sizing — ask for the size an image is actually shown at instead of
   the original upload. Width only (`tr=w-<px>,q-78,f-auto`; f-auto serves
   WebP/AVIF), replacing any `tr=` already on the URL so there is never a second
   transform. Non-ImageKit URLs (local /public files, data: URLs) pass through.

   Widths used in Morbix: cards ~600, product main image 1200, thumbnails 200,
   blog covers 800 (cards) / 1400 (article), collection tiles 800. */
export function ikSrc(src, width) {
  if (!src || typeof src !== 'string' || !width) return src;
  if (!src.includes('ik.imagekit.io')) return src;
  const [base, query = ''] = src.split('?');
  const rest = query.split('&').filter((p) => p && !/^tr=/.test(p));
  return `${base}?${[`tr=w-${Math.round(width)},q-78,f-auto`, ...rest].join('&')}`;
}

/** `srcSet` for an ImageKit URL at the given widths; undefined otherwise. */
export function ikSrcSet(src, widths) {
  if (!src || typeof src !== 'string' || !src.includes('ik.imagekit.io') || !widths?.length) return undefined;
  return widths.map((w) => `${ikSrc(src, w)} ${w}w`).join(', ');
}

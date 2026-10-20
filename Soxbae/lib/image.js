/* ImageKit sizing — ask for the size an image is actually shown at instead of
   the original upload. Width only (`tr=w-<px>,q-78,f-auto`; f-auto serves
   WebP/AVIF), replacing any `tr=` already on the URL so there is never a second
   transform. Non-ImageKit URLs (local /public files, data: URLs) pass through.

   Widths used in Soxbae: cards ~600, product main image 1200, thumbnails 200,
   blog covers 800 (cards) / 1400 (article), collection tiles 600, hero 1600
   (mobile 800). */
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

/* Home hero slides (components/home/Hero.jsx) and their <link rel="preload">
   in app/(home)/page.jsx share these so the preloaded file is exactly the one
   the slide requests. */
export const HERO_W = 1600;
export const HERO_MOBILE_W = 800;
export const HERO_WIDTHS = [800, 1200, 1600];
export const HERO_SIZES = '(max-width: 1240px) 100vw, 1240px';

/* ImageKit helpers.
 *
 * The shared backend serves images already transformed to a SQUARE centre-crop
 * (tr=w-W,h-H — e.g. w-900,h-900), which cuts landscape banners and product
 * photos. `ikFull` rewrites that transform to width-only so ImageKit preserves
 * the image's real aspect ratio and returns the WHOLE image (no crop). Non-
 * ImageKit URLs (Unsplash, local assets) pass through untouched.
 */
export function ikFull(url, width = 1280) {
  if (!url || typeof url !== 'string') return url || '';
  if (!url.includes('ik.imagekit.io')) return url;
  // Drop any existing tr= block (?tr=… or &tr=…), keep the rest of the URL.
  const base = url.split(/[?&]tr=/)[0];
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}tr=w-${width},q-85,f-auto`;
}

/* getBlogImageSrc — pre-crop blog CARD covers server-side to an exact 16:9
   size so every card is uniform, sharp and light. ImageKit URLs get the
   transform; non-ImageKit URLs (Unsplash, local assets) pass through. */
export function getBlogImageSrc(url, { w = 800, h = 450, q = 70 } = {}) {
  if (!url || typeof url !== 'string') return url || '';
  if (!url.includes('ik.imagekit.io')) return url;
  return `${url.split('?')[0]}?tr=w-${w},h-${h},q-${q},f-auto`;
}

/* ikw — request an ImageKit image at the width it is SHOWN (width-only, so the
   aspect ratio is kept), q-78, WebP/AVIF via f-auto. Any existing tr= block is
   replaced, never doubled. Non-ImageKit URLs (local /assets, data:, Unsplash)
   pass through untouched. Used by GzImage (components/common/GzImage.jsx). */
export function ikw(url, width, q = 78) {
  if (!url || typeof url !== 'string') return url || '';
  if (!width || !url.includes('ik.imagekit.io')) return url;
  const base = url.split(/[?&]tr=/)[0];
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}tr=w-${width},q-${q},f-auto`;
}

/* ikSrcSet — "url?tr=w-300… 300w, url?tr=w-600… 600w" for ImageKit URLs;
   undefined for anything else (one size only). */
export function ikSrcSet(url, widths, q = 78) {
  if (!url || typeof url !== 'string' || !url.includes('ik.imagekit.io') || !widths?.length) return undefined;
  return widths.map((w) => `${ikw(url, w, q)} ${w}w`).join(', ');
}

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

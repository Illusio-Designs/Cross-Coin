// @generated — DO NOT EDIT. Source: shared/frontend/descriptionImages.js
// Edit that file then run: node scripts/sync-frontend-shared.mjs
const SIZES = '(max-width: 760px) calc(100vw - 64px), 680px';
const UPLOAD_WIDTHS = [480, 800, 1100];

// Keep native image URLs in the markup. Our unsigned uploads can also offer
// responsive copies, with the saved URL available if the resized file fails.
export function withLazyDescriptionImages(html) {
  return String(html || '').replace(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
    const attrs = new Map(Array.from(
      tag.matchAll(/\s+([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g),
      ([, name, double, single, bare]) => [name.toLowerCase(), double ?? single ?? bare ?? ''],
    ));
    if (!attrs.has('src') && !attrs.has('srcset')) return tag;

    const loading = attrs.has('loading') ? '' : ' loading="lazy"';
    const decoding = attrs.has('decoding') ? '' : ' decoding="async"';
    const priority = attrs.has('fetchpriority') ? '' : ' fetchpriority="low"';
    const src = attrs.get('src') || '';
    const ownUpload = /^https:\/\/api\.crosscoin\.in\/api\/uploads\/[a-z0-9_./%-]+\.(?:png|jpe?g|webp|avif)$/i.test(src);
    const responsive = ownUpload && !attrs.has('srcset')
      ? ` srcset="${UPLOAD_WIDTHS.map((width) => `${src}?tr=w-${width},q-72,f-auto ${width}w`).join(', ')}"${attrs.has('sizes') ? '' : ` sizes="${SIZES}"`} data-description-responsive`
      : '';
    return tag.replace(/^<img\b/i, `<img${loading}${decoding}${priority}${responsive}`);
  });
}

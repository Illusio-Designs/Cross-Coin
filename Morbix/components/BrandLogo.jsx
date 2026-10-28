/**
 * Morbix brand logo — the uploaded artwork with its white background removed
 * (public/morbix-logo.png, transparent + tightly cropped). Renders cleanly on
 * any background, no blend-mode tricks needed.
 */
//
// Served as a 455×128 WebP (~25 KB, a PNG of the same size as fallback)
// instead of the 1172×330 original (213 KB): it is shown at most ~42 px tall,
// and it sits in the header of every page, so its weight was on every first
// load. width/height reserve its space (no layout shift).
export default function BrandLogo({ height = 34, className = '' }) {
  return (
    <picture>
      <source srcSet="/morbix-logo.webp" type="image/webp" />
      <img
        src="/morbix-logo-sm.png"
        alt="Morbix"
        width={455}
        height={128}
        className={className}
        style={{ height, width: 'auto', display: 'block' }}
      />
    </picture>
  );
}

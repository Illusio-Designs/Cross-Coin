/**
 * Morbix brand logo — the uploaded artwork with its white background removed
 * (public/morbix-logo.png, transparent + tightly cropped). Renders cleanly on
 * any background, no blend-mode tricks needed.
 */
//
// Served as WebP copies 160–455px wide (6–25 KB; a PNG as fallback)
// instead of the 1172×330 original (213 KB): it is shown at most ~42 px tall,
// and it sits in the header of every page, so its weight was on every first
// load. width/height reserve its space (no layout shift).
export default function BrandLogo({ height = 34, className = '' }) {
  // Exact width from the artwork's 455:128 ratio (not width:auto), so the
  // browser reserves the box before the file arrives; the browser picks the
  // copy that fits that width on the screen.
  const width = Math.round((height * 455) / 128);
  return (
    <picture>
      <source srcSet="/morbix-logo-160.webp 160w, /morbix-logo-240.webp 240w, /morbix-logo-300.webp 300w, /morbix-logo.webp 455w" sizes={`${width}px`} type="image/webp" />
      <img
        src="/morbix-logo-sm.png"
        alt="Morbix"
        width={455}
        height={128}
        className={className}
        style={{ height, width, display: 'block' }}
      />
    </picture>
  );
}

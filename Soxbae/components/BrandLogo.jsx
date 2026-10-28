/**
 * Soxbae brand logo — the uploaded artwork with its white background removed
 * (public/soxbae-logo.png, transparent + tightly cropped).
 */
//
// Served as WebP copies 160–480px wide (6–23 KB; a 360px PNG as fallback)
// instead of the 1578×356 PNG (237 KB): it is shown at most ~40px tall, in the
// header of every page. The width is set exactly from the artwork's
// 1578:356 shape (not width:auto) so the browser reserves its box before the
// file arrives; CSS that changes the header logo's height on phones sets the
// matching width too (app/globals.css, .sx-hd-logo img).
const RATIO = 1578 / 356;

export default function BrandLogo({ height = 34, className = '' }) {
  const width = Math.round(height * RATIO);
  return (
    <picture>
      <source
        srcSet="/soxbae-logo-160.webp 160w, /soxbae-logo-240.webp 240w, /soxbae-logo-360.webp 360w, /soxbae-logo-480.webp 480w"
        sizes={`${width}px`}
        type="image/webp"
      />
      <img
        src="/soxbae-logo-sm.png"
        alt="Soxbae"
        width={1578}
        height={356}
        className={className}
        style={{ height, width, display: 'block' }}
      />
    </picture>
  );
}

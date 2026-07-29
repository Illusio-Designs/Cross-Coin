/**
 * Soxbae brand logo — the uploaded artwork with its white background removed
 * (public/soxbae-logo.png, transparent + tightly cropped).
 */
export default function BrandLogo({ height = 34, className = '' }) {
  return (
    <img
      src="/soxbae-logo.png"
      alt="Soxbae"
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}

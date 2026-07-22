/**
 * Morbix brand logo — the uploaded artwork with its white background removed
 * (public/morbix-logo.png, transparent + tightly cropped). Renders cleanly on
 * any background, no blend-mode tricks needed.
 */
export default function BrandLogo({ height = 34, className = '' }) {
  return (
    <img
      src="/morbix-logo.png"
      alt="Morbix"
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}

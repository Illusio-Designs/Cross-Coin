/**
 * Velquira brand logo — the uploaded gold wordmark with its white background
 * keyed out to full transparency (public/velquira-logo.webp). Renders cleanly on
 * any background, light or dark.
 */
export default function BrandLogo({ height = 34, className = '' }) {
  return (
    <img
      src="/velquira-logo.webp"
      alt="Velquira"
      className={className}
      style={{ height, width: 'auto', display: 'block' }}
    />
  );
}

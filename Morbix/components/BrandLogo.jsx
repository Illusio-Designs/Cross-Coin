/**
 * Morbix brand logo (the real uploaded artwork at public/morbix-logo.jpeg).
 *
 * The source is a wide wordmark on a WHITE background. `mix-blend-mode:
 * multiply` renders that white as transparent against the site's light
 * header/footer, so there's no visible white box around the mark.
 */
export default function BrandLogo({ height = 34, className = '' }) {
  return (
    <img
      src="/morbix-logo.jpeg"
      alt="Morbix"
      className={className}
      style={{ height, width: 'auto', display: 'block', mixBlendMode: 'multiply' }}
    />
  );
}

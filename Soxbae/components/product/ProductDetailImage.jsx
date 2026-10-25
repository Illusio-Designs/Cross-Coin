export default function ProductDetailImage({ image }) {
  if (!image?.url) return null;
  return <section className="product-detail-image" aria-label="Product highlights"><img src={image.url} alt={image.alt || 'Soxbae product highlights'} loading="lazy" decoding="async" /></section>;
}

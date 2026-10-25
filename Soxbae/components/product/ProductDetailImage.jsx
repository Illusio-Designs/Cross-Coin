export default function ProductDetailImage({ image }) {
  return (
    <section className="product-detail-image" aria-label="Customer foot comfort insights">
      <img
        src={image?.url || '/customer-foot-comfort-statistics.png'}
        alt={image?.url ? (image.alt || 'Soxbae product highlights') : 'Customer feedback on Soxbae toe separator socks: 900+ customers, 78% less foot discomfort, 72% better toe spacing and reduced rubbing, and 68% more relaxed feet in the morning.'}
        width="1448"
        height="1086"
        loading="lazy"
        decoding="async"
      />
    </section>
  );
}

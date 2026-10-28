import { ikSrc, ikSrcSet } from '@/lib/image';

// The default artwork comes in 480/800/1100/1448px WebP copies (the PNG
// original was 1.5 MB); an admin-set image is resized by ImageKit or the API.
// The browser picks the copy that fits the screen (full page width).
const DEFAULT_SET = '/customer-foot-comfort-statistics-480.webp 480w, /customer-foot-comfort-statistics-800.webp 800w, /customer-foot-comfort-statistics-1100.webp 1100w, /customer-foot-comfort-statistics.webp 1448w';
const SIZES = '(max-width: 1240px) calc(100vw - 40px), 1200px';

export default function ProductDetailImage({ image }) {
  return (
    <section className="product-detail-image" aria-label="Customer foot comfort insights">
      <img
        src={image?.url ? ikSrc(image.url, 1448) : '/customer-foot-comfort-statistics.webp'}
        srcSet={image?.url ? ikSrcSet(image.url, [480, 800, 1100, 1448]) : DEFAULT_SET}
        sizes={SIZES}
        alt={image?.url ? (image.alt || 'Soxbae product highlights') : 'Customer feedback on Soxbae toe separator socks: 900+ customers, 78% less foot discomfort, 72% better toe spacing and reduced rubbing, and 68% more relaxed feet in the morning.'}
        width="1448"
        height="1086"
        loading="lazy"
        decoding="async"
      />
    </section>
  );
}

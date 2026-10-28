import { ikSrc, ikSrcSet } from '@/lib/image';

// The default artwork comes in 480/800/1100/1448px WebP copies (the PNG
// original was 1.5 MB); an admin-set image is resized by ImageKit or the API.
// The browser picks the copy that fits the screen (full page width).
const DEFAULT_SET = '/customer-comfort-insights-480.webp 480w, /customer-comfort-insights-800.webp 800w, /customer-comfort-insights-1100.webp 1100w, /customer-comfort-insights.webp 1448w';
const SIZES = '(max-width: 1200px) calc(100vw - 40px), 1160px';
export default function CustomerComfortInsights({ image }) {
  return (
    <section className="customer-comfort-insights" aria-label="Customer foot comfort insights">
      <img
        src={image?.url ? ikSrc(image.url, 1448) : "/customer-comfort-insights.webp"}
        srcSet={image?.url ? ikSrcSet(image.url, [480, 800, 1100, 1448]) : DEFAULT_SET}
        sizes={SIZES}
        alt={image?.url ? (image.alt || "Product highlights") : "Morbix customer foot comfort insights: 1,004+ customers; 78% felt less foot discomfort, 72% noticed better toe spacing and reduced rubbing, and 68% of overnight wearers felt more relaxed feet in the morning."}
        width="1448"
        height="1086"
        loading="lazy"
        decoding="async"
      />
    </section>
  );
}

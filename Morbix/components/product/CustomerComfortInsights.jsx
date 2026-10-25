export default function CustomerComfortInsights({ image }) {
  return (
    <section className="customer-comfort-insights" aria-label="Customer foot comfort insights">
      <img
        src={image?.url || "/customer-comfort-insights.png"}
        alt={image?.url ? (image.alt || "Product highlights") : "Morbix customer foot comfort insights: 1,004+ customers; 78% felt less foot discomfort, 72% noticed better toe spacing and reduced rubbing, and 68% of overnight wearers felt more relaxed feet in the morning."}
        width="1448"
        height="1086"
        loading="lazy"
        decoding="async"
      />
    </section>
  );
}

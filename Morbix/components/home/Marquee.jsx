import Icon from '@/components/Icon';

// Auto-scrolling ("live") trust strip shown right after the hero.
const ITEMS = [
  { icon: 'Truck', text: 'Free shipping over ₹999' },
  { icon: 'RefreshCw', text: '14-day easy returns' },
  { icon: 'ShieldCheck', text: '100% authentic products' },
  { icon: 'Layers', text: 'Cushioned comfort knit' },
  { icon: 'Leaf', text: 'Eco-friendly materials' },
  { icon: 'Clock', text: '24/7 customer support' },
];

export default function Marquee() {
  // Duplicate the list so the -50% keyframe loops seamlessly.
  const row = [...ITEMS, ...ITEMS];
  return (
    <section className="marquee-wrap" aria-label="Why shop Morbix">
      <div className="marquee-track">
        {row.map((it, i) => (
          <span className="marquee-item" key={i} aria-hidden={i >= ITEMS.length}>
            <span className="marquee-ic"><Icon name={it.icon} size={17} /></span>
            {it.text}
            <span className="marquee-sep">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

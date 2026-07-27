import Icon from '@/components/Icon';

// Auto-scrolling ("live") trust strip shown right after the hero.
const ITEMS = [
  { icon: 'ShieldCheck', text: '916 BIS hallmarked gold' },
  { icon: 'Truck', text: 'Free insured shipping' },
  { icon: 'Sparkles', text: 'Handmade in Morbi' },
  { icon: 'Gauge', text: 'Certified gemstones' },
  { icon: 'Heart', text: 'Lifetime cleaning & care' },
  { icon: 'RefreshCw', text: '15-day easy exchange' },
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

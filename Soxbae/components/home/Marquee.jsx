import Icon from '@/components/Icon';

// Auto-scrolling ("live") trust strip shown right after the hero.
// Only FACTUAL signals: Made in India (company is based in Morbi, Gujarat, India),
// secure payments, free shipping (now on all orders), the 7-day returns policy
// (see /account/returns), and Cash on Delivery (offered at checkout).
const TRUST = [
  { icon: 'MapPin',      text: 'Made in India' },
  { icon: 'ShieldCheck', text: '100% secure payments' },
  { icon: 'Truck',       text: 'Free shipping on all orders' },
  { icon: 'RefreshCw',   text: 'Easy 7-day returns' },
  { icon: 'Check',       text: 'Cash on Delivery available' },
];

// `rating` ({ avg, total }) comes from the real store-wide review totals the
// homepage already fetches. We only render it when there are real reviews — no
// fabricated numbers.
export default function Marquee({ rating = null }) {
  const hasRating = rating && Number(rating.avg) > 0 && Number(rating.total) > 0;
  const items = hasRating
    ? [{ icon: 'Star', text: `Rated ${Number(rating.avg).toFixed(1)}★ by ${Number(rating.total).toLocaleString('en-IN')}+ happy shoppers` }, ...TRUST]
    : TRUST;

  // Duplicate the list so the -50% keyframe loops seamlessly.
  const row = [...items, ...items];
  return (
    <section className="marquee-wrap" aria-label="Why shop Soxbae">
      <div className="marquee-track">
        {row.map((it, i) => (
          <span className="marquee-item" key={i} aria-hidden={i >= items.length}>
            <span className="marquee-ic"><Icon name={it.icon} size={17} /></span>
            {it.text}
            <span className="marquee-sep">✦</span>
          </span>
        ))}
      </div>
    </section>
  );
}

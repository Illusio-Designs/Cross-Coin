/* Marquee — a slow trust-signal ticker (as per Morbix / Soxbae), set in the
   display face. Only FACTUAL claims: Made in India, secure payments, COD,
   7-day returns (per policy), nationwide delivery — no "free shipping on all
   orders" claim, since the store uses a free-shipping threshold. Pauses on
   hover; still for reduced-motion. */

const PHRASES = [
  'Made in India',
  '100% secure payments',
  'Cash on Delivery available',
  'Easy 7-day returns',
  'Pan-India delivery',
];

export default function Marquee() {
  // Duplicate the run so the loop is seamless.
  const run = [...PHRASES, ...PHRASES];
  return (
    <section className="gz-marquee" aria-hidden="true">
      <div className="gz-marquee-track">
        {run.map((p, i) => (
          <span className="gz-marquee-item" key={i}>
            {p}
            <span className="gz-marquee-star">✳</span>
          </span>
        ))}
      </div>
    </section>
  );
}

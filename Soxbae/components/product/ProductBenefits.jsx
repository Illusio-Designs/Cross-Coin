import Icon from '@/components/Icon';

// "What Soxbae Socks Are Made For" — a benefits band, Soxbae's version of the
// Morbix conditions section. Soxbae sells everyday socks (not alignment /
// wellness), so the copy is about the real days these socks are built for —
// framed as comfort benefits, with no medical or health claims.
const MADE_FOR = [
  { icon: 'Clock',      name: 'Long days on your feet', text: 'Shifts, errands, travel — cushioned heel and toe zones soften every step so long days feel easier.' },
  { icon: 'Dumbbell',   name: 'Workouts & runs',        text: 'Gym sessions, runs and rallies — grip knit and flex zones move with you and stay put inside your shoes.' },
  { icon: 'Wind',       name: 'Hot, sweaty feet',       text: 'Breathable mesh knit lets heat escape and wicks moisture, so feet stay drier right through the day.' },
  { icon: 'Footprints', name: 'Socks that slip down',   text: 'Anti-slip zones and a snug arch band keep each sock from sliding into your shoe — no mid-day pulling up.' },
  { icon: 'Heart',      name: 'Cold mornings',          text: 'Soft, dense cotton traps warmth for chilly starts and early commutes, without the bulk under your shoes.' },
  { icon: 'Leaf',       name: 'Sensitive skin',         text: 'Organic cotton with flat, low-profile seams sits gently against the skin — no scratchy edges or pressure marks.' },
];

export default function ProductBenefits() {
  return (
    <section className="section container sx-made">
      <div className="section-head section-head-center">
        <div>
          <span className="section-eyebrow">Made for everyday</span>
          <h2>What Soxbae Socks Are Made For</h2>
          <p className="section-sub">Cushioned, breathable and built to be worn hard — here is where they earn their keep.</p>
        </div>
      </div>
      <div className="sx-made-grid">
        {MADE_FOR.map((c) => (
          <div className="sx-made-card" key={c.name}>
            <div className="sx-made-circle"><Icon name={c.icon} size={26} /></div>
            <h3>{c.name}</h3>
            <p>{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

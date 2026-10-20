import ShimmerImg from '@/components/ui/ShimmerImg';
// "The Soxbae Alignment Socks Can Help With" — the comfort-wellness band of the
// foot conditions people commonly use toe-alignment socks for. Same content and
// imagery as the Morbix store (both sell the same alignment socks); copy is
// framed responsibly ("many wearers / can help / may ease") with a caveat, so
// it stays ad/marketplace safe with no medical treatment or cure claims.
const CONDITIONS = [
  { img: '/conditions/cond-1.avif', name: 'Plantar Fasciitis', text: 'Sharp heel pain on your first morning steps? Many wearers find gentle overnight toe stretching eases that heel tension over time.' },
  { img: '/conditions/cond-2.avif', name: 'Neuropathy',        text: 'Tingling, burning or numbness — especially at night? Gentle toe separation can improve comfort for restless feet.' },
  { img: '/conditions/cond-3.avif', name: 'Bunion Pain',       text: 'Years in tight shoes push the big toe inward. Four-zone separators gently encourage it back toward its natural line — no rigid splints.' },
  { img: '/conditions/cond-4.avif', name: 'Foot Swelling',     text: 'Puffy, tired feet after long hours standing or sitting? Toe separation supports circulation and can help feet feel lighter.' },
  { img: '/conditions/cond-5.avif', name: 'Flat Feet',         text: 'Little arch support means achy feet after every walk. Spreading the toes helps redistribute pressure for everyday relief.' },
  { img: '/conditions/cond-6.avif', name: 'Achilles Tendinitis', text: 'Tightness at the back of the heel that makes each step harder? Gentle overnight stretching can ease tension on the tendon gradually.' },
];

export default function ProductBenefits() {
  return (
    <section className="section container sx-made">
      <div className="section-head section-head-center">
        <div>
          <span className="section-eyebrow">Everyday foot comfort</span>
          <h2>The Soxbae Alignment Socks Can Help With</h2>
          <p className="section-sub">Gentle toe separation that many wearers use for everyday relief — a little each day.</p>
        </div>
      </div>
      <div className="sx-made-grid">
        {CONDITIONS.map((c) => (
          <div className="sx-made-card" key={c.name}>
            <div className="sx-made-circle"><ShimmerImg src={c.img} alt={c.name} /></div>
            <h3>{c.name}</h3>
            <p>{c.text}</p>
          </div>
        ))}
      </div>
      <p className="sx-made-caveat">Soxbae is a comfort-wellness product designed to support everyday foot comfort — not a medical device, treatment or cure. If you have a diagnosed condition or ongoing pain, please check with a podiatrist or doctor.</p>
    </section>
  );
}

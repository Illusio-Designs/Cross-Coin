// "The Gripzus Alignment Socks Can Help With" — a comfort-wellness band of the
// foot conditions people commonly use toe-alignment socks for. Copy is framed
// responsibly ("many wearers / can help / may ease"), with a caveat — no
// medical treatment/cure claims or unverified stats, so it's ad/marketplace safe.
//
// Styled natively in Gripzus's own "Monochrome Atelier" language — the shared
// section rhythm (section-y / wrap, a top-hairline header with an eyebrow +
// h-display title) and hairline-framed ink/paper cards — NOT the ported Morbix
// CSS. Self-contained; used on both the home page and the product page.
const CONDITIONS = [
  { img: '/conditions/cond-1.avif', name: 'Plantar Fasciitis', text: 'Sharp heel pain on your first morning steps? Many wearers find gentle overnight toe stretching eases that heel tension over time.' },
  { img: '/conditions/cond-2.avif', name: 'Neuropathy',        text: 'Tingling, burning or numbness — especially at night? Gentle toe separation can improve comfort for restless feet.' },
  { img: '/conditions/cond-3.avif', name: 'Bunion Pain',       text: 'Years in tight shoes push the big toe inward. Four-zone separators gently encourage it back toward its natural line — no rigid splints.' },
  { img: '/conditions/cond-4.avif', name: 'Foot Swelling',     text: 'Puffy, tired feet after long hours standing or sitting? Toe separation supports circulation and can help feet feel lighter.' },
  { img: '/conditions/cond-5.avif', name: 'Flat Feet',         text: 'Little arch support means achy feet after every walk. Spreading the toes helps redistribute pressure for everyday relief.' },
  { img: '/conditions/cond-6.avif', name: 'Achilles Tendinitis', text: 'Tightness at the back of the heel that makes each step harder? Gentle overnight stretching can ease tension on the tendon gradually.' },
];

export default function ConditionsSection() {
  return (
    <section className="section-y">
      <div className="wrap">
        {/* Gripzus-native section header — mirrors the shared SectionHead motif
            (full-width top hairline, eyebrow, Space Grotesk display title) with
            an added responsible sub-line. */}
        <div className="border-t border-line pt-6 md:pt-8 mb-8 md:mb-12">
          <p className="eyebrow text-ink-muted mb-2">Everyday foot comfort</p>
          <h2 className="h-display text-2xl md:text-4xl text-ink leading-none">The Gripzus Alignment Socks Can Help With</h2>
          <p className="text-ink-muted text-sm md:text-base leading-relaxed mt-3 max-w-xl">
            Gentle toe separation that many wearers use for everyday relief — a little each day.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {CONDITIONS.map((c) => (
            <div
              key={c.name}
              className="flex flex-col gap-3 border border-line bg-paper-warm p-5 md:p-6 transition-colors hover:border-ink"
            >
              <div className="w-16 h-16 md:w-20 md:h-20 overflow-hidden border border-line bg-paper">
                <img src={c.img} alt={c.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
              </div>
              <h3 className="h-display text-base md:text-lg text-ink leading-tight">{c.name}</h3>
              <p className="text-ink-muted text-xs md:text-sm leading-relaxed">{c.text}</p>
            </div>
          ))}
        </div>

        <p className="text-ink-muted text-xs leading-relaxed mt-6 md:mt-8 max-w-3xl">
          Gripzus is a comfort-wellness product designed to support everyday foot comfort — not a
          medical device, treatment or cure. If you have a diagnosed condition or ongoing pain,
          please check with a podiatrist or doctor.
        </p>
      </div>
    </section>
  );
}

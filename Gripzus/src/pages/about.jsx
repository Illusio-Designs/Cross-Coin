import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import SeoWrapper from '../components/SeoWrapper';

/* About — minimal edition. Pure editorial typography: no photography, no colour
   blocks, no boxed cards. Just quiet type, generous whitespace and hairline
   rules, on the brand's stark white / near-black. */

const PRINCIPLES = [
  { n: '01', title: 'Small batches',  body: 'We knit 500 pairs at a time, not 50,000. The atelier floor holds the entire run in one room.' },
  { n: '02', title: 'Known yarns',    body: 'Every fibre is from a mill we have known by name for years. No surprises, no swap-outs.' },
  { n: '03', title: 'Hand-finished',  body: 'Every pair is hand-linked at the toe — no seam ridges — and inspected pair-by-pair before it boxes.' },
];

const MILESTONES = [
  { y: '2022', t: 'A studio, one machine', e: 'Started in Morbi, Gujarat with a single circular machine and a stubborn idea: a sock should hold the foot.' },
  { y: '2023', t: 'First 500-pair run',    e: 'The Performance Trail launched at one store in Morbi. Sold out in eleven days; the wait list opened.' },
  { y: '2024', t: 'Heritage Charcoal',     e: 'Dress socks added — hidden-seam toes, a low-stretch arch. Stocked at 22 boutiques across India.' },
  { y: '2025', t: 'The Merino edit',       e: 'Three years of testing the merino-tencel blend through real winters. Released to members first.' },
  { y: '2026', t: 'Gripzus, direct',       e: 'Atelier to door. The same pairs, the same hands — without the boutique markup.' },
];

export default function AboutPage() {
  return (
    <SeoWrapper pageName="about">
      <main className="bg-paper">
        <PageHero
          eyebrow="Our story"
          title="Knit with"
          accent="intention."
          intro="A small atelier in Morbi, Gujarat, obsessed with one quiet question — how should a sock hold the foot? Three fibres, hand-linked toes, runs of five hundred. Sold while they last, then knit again, slowly."
        />

        {/* Statement — two quiet paragraphs */}
        <section className="wrap section-y grid grid-cols-1 lg:grid-cols-[minmax(0,14rem)_1fr] gap-6 lg:gap-20">
          <p className="eyebrow text-ink-muted">Who we are</p>
          <div className="space-y-6 max-w-2xl">
            <p className="h-display text-ink text-2xl md:text-3xl leading-snug">
              A sock should be allowed to be a considered object.
            </p>
            <p className="prose-body text-base md:text-lg">
              The arch band, the cuff, and the toe should each earn their place. A pair worn for a
              year should be more interesting at the end of it, not less.
            </p>
            <p className="prose-body text-base md:text-lg">
              We knit on circular machines in a Morbi workshop, finish every pair by hand, and ship
              them in batches small enough that we still know the names of the people on the floor.
              We do not chase seasons — we make the same pair better, every run.
            </p>
          </div>
        </section>

        <div className="wrap"><div className="hairline" /></div>

        {/* Principles — quiet numbered columns, no boxes */}
        <section className="wrap section-y">
          <p className="eyebrow text-ink-muted mb-10 md:mb-16">What we stand for</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-14">
            {PRINCIPLES.map((v) => (
              <div key={v.n}>
                <p className="eyebrow text-ink-muted mb-5">{v.n}</p>
                <h3 className="h-display text-ink text-xl md:text-2xl mb-3">{v.title}</h3>
                <p className="prose-body text-sm md:text-base">{v.body}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="wrap"><div className="hairline" /></div>

        {/* Milestones — minimal timeline, hairline rows */}
        <section className="wrap section-y">
          <p className="eyebrow text-ink-muted mb-10 md:mb-16">Our journey</p>
          <div>
            {MILESTONES.map((m, i) => (
              <div
                key={m.y}
                className={`grid grid-cols-1 md:grid-cols-[110px_1fr] gap-1 md:gap-12 py-7 md:py-8 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <p className="h-display text-ink-muted text-lg md:text-xl">{m.y}</p>
                <div>
                  <h3 className="h-display text-ink text-lg md:text-xl mb-1.5">{m.t}</h3>
                  <p className="prose-body text-sm md:text-base max-w-2xl">{m.e}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Quiet close */}
        <section className="wrap section-y border-t border-line">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <h2 className="h-display text-ink text-2xl md:text-4xl max-w-xl leading-tight">
              Wear the difference for yourself.
            </h2>
            <Link href="/products" className="link-line shrink-0">Shop the catalogue</Link>
          </div>
        </section>
      </main>
    </SeoWrapper>
  );
}

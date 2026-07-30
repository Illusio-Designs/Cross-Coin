import Link from 'next/link';
import SeoWrapper from '../components/SeoWrapper';

const VALUES = [
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

const STATS = [
  { k: '500',  l: 'Pairs per run' },
  { k: '3',    l: 'Fibre families' },
  { k: '12hr', l: 'Inspected, pair by pair' },
  { k: '2022', l: 'Knitting since' },
];

export default function AboutPage() {
  return (
    <SeoWrapper pageName="about">
      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="bg-paper-warm border-b-2 border-ink">
        <div className="wrap section-y">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
            <div>
              <span className="kicker mb-6">Our Story</span>
              <h1 className="h-mark text-ink text-5xl md:text-7xl lg:text-8xl mt-2">
                KNIT WITH<br />INTENTION.
              </h1>
              <p className="prose-body text-base md:text-lg mt-7 max-w-xl">
                Gripzus is a small atelier in Morbi, Gujarat, obsessed with one quiet question —
                how should a sock hold the foot? Three fibres, hand-linked toes, runs of five
                hundred. Sold while they last, then knit again, slowly.
              </p>
              <div className="flex flex-wrap gap-3 mt-8">
                <Link href="/products" className="btn">Shop the catalogue</Link>
                <Link href="/journal" className="btn-outline">Read The Thread</Link>
              </div>
            </div>
            <div className="media-zoom relative aspect-[4/5] overflow-hidden border-2 border-ink bg-paper-deep">
              <img
                src="https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=1100&q=85&auto=format&fit=crop"
                alt="The Gripzus atelier"
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats strip ──────────────────────────────────────── */}
      <section className="border-b-2 border-ink">
        <div className="wrap">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x-2 divide-ink">
            {STATS.map((s) => (
              <div key={s.l} className="py-9 md:py-12 px-4 md:px-6 text-center">
                <p className="font-display text-ink text-4xl md:text-5xl leading-none" style={{ fontWeight: 900 }}>{s.k}</p>
                <p className="eyebrow mt-3">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Who we are ───────────────────────────────────────── */}
      <section className="section-y">
        <div className="wrap grid grid-cols-1 lg:grid-cols-[1fr_1.4fr] gap-10 lg:gap-20">
          <div>
            <span className="kicker mb-5">Who we are</span>
            <h2 className="h-mark text-ink text-4xl md:text-6xl mt-2">
              A MAISON<br />DE SOCK.
            </h2>
          </div>
          <div className="space-y-5">
            <p className="prose-body text-base md:text-lg">
              Gripzus began as a quiet idea — that a sock should be allowed to be a considered
              object. That the arch band, the cuff, and the toe should each earn their place.
              That a pair worn for a year should be more interesting at the end of it, not less.
            </p>
            <p className="prose-body text-base md:text-lg">
              We knit on circular machines in a Morbi workshop, finish every pair by hand,
              and ship them in batches small enough that we still know the names of the people
              on the floor. We do not chase seasons. We make the same pair better, every run.
            </p>
          </div>
        </div>
      </section>

      {/* ── Values ───────────────────────────────────────────── */}
      <section className="section-y bg-ink text-paper">
        <div className="wrap">
          <span className="kicker kicker-light mb-5">What we stand for</span>
          <h2 className="h-mark text-paper text-4xl md:text-6xl mb-14 mt-2">
            THREE PRINCIPLES.
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paper/15 border-2 border-paper/15">
            {VALUES.map((v) => (
              <div key={v.n} className="bg-ink p-8 md:p-10">
                <p className="num-index text-6xl md:text-7xl mb-6" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.5)' }}>{v.n}</p>
                <h3 className="font-display uppercase text-paper text-xl md:text-2xl mb-3" style={{ fontWeight: 900, letterSpacing: '-0.01em' }}>{v.title}</h3>
                <p className="text-paper/65 text-sm md:text-base leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Milestones ───────────────────────────────────────── */}
      <section className="section-y">
        <div className="wrap">
          <span className="kicker mb-5">Our journey</span>
          <h2 className="h-mark text-ink text-4xl md:text-6xl mb-12 mt-2">
            MILESTONES.
          </h2>
          <div className="border-t-2 border-ink">
            {MILESTONES.map((m) => (
              <div key={m.y} className="grid grid-cols-1 md:grid-cols-[160px_1fr] gap-2 md:gap-10 py-7 md:py-10 border-b border-line">
                <p className="font-display text-ink text-3xl md:text-4xl leading-none" style={{ fontWeight: 900 }}>{m.y}</p>
                <div>
                  <h3 className="font-display uppercase text-ink text-xl md:text-2xl mb-2" style={{ fontWeight: 800, letterSpacing: '-0.01em' }}>{m.t}</h3>
                  <p className="prose-body text-sm md:text-base max-w-2xl">{m.e}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────── */}
      <section className="bg-paper-warm border-t-2 border-ink">
        <div className="wrap section-y">
          <div className="flex flex-col md:flex-row items-center justify-between gap-7 text-center md:text-left">
            <h3 className="h-mark text-ink text-4xl md:text-6xl">
              WEAR THE<br />DIFFERENCE.
            </h3>
            <Link href="/products" className="btn shrink-0">Open the catalogue</Link>
          </div>
        </div>
      </section>
    </SeoWrapper>
  );
}

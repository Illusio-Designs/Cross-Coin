import Head from 'next/head';
import Link from 'next/link';

const VALUES = [
  { n: '01', title: 'Small batches',  body: 'We knit 500 pairs at a time, not 50,000. The atelier floor holds the entire run in one room.' },
  { n: '02', title: 'Known yarns',    body: 'Every fibre is from a mill we have known by name for years. No surprises, no swap-outs.' },
  { n: '03', title: 'Hand-finished',  body: 'Every pair is hand-linked at the toe — no seam ridges — and inspected pair-by-pair before it boxes.' },
];

const MILESTONES = [
  { y: '2022', t: 'A studio, one machine', e: 'Started in Ahmedabad with a single circular machine and a stubborn idea: a sock should hold the foot.' },
  { y: '2023', t: 'First 500-pair run',     e: 'The Performance Trail launched at one store in Bandra. Sold out in eleven days; the wait list opened.' },
  { y: '2024', t: 'Heritage Charcoal',      e: 'Dress socks added — hidden-seam toes, a low-stretch arch. Stocked at 22 boutiques across India.' },
  { y: '2025', t: 'The Merino edit',        e: 'Three years of testing the merino-tencel blend through real winters. Released to members first.' },
  { y: '2026', t: 'Gripzus, direct',        e: 'Atelier to door. The same pairs, the same hands — without the boutique markup.' },
];

export default function AboutPage() {
  return (
    <>
      <Head><title>About — Gripzus</title></Head>
      <main className="bg-paper">

        {/* Hero — dark, cinematic */}
        <section className="relative overflow-hidden bg-ink text-paper">
          <div className="paper-grain" />
          <div className="relative max-w-site mx-auto px-6 md:px-12 lg:px-20 pt-20 md:pt-28 pb-16 md:pb-24">
            <div className="flex items-center justify-between mb-14 md:mb-20">
              <span className="mono-label text-saffron-light">Chapter · 00</span>
              <span className="mono-label text-paper/50">The Gripzus Story</span>
            </div>
            <h1
              className="font-display uppercase tracking-[-0.04em] leading-[0.86] mb-9"
              style={{ fontSize: 'clamp(2.8rem, 9vw, 9rem)', fontWeight: 700, fontVariationSettings: '"wdth" 100, "opsz" 96' }}
            >
              Knit with<br />
              <em className="not-italic font-serif italic font-normal text-saffron-light">intention.</em>
            </h1>
            <div className="grid grid-cols-12 gap-6">
              <p className="col-span-12 md:col-span-7 md:col-start-6 text-paper/70 text-base md:text-lg leading-relaxed">
                We are a small atelier in Ahmedabad obsessed with how a sock should hold the foot.
                Three fibres, hand-linked toes, runs of five hundred. Sold while they last — then
                knitted again, slowly.
              </p>
            </div>
          </div>
        </section>

        {/* Atelier image strip */}
        <section className="relative aspect-[21/9] md:aspect-[21/7] overflow-hidden bg-paper-deep">
          <img
            src="https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=1800&q=85&auto=format&fit=crop"
            alt="Gripzus atelier"
            className="absolute inset-0 w-full h-full object-cover"
          />
        </section>

        {/* Who we are */}
        <section className="py-20 md:py-28">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 grid grid-cols-12 gap-10 md:gap-16">
            <div className="col-span-12 md:col-span-5">
              <p className="eyebrow mb-4">Who we are</p>
              <h2 className="h-display text-4xl md:text-6xl">
                A maison<br /><em className="h-italic">de sock.</em>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-7 space-y-5">
              <p className="prose-body text-base md:text-lg">
                Gripzus began as a quiet idea — that a sock should be allowed to be a considered
                object. That the arch band, the cuff, and the toe should each earn their place.
                That a pair worn for a year should be more interesting at the end of it, not less.
              </p>
              <p className="prose-body text-base md:text-lg">
                We knit on circular machines in an Ahmedabad workshop, finish every pair by hand,
                and ship them in batches small enough that we still know the names of the people on
                the floor. We do not chase seasons. We make the same pair better, every run.
              </p>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-ink text-paper py-20 md:py-28">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20">
            <div className="mb-14">
              <p className="mono-label text-saffron-light mb-4">What we stand for</p>
              <h2 className="font-display uppercase text-paper leading-[0.9] tracking-[-0.035em]" style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)', fontWeight: 700 }}>
                Three <em className="not-italic font-serif italic font-normal text-saffron-light">principles.</em>
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-paper/10">
              {VALUES.map((v) => (
                <div key={v.n} className="bg-ink p-8 md:p-10 hover:bg-paper/5 transition-colors">
                  <p className="font-serif italic text-saffron-light text-6xl md:text-7xl leading-none mb-7">{v.n}</p>
                  <h3 className="font-display uppercase text-paper text-xl md:text-2xl mb-3 tracking-[-0.02em]" style={{ fontWeight: 600 }}>{v.title}</h3>
                  <p className="text-paper/65 text-sm leading-relaxed">{v.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="py-20 md:py-28">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20">
            <div className="mb-14">
              <p className="eyebrow mb-4">Our journey</p>
              <h2 className="h-display text-4xl md:text-6xl">Mile<em className="h-italic">stones.</em></h2>
            </div>
            <div className="border-t border-rule">
              {MILESTONES.map((m) => (
                <div key={m.y} className="grid grid-cols-12 gap-4 md:gap-10 py-8 md:py-10 border-b border-rule items-baseline">
                  <p className="col-span-12 md:col-span-2 font-display font-bold text-saffron-deep text-3xl md:text-4xl">{m.y}</p>
                  <h3 className="col-span-12 md:col-span-4 font-display uppercase text-ink text-xl md:text-2xl tracking-[-0.02em]" style={{ fontWeight: 700 }}>{m.t}</h3>
                  <p className="col-span-12 md:col-span-6 prose-body text-sm md:text-base">{m.e}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA band */}
        <section className="bg-paper-deep border-t border-rule py-16 md:py-20">
          <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 flex flex-col md:flex-row items-center justify-between gap-7">
            <h3 className="h-display text-3xl md:text-5xl text-center md:text-left">
              Wear the difference <em className="h-italic">for yourself.</em>
            </h3>
            <Link href="/products" className="cta shrink-0">Open the catalogue</Link>
          </div>
        </section>
      </main>
    </>
  );
}

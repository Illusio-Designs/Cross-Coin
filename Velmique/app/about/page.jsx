import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import SeoWrapper from '@/components/SeoWrapper';

const milestones = [
  { year: '2018', event: 'Velmique founded in Morbi, Gujarat by Obzus India Private Limited — grounded in Grasse technique and the attar heritage of Kannauj.' },
  { year: '2020', event: 'Launched the Signature collection — twelve fragrances composed in-house. Sold out in 72 hours.' },
  { year: '2022', event: 'Opened our flagship boutique at DLF Emporio, New Delhi. Stocked at Le Mill and Good Earth.' },
  { year: '2024', event: 'Launched the Luminara collection — picked up by Vogue, Harper\'s Bazaar and ELLE.' },
  { year: '2026', event: 'Crossed 100+ partner boutiques and 25,000 patrons. Latest drop sold out in 48 hours.' },
];

const values = [
  {
    n: '01',
    title: 'Heritage Botanicals',
    desc: 'Aged oud, Kannauj rose, Mysore sandalwood, Kashmir saffron, Coimbatore tuberose. We build every formula on the finest raws — not as an afterthought, but as the foundation. The cost shows up in the bottle, and the wearer can tell.',
  },
  {
    n: '02',
    title: 'Sustainable Sourcing',
    desc: 'We work directly with farmer cooperatives in Hojai and Kannauj. Every kilogram of agarwood is traceable to its grower. Two percent of revenue is reinvested into the reforestation of native oud trees.',
  },
  {
    n: '03',
    title: 'Made by Hand',
    desc: 'Composed and hand-bottled at our Morbi atelier under direct supervision of our Master Perfumer. No outsourcing, no white-labelling, no shortcuts. Every flacon is numbered and signed.',
  },
];

export default function AboutPage() {
  return (
    <SeoWrapper pageName="about">
    <div className="bg-[var(--bg)] min-h-screen">

      {/* ── HERO — full-bleed background image with editorial text overlay ── */}
      <section className="relative w-full min-h-[90vh] flex items-center overflow-hidden">

        {/* Background image */}
        <img
          src="/abouthero.png"
          alt="Velmique atelier"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark gradient overlay so text stays readable over any image */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/55 to-black/30 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent to-black/40 pointer-events-none" />

        {/* Text content */}
        <div className="relative z-10 max-w-[1600px] w-full mx-auto px-6 md:px-12 lg:px-20 py-24 md:py-32">
          <div className="max-w-3xl">

            {/* Eyebrow with hairline */}
            <div className="flex items-center gap-4 mb-8">
              <span className="h-px w-12 bg-[var(--gold)]" />
              <p className="text-[var(--gold)] text-[10px] md:text-[11px] tracking-[0.5em] uppercase font-body">
                Est. 2018 · Morbi, Gujarat
              </p>
            </div>

            {/* Massive headline */}
            <h1 className="font-display text-white uppercase leading-[0.86] tracking-[-0.02em] mb-8"
              style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}>
              The <em className="not-italic gold-text">Velmique</em><br />
              Story
            </h1>

            {/* Italic tagline */}
            <p className="font-serif italic text-white/90 leading-[1.35] mb-7 max-w-2xl"
              style={{ fontSize: 'clamp(1.2rem, 1.9vw, 1.6rem)' }}>
              French perfumery, Kannauj attar, Mysore sandalwood — composed in Morbi, hand-bottled for a generation that knows the difference.
            </p>

            {/* Body paragraph */}
            <p className="text-white/75 font-body text-base md:text-lg leading-[1.7] text-justify hyphens-auto max-w-2xl mb-10">
              We are a homegrown maison de parfum, building extraits and eaux de parfum the slow way. Every accord is composed by hand at our atelier, cured for weeks in dark glass, and decanted into numbered flacons. No outsourcing. No white-labelling. Just perfume, made with intention.
            </p>

            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-[var(--gold)] hover:bg-white text-[var(--ink)] rounded-full px-7 py-3 text-[11px] tracking-[0.3em] uppercase font-body font-medium transition-colors"
            >
              Discover the Collection
              <ArrowUpRight size={14} strokeWidth={1.6} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── 1. STORY — long-form intro paired with atelier image ── */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-start">

          {/* Left — text */}
          <div className="md:col-span-7">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-5">
              Who We Are
            </p>
            <h2 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight mb-8"
              style={{ fontSize: 'clamp(2rem, 5vw, 3.6rem)' }}>
              Luxury perfumery, <em className="not-italic gold-text">reimagined for India</em>
            </h2>

            <div className="max-w-2xl space-y-5">
              <p className="text-[var(--ink)] font-body text-base md:text-lg leading-[1.7] text-justify hyphens-auto">
                Velmique began as a quiet idea — that India, with its centuries-old attar tradition and access to the world&apos;s most beautiful raw materials, deserved a perfume house of its own. Not an importer. Not a licensee. A maison built here, composed here, decanted here, for a generation that knows the difference.
              </p>
              <p className="text-[var(--ink)] font-body text-base md:text-lg leading-[1.7] text-justify hyphens-auto">
                Our perfumers train in Grasse and apprentice in Kannauj. We source rose absolute from a family of distillers we have known for years, oud aged seven years from Cambodia, and sandalwood under multi-year contracts from Mysore. Every accord is composed by hand at our Bandra atelier, cured for weeks, and decanted into numbered flacons by our team — never by a contractor.
              </p>
              <p className="text-[var(--ink)] font-body text-base md:text-lg leading-[1.7] text-justify hyphens-auto">
                We build perfumes the slow way because we believe the wearer can tell. And, increasingly, the people in the room with the wearer can tell, too.
              </p>
            </div>

            <Link href="/shop" className="pill-cta mt-10">
              Explore the Fragrances <ArrowUpRight size={14} strokeWidth={1.6} />
            </Link>
          </div>

          {/* Right — image */}
          <div className="md:col-span-5">
            <div className="relative overflow-hidden rounded-2xl bg-[var(--surface-2)]">
              <img src="/Aboutpage.png" alt="Velmique atelier"
                className="w-full h-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. VALUES — three principle cards on cream surface ── */}
      <section className="bg-[var(--surface-2)] py-20 md:py-28">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="grid grid-cols-12 gap-6 mb-14 items-end">
            <div className="col-span-12 md:col-span-7">
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
                What We Stand For
              </p>
              <h2 className="font-display text-[var(--ink)] uppercase leading-[0.92] tracking-tight"
                style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.4rem)' }}>
                OUR <em className="not-italic gold-text">VALUES</em>
              </h2>
            </div>
            <div className="col-span-12 md:col-span-5">
              <p className="text-[var(--ink)] font-body text-base leading-[1.7] max-w-md md:ml-auto">
                Three principles that shape every decision — from the absolutes we choose, to the people we work with, to the way each flacon is sealed.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {values.map(v => (
              <div key={v.title} className="bg-white border border-[var(--border)] rounded-2xl p-8 flex flex-col">
                <p className="font-display text-[var(--gold)] text-5xl md:text-6xl leading-none mb-5">{v.n}</p>
                <h3 className="font-serif italic text-[var(--ink)] text-xl md:text-2xl mb-4 leading-tight">{v.title}</h3>
                <p className="text-[var(--ink-soft)] font-body text-sm md:text-base leading-[1.7] text-justify hyphens-auto">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. TIMELINE — milestones ── */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-28">
        <div className="grid grid-cols-12 gap-6 mb-14 items-end">
          <div className="col-span-12 md:col-span-7">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">
              Our Journey
            </p>
            <h2 className="font-display text-[var(--ink)] uppercase leading-[0.92] tracking-tight"
              style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.4rem)' }}>
              MILE<em className="not-italic gold-text">STONES</em>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-5">
            <p className="text-[var(--ink)] font-body text-base leading-[1.7] max-w-md md:ml-auto">
              Eight years of building — from a Bandra studio with three vials, to a maison stocked at India&apos;s most considered boutiques.
            </p>
          </div>
        </div>

        <div className="relative">
          <span aria-hidden className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-[var(--border)]" />
          <div className="space-y-12">
            {milestones.map((m, i) => (
              <div key={m.year}
                className={`relative md:flex md:items-start md:gap-12 pl-12 md:pl-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className={`md:flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-12' : 'md:text-left md:pl-12'}`}>
                  <p className="font-display text-[var(--gold)] leading-none mb-3"
                    style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)' }}>
                    {m.year}
                  </p>
                  <p className="text-[var(--ink)] font-body text-base md:text-lg leading-[1.65] max-w-md md:max-w-none">
                    {m.event}
                  </p>
                </div>
                <span aria-hidden
                  className="absolute left-4 md:left-1/2 md:-translate-x-1/2 top-2 w-3.5 h-3.5 rounded-full bg-[var(--gold)] ring-4 ring-[var(--bg)] z-10" />
                <div className="hidden md:block md:flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. FOUNDER NOTE — atmospheric background image with dark overlay ── */}
      <section className="relative py-24 md:py-36 border-t border-[var(--border)] overflow-hidden">

        {/* Background image */}
        <img
          src="/aboutbg.png"
          alt=""
          aria-hidden
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Dark overlays — same recipe as the hero so text reads cleanly */}
        <div className="absolute inset-0 bg-black/65 pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/55 pointer-events-none" />

        <div className="relative z-10 max-w-3xl mx-auto px-6 md:px-12 text-center">
          <p className="text-[var(--gold)] text-[10px] tracking-[0.45em] uppercase font-body mb-6">
            A Note From The Atelier
          </p>
          <blockquote className="font-serif italic text-white leading-[1.4] mb-8"
            style={{ fontSize: 'clamp(1.5rem, 3vw, 2.4rem)' }}>
            &ldquo;A great perfume should never feel like it was made in a hurry. Even the people in a room with you, who don&apos;t know you wear Velmique, should feel that.&rdquo;
          </blockquote>
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-12 bg-[var(--gold)]" />
            <p className="text-white/85 text-[10px] tracking-[0.35em] uppercase font-body">
              Divyesh · Founder
            </p>
            <span className="h-px w-12 bg-[var(--gold)]" />
          </div>

          <Link
            href="/shop"
            className="inline-flex items-center gap-2 bg-[var(--gold)] hover:bg-white text-[var(--ink)] rounded-full px-7 py-3 mt-10 text-[11px] tracking-[0.3em] uppercase font-body font-medium transition-colors"
          >
            Discover the Collection <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
      </section>
    </div>
    </SeoWrapper>
  );
}

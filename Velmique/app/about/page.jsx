import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

const milestones = [
  { year: '2018', event: 'Velmique founded in Bandra West by Aarav Khanna, after his apprenticeship at Grasse and a year studying attars in Kannauj.' },
  { year: '2020', event: 'Launched the Signature collection — twelve fragrances composed in-house. Sold out in 72 hours.' },
  { year: '2022', event: 'Opened our flagship boutique at DLF Emporio, New Delhi. Stocked at Le Mill and Good Earth.' },
  { year: '2024', event: 'Launched the Luminara collection — picked up by Vogue, Harper\'s Bazaar and ELLE.' },
  { year: '2026', event: 'Crossed 100+ partner boutiques and 25,000 patrons. Latest drop sold out in 48 hours.' },
];

const team = [
  { name: 'Aarav Khanna', role: 'Founder & Master Perfumer', img: 'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=600&q=80', bio: 'Trained at ISIPCA, Grasse · Kannauj attar apprentice' },
  { name: 'Meera Iyer', role: 'Head of Olfaction', img: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600&q=80', bio: 'Third-generation perfumer · Kannauj heritage' },
  { name: 'Vikram Bhatia', role: 'Brand Director', img: 'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?w=600&q=80', bio: 'Ex-Tata CLiQ Luxe · 14 years in luxury retail' },
];

export default function AboutPage() {
  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Our Story"
        title="SCENTED IN"
        accent="PURPOSE"
        intro="A homegrown maison de parfum — French training meets Kannauj attar heritage. Hand-blended at our Bandra atelier from rare absolutes, aged oud and sandalwood."
      />

      {/* Mission */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-20 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-16 items-center">
        <div className="md:col-span-6">
          <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">Who We Are</p>
          <h2 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight mb-6"
            style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
            Luxury Perfumery, <em className="not-italic gold-text">Reimagined</em>
          </h2>
          <p className="text-[var(--ink-soft)] font-body text-base leading-loose mb-4">
            Not just beautiful scents — compositions crafted with intention, built from the world&apos;s rarest absolutes, designed to become part of who you are.
          </p>
          <p className="text-[var(--ink-soft)] font-body text-base leading-loose mb-8">
            Our perfumers train in Grasse and source from Hojai, Mysore, Coimbatore and Kashmir — pairing French technique with the finest raws. Every drop is bottled by hand at our Bandra atelier.
          </p>
          <Link href="/shop" className="pill-cta">
            Explore the Fragrances <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        </div>
        <div className="md:col-span-6 relative">
          <div className="aspect-[4/5] overflow-hidden rounded-2xl">
            <img src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=900&q=85" alt="Velmique atelier"
              className="w-full h-full object-cover" />
          </div>
          <div className="absolute -bottom-6 -left-6 bg-white border border-[var(--border)] rounded-2xl px-7 py-5 max-w-[240px] shadow-xl">
            <p className="font-display text-[var(--gold)] text-5xl leading-none">8+</p>
            <p className="text-[var(--ink-soft)] text-sm font-body mt-1">Years of crafting luxury</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[var(--surface-2)] py-20 md:py-24">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="mb-12 max-w-3xl">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">What We Stand For</p>
            <h2 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              OUR <em className="not-italic gold-text">VALUES</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { n: '01', title: 'Heritage Botanicals', desc: 'Aged oud, Kannauj rose, Mysore sandalwood, Kashmir saffron, Coimbatore tuberose. We build every formula on the finest raws — not as an afterthought, as the foundation.' },
              { n: '02', title: 'Sustainable Sourcing', desc: 'We work directly with farmer cooperatives in Hojai and Kannauj. Every kilogram of agarwood is traceable. We invest 2% of revenue back into reforestation of native oud trees.' },
              { n: '03', title: 'Made by Hand', desc: 'Composed and hand-bottled at our Bandra atelier under direct supervision of Master Perfumer Aarav Khanna. No outsourcing, no white-labelling.' },
            ].map(v => (
              <div key={v.title} className="bg-white border border-[var(--border)] rounded-2xl p-7">
                <p className="font-display text-[var(--gold)] text-5xl leading-none mb-3">{v.n}</p>
                <h3 className="font-serif italic text-[var(--ink)] text-2xl mb-3">{v.title}</h3>
                <p className="text-[var(--ink-soft)] font-body text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-20 md:py-24">
        <div className="mb-12 max-w-3xl">
          <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Our Journey</p>
          <h2 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight"
            style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
            MILE<em className="not-italic gold-text">STONES</em>
          </h2>
        </div>
        <div className="relative">
          <div className="absolute left-4 md:left-1/2 md:-translate-x-px top-0 bottom-0 w-px bg-[var(--border)]" />
          <div className="space-y-10">
            {milestones.map((m, i) => (
              <div key={m.year} className={`relative md:flex md:items-start md:gap-10 pl-12 md:pl-0 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                <div className={`md:flex-1 ${i % 2 === 0 ? 'md:text-right md:pr-10' : 'md:text-left md:pl-10'}`}>
                  <p className="font-display text-[var(--gold)] text-3xl md:text-4xl leading-none">{m.year}</p>
                  <p className="text-[var(--ink-soft)] font-body text-base mt-2 leading-relaxed">{m.event}</p>
                </div>
                <div className="absolute left-4 md:left-1/2 md:-translate-x-1/2 top-2 w-3 h-3 rounded-full bg-[var(--gold)] ring-4 ring-[var(--bg)] z-10" />
                <div className="hidden md:block md:flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-[var(--surface)] py-20 md:py-24">
        <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20">
          <div className="mb-12 max-w-3xl">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">The Noses Behind Velmique</p>
            <h2 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight"
              style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
              OUR <em className="not-italic gold-text">TEAM</em>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {team.map(t => (
              <div key={t.name} className="bg-white rounded-2xl overflow-hidden border border-[var(--border)] group">
                <div className="aspect-[4/5] overflow-hidden">
                  <img src={t.img} alt={t.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                </div>
                <div className="p-6">
                  <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body mb-1">{t.role}</p>
                  <h3 className="font-serif italic text-[var(--ink)] text-2xl">{t.name}</h3>
                  <p className="text-[var(--ink-muted)] text-xs font-body mt-2">{t.bio}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

const milestones = [
  { year: '2018', event: 'Velmique founded in Grasse, France — the perfume capital of the world.' },
  { year: '2020', event: 'Launched the iconic Signature collection — 12 fragrances, sold out in 48 hours.' },
  { year: '2022', event: 'Expanded globally, opening fragrance ateliers in London and Dubai.' },
  { year: '2024', event: 'Introduced the Luminara collection — our most celebrated work to date.' },
  { year: '2026', event: 'Celebrating 8 years of crafting extraordinary fragrances for extraordinary people.' },
];

const team = [
  { name: 'Isabelle Moreau', role: 'Master Perfumer', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80' },
  { name: 'Sophie Laurent', role: 'Head of Olfaction', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80' },
  { name: 'Camille Dubois', role: 'Brand Director', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80' },
];

export default function AboutPage() {
  return (
    <div className="pt-20 min-h-screen">
      {/* Hero */}
      <div className="relative h-[70vh] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1541643600914-78b084683702?w=1600&q=80" alt="About Velmique" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/10" />
        <div className="absolute inset-0 flex items-end pb-20">
          <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
            <p className="text-[#C9A84C] text-xs tracking-[0.4em] uppercase font-body mb-3">Our Story</p>
            <h1 className="font-serif text-6xl md:text-7xl text-cream leading-none max-w-2xl">
              Scented in<br /><span className="gold-text">Purpose</span>
            </h1>
          </div>
        </div>
      </div>

      {/* Mission */}
      <section className="max-w-7xl mx-auto px-6 py-20 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
        <div>
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-4">Who We Are</p>
          <h2 className="font-serif text-4xl text-cream mb-6 leading-snug">
            Luxury perfumery redefined for those who know their worth
          </h2>
          <div className="gold-divider w-16 mb-6" />
          <p className="text-cream/60 font-body text-sm leading-loose mb-4">
            Velmique was born from a simple belief: extraordinary people deserve extraordinary fragrances. Not just beautiful scents, but compositions crafted with intention, built from the world's rarest ingredients, and designed to become part of who you are.
          </p>
          <p className="text-cream/60 font-body text-sm leading-loose mb-6">
            We work with master perfumers trained in Grasse — sourcing oud from Assam, rose absolute from Bulgaria, iris from Florence — insisting on standards that most fragrance houses have long abandoned. Every drop tells a story of obsession.
          </p>
          <Link href="/shop" className="text-[#C9A84C] text-xs tracking-[0.2em] uppercase font-body flex items-center gap-2 hover:gap-3 transition-all">
            Explore the Fragrances <ArrowRight size={12} />
          </Link>
        </div>
        <div className="relative">
          <img src="https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=800&q=80" alt="Perfume craftsmanship"
            className="w-full aspect-[3/4] object-cover rounded-sm" />
          <div className="absolute -bottom-4 -left-4 bg-[#0d0d0d] border border-[#C9A84C]/30 p-5 max-w-[200px]">
            <p className="font-serif text-3xl gold-text">8+</p>
            <p className="text-cream/50 text-xs font-body mt-1">Years of crafting luxury</p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-[#0d0d0d] border-y border-[#C9A84C]/10 py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-14">
            <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">What We Stand For</p>
            <h2 className="font-serif text-4xl text-cream">Our Values</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { title: 'Rare Ingredients', icon: '◆', desc: 'We source only the finest raw materials — aged orris from Florence, wild oud from Assam, Bulgarian rose absolute — because the quality of a fragrance begins long before it reaches the bottle.' },
              { title: 'Sustainable Sourcing', icon: '❋', desc: 'We partner with ethical suppliers who share our commitment to the environment. Natural ingredients are harvested responsibly, and we actively invest in reforestation of oud-producing regions.' },
              { title: 'Transparency', icon: '◉', desc: 'We publish full ingredient lists and sourcing information for every fragrance. You deserve to know exactly what you are wearing — and where it came from.' },
            ].map(v => (
              <div key={v.title} className="text-center">
                <span className="text-[#C9A84C] text-2xl block mb-4">{v.icon}</span>
                <h3 className="font-serif text-2xl text-cream mb-3">{v.title}</h3>
                <p className="text-cream/50 font-body text-sm leading-relaxed">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="max-w-4xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Our Journey</p>
          <h2 className="font-serif text-4xl text-cream">Milestones</h2>
        </div>
        <div className="relative">
          <div className="absolute left-1/2 -translate-x-px top-0 bottom-0 w-px bg-gradient-to-b from-[#C9A84C]/40 via-[#C9A84C]/20 to-transparent" />
          <div className="space-y-10">
            {milestones.map((m, i) => (
              <div key={m.year} className={`flex items-start gap-8 ${i % 2 === 0 ? 'flex-row' : 'flex-row-reverse'}`}>
                <div className={`flex-1 ${i % 2 === 0 ? 'text-right' : 'text-left'}`}>
                  <p className="gold-text font-serif text-2xl">{m.year}</p>
                  <p className="text-cream/60 font-body text-sm mt-1 leading-relaxed">{m.event}</p>
                </div>
                <div className="flex-shrink-0 w-3 h-3 rounded-full bg-[#C9A84C] mt-1.5 border-2 border-[#111] ring-2 ring-[#C9A84C]/30 relative z-10" />
                <div className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="bg-[#0d0d0d] py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">The Noses Behind Velmique</p>
            <h2 className="font-serif text-4xl text-cream">Our Team</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {team.map(t => (
              <div key={t.name} className="text-center group">
                <div className="w-32 h-32 rounded-full overflow-hidden mx-auto mb-4 border-2 border-[#C9A84C]/20 group-hover:border-[#C9A84C]/60 transition-all">
                  <img src={t.img} alt={t.name} className="w-full h-full object-cover" />
                </div>
                <h3 className="font-serif text-lg text-cream">{t.name}</h3>
                <p className="text-[#C9A84C]/60 text-xs tracking-wider uppercase font-body mt-1">{t.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

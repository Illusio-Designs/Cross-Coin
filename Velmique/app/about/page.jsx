import Link from 'next/link';

export const metadata = {
  title: 'Our Story — Velmique Maison de Parfum',
  description: 'VELMIQUE is a maison of handcrafted Indian fragrances — rare ingredients, timeless technique and a modern sensibility.',
};

export default function MaisonAbout() {
  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Our story</span>
        <h1>A Maison Built on Memory.</h1>
        <p>Refined, handcrafted fragrances for those who live with intention.</p>
      </section>

      <section className="m-section m-atelier" style={{ paddingTop: 0 }}><div className="m-wrap m-atelier__grid">
        <div>
          <span className="m-eyebrow">Our philosophy</span>
          <h2>More than a scent. A feeling.</h2>
          <p className="lede">At VELMIQUE we believe a fragrance is a memory in the making — a signature that lingers long after you&rsquo;ve left the room.</p>
        </div>
        <div className="m-notes">
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#f2d08a,#c98f3d)' }} /><div><div className="m-note__k">Rare Ingredients</div><div className="m-note__d">Sourced from around the world.</div></div></div>
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#e7a9a2,#b85f6e)' }} /><div><div className="m-note__k">Indian Craftsmanship</div><div className="m-note__d">Heritage techniques, modern sensibility.</div></div></div>
          <div className="m-note"><span className="m-note__t" style={{ background: 'radial-gradient(circle at 35% 30%,#8a6a46,#3f2a1c)' }} /><div><div className="m-note__k">Memory-Driven</div><div className="m-note__d">Scents designed to stay with you.</div></div></div>
        </div>
      </div></section>

      <section className="m-section"><div className="m-wrap">
        <div className="m-prose">
          <p>VELMIQUE was founded on a simple belief: that scent is the most intimate form of memory. Each fragrance in our maison is composed in India, blending rare naturals with a contemporary sensibility — built for longevity, projection and a trail that becomes unmistakably yours.</p>
          <h2>Crafted with intention</h2>
          <p>Every composition is balanced across top, heart and base notes, so it evolves across the hours — a fresh opening, a characterful heart, and a lasting memory in the dry-down. We obsess over the details most houses overlook: the weight of the glass, the throw of the atomiser, the honesty of the ingredient list.</p>
          <h2>Luxury for every day</h2>
          <p>We make perfume to be worn, not kept for occasions. Extraordinary, yet personal — a signature you reach for every morning.</p>
          <p style={{ marginTop: 28 }}><Link className="m-btn m-btn--fill" href="/test/shop">Discover the collection <span className="m-arrow">→</span></Link></p>
        </div>
      </div></section>
    </>
  );
}

import Link from 'next/link';

/* Static home copy shared by the page and its loading.jsx, so the hero text
   and section titles stay on screen (identical) while the data streams in. */
export function HeroCopy() {
  return (
    <div>
      <span className="m-eyebrow">Indian craftsmanship · global soul</span>
      <h1>Wear Your<br /><em>Presence.</em></h1>
      <p className="m-hero__lede">Refined, handcrafted fragrances for moments that stay with you — long after you&rsquo;ve left the room.</p>
      <div className="m-hero__cta">
        <Link className="m-btn m-btn--fill" href="#m-featured">Discover the collection <span className="m-arrow">→</span></Link>
        <Link className="m-btn m-btn--on-band" href="#m-about">Our story</Link>
      </div>
    </div>
  );
}

export const FEATURED_HEAD = (
  <div className="m-shead">
    <span className="m-eyebrow">Featured fragrances</span>
    <h2>Signature Scents for Every You.</h2>
    <p>Distinctly crafted. Unmistakably you.</p>
  </div>
);

export const NOTES_HEAD = (
  <div className="m-shead">
    <span className="m-eyebrow">Inside our fragrances</span>
    <h2>Notes You&rsquo;ll Fall For.</h2>
    <p>The real ingredients behind every Velmique scent.</p>
  </div>
);

import Icon from '@/components/Icon';

export default function Hero({ features = [] }) {
  return (
    <section className="hero container">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">Premium collection</span>
          <h1>Socks built for <span className="accent">rhythm, comfort</span> &amp; every mile</h1>
          <p>Engineered knit, lasting cushioning and clean design for every step — for sport and the city alike.</p>
          <div className="hero-cta">
            <a href="#bestsellers" className="btn btn-primary">Shop the catalog <span className="arrow"><Icon name="ArrowRight" size={14} /></span></a>
            <a href="#" className="btn btn-ghost">New arrivals</a>
          </div>
        </div>

        <div className="hero-visual">
          {/* Swap for a real lifestyle image (public/hero.webp or an ImageKit URL) */}
          <img
            src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?auto=format&fit=crop&w=1200&q=70"
            alt="Person moving through the city in Morbix socks"
          />
          <div className="hero-features">
            {features.map((f) => (
              <div className="hero-feature" key={f.title}>
                <span className="ic"><Icon name={f.icon} size={18} /></span>
                <div><b>{f.title}</b><span>{f.sub}</span></div>
              </div>
            ))}
          </div>
          <div className="hero-social">
            <span className="avatars"><span /><span /><span /></span>
            <div><b>10 000+ customers</b><small>★ 4.9 average rating</small></div>
          </div>
        </div>
      </div>
    </section>
  );
}

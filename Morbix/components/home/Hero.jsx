import Icon from '@/components/Icon';
import HeroSlider from './HeroSlider';

export default function Hero({ features = [], slides = [] }) {
  return (
    <section className="hero container">
      <div className="hero-card">
        <div className="hero-copy">
          <span className="hero-badge">Premium collection</span>
          <h1>Socks built for <span className="accent">rhythm, comfort</span> &amp; every mile</h1>
          <p>Engineered knit, lasting cushioning and clean design for every step — for sport and the city alike.</p>
          <div className="hero-cta">
            <a href="/products" className="btn btn-primary">Shop the catalog <span className="arrow"><Icon name="ArrowRight" size={14} /></span></a>
            <a href="/collections" className="btn btn-ghost">Collections</a>
          </div>
        </div>

        <div className="hero-visual">
          {slides.length > 0 ? (
            <HeroSlider slides={slides} />
          ) : (
            <div className="hero-spotlight" aria-hidden>
              <span className="hero-spotlight-tag">Morbix</span>
              <Icon name="Footprints" size={130} />
              <span className="hero-spotlight-cap">Premium knit socks</span>
            </div>
          )}
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

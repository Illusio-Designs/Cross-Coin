import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata = { title: 'About' };

const PRINCIPLES = [
  { title: 'Small thing, done properly', text: 'A sock is worn every single day and noticed only when it fails. We sweat the arch band that stays put, the toe seam you never feel and the knit that keeps its shape wash after wash.' },
  { title: 'Engineered around real feet', text: 'Ventilation zones, targeted cushioning and arch support — designed and tested on real feet, for sport, street and the long walk home.' },
  { title: 'Kinder materials', text: 'Organic cotton and recycled yarns wherever we can, because everyday comfort should not cost the planet more than it needs to.' },
];

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <header className="sx-about-hero">
        <span className="eyebrow">Our story</span>
        <h1>Happiness, one pair at a time.</h1>
        <p className="sx-about-lead">Soxbae makes considered socks for people who move. We started with a simple frustration — socks that slip, bunch and wear thin — and set out to fix every one of those small annoyances, properly.</p>
      </header>

      <section className="sx-about-principles">
        {PRINCIPLES.map((p, i) => (
          <div className="sx-about-row" key={p.title}>
            <span className="sx-about-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
            <div>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          </div>
        ))}
      </section>

      <section className="sx-about-close">
        <span className="eyebrow sx-about-close-eyebrow">Happiness in feet</span>
        <h2>Every pair is tested until it disappears — so all you notice is the day ahead.</h2>
        <Link href="/products" className="sx-cta-btn">Shop all socks <Icon name="ArrowRight" size={16} /></Link>
      </section>
    </div>
  );
}

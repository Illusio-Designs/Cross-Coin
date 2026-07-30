import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata = { title: 'About' };

const STATS = [
  { n: '2019', l: 'Founded in Gujarat' },
  { n: '40+', l: 'Knit & fibre iterations' },
  { n: '1M+', l: 'Pairs on happy feet' },
  { n: '4.8★', l: 'Average customer rating' },
];

const PROCESS = [
  { icon: 'Layers', title: 'Knit', text: 'We start at the yarn — combed cotton and recycled fibres knit on fine-gauge machines for a smooth, dense feel.' },
  { icon: 'Wind', title: 'Engineer', text: 'Ventilation zones, a locking arch band and cushioned zones are mapped to the pressure points of a real foot.' },
  { icon: 'ShieldCheck', title: 'Test', text: 'Every prototype is worn, washed and worn again — through runs, workdays and gym sessions — until it disappears.' },
];

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
        <p className="sx-about-lead">Soxbae began with a simple frustration — socks that slip, bunch and wear thin after a month. So we set out to fix every one of those small annoyances, properly, and make the most overlooked thing you wear the most comfortable thing you own.</p>
      </header>

      <section className="sx-about-stats">
        {STATS.map((s) => (
          <div className="sx-about-stat" key={s.l}>
            <b>{s.n}</b>
            <span>{s.l}</span>
          </div>
        ))}
      </section>

      <section className="sx-about-process">
        <div className="sx-about-section-head">
          <span className="eyebrow">How they're made</span>
          <h2>Knit, engineered, tested.</h2>
        </div>
        <div className="sx-about-process-grid">
          {PROCESS.map((p, i) => (
            <div className="sx-about-step" key={p.title}>
              <span className="sx-about-step-ic"><Icon name={p.icon} size={22} /></span>
              <span className="sx-about-step-n">Step {i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="sx-about-principles">
        <div className="sx-about-section-head" style={{ marginBottom: 8 }}>
          <span className="eyebrow">What we stand for</span>
          <h2>The details most brands skip.</h2>
        </div>
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

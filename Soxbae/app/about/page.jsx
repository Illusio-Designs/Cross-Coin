import Link from 'next/link';
import Icon from '@/components/Icon';

export const metadata = { title: 'About' };

const PROCESS = [
  { icon: 'Layers', title: 'Knit', text: 'We start at the yarn — combed cotton and recycled fibres knit on fine-gauge machines for a smooth, dense feel underfoot.' },
  { icon: 'Wind', title: 'Engineer', text: 'Ventilation zones, a locking arch band and cushioned panels are mapped to the pressure points of a real, moving foot.' },
  { icon: 'ShieldCheck', title: 'Test', text: 'Every prototype is worn, washed and worn again — through runs, workdays and gym sessions — until it disappears.' },
];

const PRINCIPLES = [
  { title: 'Small thing, done properly', text: 'A sock is worn every single day and noticed only when it fails. We sweat the arch band that stays put, the toe seam you never feel and the knit that keeps its shape wash after wash.' },
  { title: 'Engineered around real feet', text: 'Ventilation zones, targeted cushioning and arch support — designed and tested on real feet, for sport, street and the long walk home in between.' },
  { title: 'Kinder materials', text: 'Organic cotton and recycled yarns wherever we can, because everyday comfort should not cost the planet more than it truly needs to.' },
];

export default function AboutPage() {
  return (
    <div className="container sx-ab">
      {/* Hero — editorial split: headline left, story right */}
      <section className="sx-ab-hero">
        <div className="sx-ab-hero-l">
          <span className="eyebrow">Our story</span>
          <h1>Happiness, one pair at a time.</h1>
        </div>
        <div className="sx-ab-hero-r">
          <p>Soxbae began with a simple frustration — socks that slip, bunch and wear thin after a month. So we set out to fix every one of those small annoyances, properly.</p>
          <p>The result is a considered everyday sock: cushioned where it counts, breathable through the day and made to last — turning the most overlooked thing you wear into the most comfortable thing you own.</p>
        </div>
      </section>

      {/* Mission band */}
      <section className="sx-ab-mission">
        <span className="eyebrow">What drives us</span>
        <p className="sx-ab-mission-line">“Comfort is not a luxury — it’s the quiet baseline of a good day. We build it into every stitch.”</p>
      </section>

      {/* Process */}
      <section className="sx-ab-block">
        <div className="sx-ab-block-head">
          <span className="eyebrow">How they’re made</span>
          <h2>Knit, engineered, tested.</h2>
        </div>
        <div className="sx-ab-process">
          {PROCESS.map((p, i) => (
            <div className="sx-ab-step" key={p.title}>
              <span className="sx-ab-step-ic"><Icon name={p.icon} size={22} /></span>
              <span className="sx-ab-step-n">Step {i + 1}</span>
              <h3>{p.title}</h3>
              <p>{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Principles — sticky head left, numbered rows right */}
      <section className="sx-ab-principles">
        <div className="sx-ab-principles-head">
          <span className="eyebrow">What we stand for</span>
          <h2>The details most brands skip.</h2>
          <p>Three commitments that shape every pair we make.</p>
        </div>
        <div className="sx-ab-rows">
          {PRINCIPLES.map((p, i) => (
            <div className="sx-ab-row" key={p.title}>
              <span className="sx-ab-num" aria-hidden>{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Close */}
      <section className="sx-ab-close">
        <span className="eyebrow">Happiness in feet</span>
        <h2>Every pair is tested until it disappears — so all you notice is the day ahead.</h2>
        <Link href="/products" className="sx-cta-btn">Shop all socks <Icon name="ArrowRight" size={16} /></Link>
      </section>
    </div>
  );
}

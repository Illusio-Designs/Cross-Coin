import Icon from '@/components/Icon';

export const metadata = { title: 'About' };

const VALUES = [
  { icon: 'ShieldCheck', title: 'Hallmarked purity', text: 'Every piece is 916 BIS-certified gold — assured purity you can pass down.' },
  { icon: 'Sparkles', title: 'Made by hand', text: 'Cut, set and finished by master goldsmiths in our own Morbi studio.' },
  { icon: 'Gauge', title: 'Certified stones', text: 'Conflict-free, lab-certified diamonds and gemstones, ethically sourced.' },
];

const STEPS = [
  { n: '01', title: 'Designed', text: 'Each piece begins as a hand sketch — a shape meant to be worn for decades, not a season.' },
  { n: '02', title: 'Handcrafted', text: 'Our goldsmiths cut, set and finish every piece by hand, stone by stone.' },
  { n: '03', title: 'Hallmarked', text: 'Gold is 916 BIS hallmarked and every stone is independently certified.' },
  { n: '04', title: 'Delivered', text: 'Insured delivery to your door — with lifetime cleaning and care included.' },
];

const STATS = [
  { big: '916', small: 'BIS hallmarked gold' },
  { big: '100%', small: 'Handmade in Morbi' },
  { big: 'Lifetime', small: 'Cleaning & care' },
];

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 20 }}>
      <div className="page-hero">
        <span className="eyebrow">Our story</span>
        <h1>About Velquira</h1>
        <p>We make fine jewellery for the moments that matter — engagements, milestones and everyday elegance — handmade in our Morbi studio to be treasured for generations.</p>
      </div>

      {/* Story — two-column editorial */}
      <section className="about-story">
        <div className="about-story-media" aria-hidden>
          <Icon name="Sparkles" size={64} />
          <span>Handmade in Morbi, India</span>
        </div>
        <div className="about-story-text">
          <span className="eyebrow">How we began</span>
          <h2>Jewellery meant to outlive the moment</h2>
          <p>Velquira was born from a simple belief: fine jewellery should be honest — real gold, real stones, made by real hands. No plating, no shortcuts, no mystery about what you're wearing.</p>
          <p>From our studio in Morbi, a small team of goldsmiths shapes each piece by hand and inspects it against exacting standards. What you wear today is built to become tomorrow's heirloom.</p>
        </div>
      </section>

      {/* Stat band */}
      <section className="about-stats">
        {STATS.map((s) => (
          <div className="about-stat" key={s.small}><b>{s.big}</b><span>{s.small}</span></div>
        ))}
      </section>

      {/* Process — from sketch to heirloom */}
      <section className="about-process">
        <div className="section-head">
          <div><span className="eyebrow">How it's made</span><h2>From sketch to heirloom</h2></div>
        </div>
        <div className="proc-grid">
          {STEPS.map((s) => (
            <div className="proc" key={s.n}>
              <span className="proc-n">{s.n}</span>
              <b>{s.title}</b>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Values */}
      <div className="section-head" style={{ marginBottom: 8 }}>
        <div><span className="eyebrow">What we promise</span><h2>Held to a higher standard</h2></div>
      </div>
      <div className="about-values">
        {VALUES.map((v) => (
          <div className="about-card" key={v.title}>
            <span className="ic"><Icon name={v.icon} size={22} /></span>
            <b>{v.title}</b>
            <p>{v.text}</p>
          </div>
        ))}
      </div>

      <div className="about-band">
        <h2>Made to be treasured for generations</h2>
        <p>From the first sketch to the final polish, every Velquira piece is shaped by hand and held to exacting standards — so what you wear today becomes tomorrow's heirloom.</p>
      </div>
    </div>
  );
}

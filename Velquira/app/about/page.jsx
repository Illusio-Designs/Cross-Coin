import Icon from '@/components/Icon';

export const metadata = { title: 'About' };

const VALUES = [
  { icon: 'ShieldCheck', title: 'Hallmarked purity', text: 'Every piece is 916 BIS-certified gold — assured purity you can pass down.' },
  { icon: 'Sparkles', title: 'Handmade', text: 'Cut, set and finished by master artisans in our Morbi studio.' },
  { icon: 'Gauge', title: 'Certified stones', text: 'Conflict-free, lab-certified diamonds and gemstones, ethically sourced.' },
];

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 20 }}>
      <div className="page-hero">
        <span className="eyebrow">Our story</span>
        <h1>About Velquira</h1>
        <p>Velquira crafts fine jewellery for life’s most special moments — engagements, heirlooms and everyday elegance. From our studio in Morbi, we pair hallmarked gold and certified stones with expert craft and quiet, timeless design.</p>
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
        <div>
          <h2>Made to be treasured for generations</h2>
          <p>From the first sketch to the final polish, every Velquira piece is shaped by hand and inspected against exacting standards — so what you wear today becomes tomorrow’s heirloom.</p>
        </div>
      </div>
    </div>
  );
}

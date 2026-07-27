import Icon from '@/components/Icon';

export const metadata = { title: 'About' };

const VALUES = [
  { icon: 'Layers', title: 'Built to last', text: 'Reinforced knit and premium fibres that survive wash after wash.' },
  { icon: 'Wind', title: 'Engineered comfort', text: 'Ventilation, cushioning and arch support designed around real feet.' },
  { icon: 'Leaf', title: 'Kinder materials', text: 'Organic cotton and recycled yarns, because comfort should not cost the planet.' },
];

export default function AboutPage() {
  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 20 }}>
      <div className="page-hero">
        <span className="eyebrow">Our story</span>
        <h1>Comfort in every step</h1>
        <p>Morbix makes premium socks for people who move — runners, athletes and city dwellers alike. We obsess over the details most brands ignore: the arch band that stays put, the toe seam you never feel, the knit that breathes.</p>
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
          <h2>Designed for movement, made for every day</h2>
          <p>From the first prototype to the pair on your feet, every Morbix sock is tested by real athletes and refined until it disappears — so all you notice is the run, the game, or the walk home.</p>
        </div>
      </div>
    </div>
  );
}

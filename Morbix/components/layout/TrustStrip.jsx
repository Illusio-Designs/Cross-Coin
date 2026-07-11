import Icon from '@/components/Icon';

const ITEMS = [
  { icon: 'Truck',       title: 'Free shipping',      sub: 'on orders over $50' },
  { icon: 'RefreshCw',   title: '14-day returns',     sub: 'for unworn items' },
  { icon: 'ShieldCheck', title: 'Authentic products', sub: 'quality guaranteed' },
  { icon: 'Clock',       title: '24/7 support',       sub: 'we are always here' },
];

export default function TrustStrip() {
  return (
    <section className="container">
      <div className="trust">
        {ITEMS.map((i) => (
          <div key={i.title}>
            <span className="ic"><Icon name={i.icon} size={26} /></span>
            <div><b>{i.title}</b><span>{i.sub}</span></div>
          </div>
        ))}
      </div>
    </section>
  );
}

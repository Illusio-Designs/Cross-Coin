import Icon from '@/components/Icon';

export default function Technologies({ items = [] }) {
  return (
    <section className="section container">
      <div className="section-head">
        <span className="eyebrow">Our craft</span><h2>The Velquira Craft</h2>
      </div>
      <div className="tech-grid">
        {items.map((t) => (
          <div className="tech" key={t.name}>
            <span className="ic"><Icon name={t.icon} size={22} /></span>
            <b>{t.name}</b>
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

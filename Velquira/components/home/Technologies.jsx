import Icon from '@/components/Icon';

export default function Technologies({ items = [] }) {
  return (
    <section className="section container">
      <div className="section-head">
        <h2>Technology for your movement</h2>
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

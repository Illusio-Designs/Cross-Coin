import Icon from '@/components/Icon';

// Soxbae "craft" section — an editorial NUMBERED LIST (not Morbix's icon-tile
// grid): a left intro, then rows of 01/02/03 with a hairline between each.
export default function Technologies({ items = [] }) {
  if (!items.length) return null;
  return (
    <section className="section container sx-tech">
      <div className="sx-tech-intro">
        <span className="eyebrow">The craft</span>
        <h2>Engineered into every stitch</h2>
        <p>Small details, obsessed over — so your socks feel considered from the first wear to the hundredth wash.</p>
      </div>
      <ol className="sx-tech-list">
        {items.map((t, i) => (
          <li className="sx-tech-row" key={t.name}>
            <span className="sx-tech-num">{String(i + 1).padStart(2, '0')}</span>
            <span className="sx-tech-ic"><Icon name={t.icon} size={20} /></span>
            <div className="sx-tech-txt">
              <b>{t.name}</b>
              <span>{t.text}</span>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

// Soxbae ethos band — minimal: a single quiet statement, then a thin three-point
// values row (text only, hairline-separated). No tiles, no icons, no borders.
export default function Technologies({ items = [] }) {
  const points = (items || []).slice(0, 3);
  return (
    <section className="section container sx-ethos">
      <p className="sx-ethos-line">
        Considered socks — cushioned, breathable, made to be worn every day and kept for years.
      </p>
      {points.length > 0 && (
        <div className="sx-ethos-points">
          {points.map((t) => (
            <div className="sx-ethos-point" key={t.name}>
              <b>{t.name}</b>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

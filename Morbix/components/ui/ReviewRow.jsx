/* Reviews as an auto-scrolling row. With enough reviews the cards drift sideways in a
   seamless loop (CSS only) and pause while hovered, touched or focused; with only a few
   they stay as a normal static list. For people who prefer reduced motion the row becomes
   a plain swipeable strip instead. Markup only, so it works in server components. */
export default function ReviewRow({ items = [], render, staticClassName = '', min = 4 }) {
  if (items.length < min) {
    return <div className={staticClassName}>{items.map((r, i) => render(r, i))}</div>;
  }
  const seconds = Math.max(45, items.length * 13);
  return (
    <div className="rv-marquee" role="region" aria-label="Customer reviews" style={{ '--rv-dur': `${seconds}s` }} tabIndex={0}>
      <div className="rv-track">
        {items.map((r, i) => render(r, i))}
        {items.map((r, i) => (
          <div className="rv-dup" aria-hidden="true" key={`dup-${i}`}>{render(r, `d${i}`)}</div>
        ))}
      </div>
    </div>
  );
}

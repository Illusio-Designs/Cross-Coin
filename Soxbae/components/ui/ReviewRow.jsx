/* Reviews as an auto-scrolling row. With enough reviews the cards drift sideways in a
   seamless loop (CSS only) and pause while hovered, touched or focused; with only a few
   they stay as a normal static strip. For people who prefer reduced motion the row becomes
   a plain swipeable strip instead. Markup only — same behaviour as the Morbix wall. */
export default function ReviewRow({ items = [], render, staticClassName = '', min = 4, secPerItem = 2.5, minDur = 18, direction = 'left' }) {
  if (items.length < min) {
    return <div className={staticClassName}>{items.map((r, i) => render(r, i))}</div>;
  }
  const seconds = Math.max(minDur, items.length * secPerItem);
  return (
    <div className="sxrv-marquee" role="region" aria-label="Customer reviews" style={{ '--sxrv-dur': `${seconds}s` }} tabIndex={0}>
      <div className={`sxrv-track${direction === 'right' ? ' sxrv-rtl' : ''}`}>
        {items.map((r, i) => render(r, i))}
        {items.map((r, i) => (
          <div className="sxrv-dup" aria-hidden="true" key={`dup-${i}`}>{render(r, `d${i}`)}</div>
        ))}
      </div>
    </div>
  );
}

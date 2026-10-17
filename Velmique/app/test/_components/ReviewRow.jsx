/* Reviews as an auto-scrolling row (same pattern as Morbix). With enough
   reviews the cards drift sideways in a seamless CSS loop and pause on hover /
   touch / focus; with only a few they stay a normal static grid. Reduced-motion
   turns the row into a plain swipeable strip. Markup only — works in a server
   component. */
export default function ReviewRow({
  items = [],
  render,
  staticClassName = '',
  min = 4,
  secPerItem = 2.5,
  minDur = 18,
  direction = 'left',
}) {
  if (items.length < min) {
    return <div className={staticClassName}>{items.map((r, i) => render(r, i))}</div>;
  }
  const seconds = Math.max(minDur, items.length * secPerItem);
  return (
    <div className="m-rvmarq" role="region" aria-label="Customer reviews" style={{ '--m-rvdur': `${seconds}s` }} tabIndex={0}>
      <div className={`m-rvtrack${direction === 'right' ? ' rtl' : ''}`}>
        {items.map((r, i) => render(r, i))}
        {items.map((r, i) => (
          <div className="m-rvdup" aria-hidden="true" key={`dup-${i}`}>{render(r, `d${i}`)}</div>
        ))}
      </div>
    </div>
  );
}

/* Trust strip — editorial gallery. A very quiet thin row of tiny uppercase
   labels on hairlines. Sits near the bottom of the home page. */

const ITEMS = [
  { title: 'Free shipping',    note: 'On orders over ₹999, India-wide.' },
  { title: '30-day returns',   note: 'Not right? Send it back.' },
  { title: 'Knit small-batch', note: 'Inspected pair-by-pair in Morbi.' },
  { title: 'Secure checkout',  note: '100% secure payments, every time.' },
];

export default function TrustStrip() {
  return (
    <section className="border-t border-line">
      <div className="wrap">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {ITEMS.map((it) => (
            <div
              key={it.title}
              className="py-8 md:py-10 px-1 border-b border-line md:border-b-0 md:border-l md:first:border-l-0 md:pl-6"
            >
              <p className="eyebrow text-ink mb-2">{it.title}</p>
              <p className="text-[12px] text-ink-soft leading-relaxed max-w-[200px]">{it.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

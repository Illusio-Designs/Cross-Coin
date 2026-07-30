/* Trust badges strip — static. Sits near the bottom of the home page. */

const ITEMS = [
  {
    title: 'Free shipping',
    note: 'On every order over ₹999, India-wide.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="13" height="11" rx="1" /><path d="M14 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
      </svg>
    ),
  },
  {
    title: '30-day returns',
    note: 'Wear-tested. Not right? Send it back.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 1 3 6.7" /><polyline points="3 21 3 15 9 15" />
      </svg>
    ),
  },
  {
    title: 'Knit small-batch',
    note: 'Inspected pair-by-pair in Morbi.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 6 6 .9-4.5 4.3 1 6.1L12 17l-5.5 3.3 1-6.1L3 8.9 9 8z" />
      </svg>
    ),
  },
  {
    title: 'Secure checkout',
    note: '100% secure payments, every time.',
    icon: (
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <section className="bg-ink text-paper">
      <div className="wrap">
        <div className="grid grid-cols-2 md:grid-cols-4 border-l border-paper/15">
          {ITEMS.map((it, i) => (
            <div
              key={it.title}
              className="group relative flex flex-col gap-4 border-r border-b md:border-b-0 border-paper/15 px-6 py-10 md:py-14"
            >
              <span className="num-index text-3xl md:text-4xl" style={{ WebkitTextStroke: '1.5px rgba(255,255,255,0.35)' }}>
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="text-paper">{it.icon}</div>
              <div>
                <h3 className="font-display text-paper text-lg md:text-xl uppercase leading-none tracking-tight mb-2" style={{ fontWeight: 900 }}>{it.title}</h3>
                <p className="text-paper/55 text-sm leading-relaxed max-w-[220px]">{it.note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

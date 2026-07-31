/* Trust badges strip — static. Techwear spec-row grid. Sits near the
   bottom of the home page. */

const ITEMS = [
  {
    code: 'SHIP',
    title: 'Free shipping',
    note: 'On every order over ₹999, India-wide.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="6" width="13" height="11" rx="1" /><path d="M14 9h4l3 3v5h-7" /><circle cx="6" cy="18" r="2" /><circle cx="17" cy="18" r="2" />
      </svg>
    ),
  },
  {
    code: 'RTRN',
    title: '30-day returns',
    note: 'Wear-tested. Not right? Send it back.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 1 3 6.7" /><polyline points="3 21 3 15 9 15" />
      </svg>
    ),
  },
  {
    code: 'KNIT',
    title: 'Knit small-batch',
    note: 'Inspected pair-by-pair in Morbi.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2l3 6 6 .9-4.5 4.3 1 6.1L12 17l-5.5 3.3 1-6.1L3 8.9 9 8z" />
      </svg>
    ),
  },
  {
    code: 'SECR',
    title: 'Secure checkout',
    note: '100% secure payments, every time.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
];

export default function TrustStrip() {
  return (
    <section className="section-y border-t border-line">
      <div className="wrap">
        <div className="flex items-center justify-between border-t border-ink pt-3 mb-8">
          <span className="spec text-ink">SERVICE SPEC — STANDARD</span>
          <span className="spec text-ink-muted hidden sm:inline">GRIPZUS™ GUARANTEE</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {ITEMS.map((it, i) => (
            <div
              key={it.title}
              className="flex flex-col rounded-[16px] border border-line bg-paper-warm px-5 py-6 shadow-soft transition-colors hover:border-accent"
            >
              <div className="flex items-center justify-between mb-6">
                <span className="spec text-ink-muted">{String(i + 1).padStart(2, '0')}/</span>
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-paper text-accent-deep">
                  {it.icon}
                </div>
              </div>
              <span className="spec text-accent mb-1.5">{it.code}</span>
              <h3 className="h-display text-lg mb-1.5">{it.title}</h3>
              <p className="prose-body text-sm max-w-[220px]">{it.note}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

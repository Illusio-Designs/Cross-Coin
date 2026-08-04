/* Trust strip — Monochrome Atelier. Four elevated white cards floating on the
   canvas, each with a quiet line icon, a label and a note. Reads premium and
   tactile without any colour — depth does the work. */

function ShipIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7" cy="18" r="1.6" /><circle cx="17.5" cy="18" r="1.6" />
    </svg>
  );
}
function ReturnIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 8a9 9 0 1 1-1 4" /><polyline points="3 4 3 8 7 8" />
    </svg>
  );
}
function KnitIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" /><path d="M8 5c2 2 2 5 0 7s-2 5 0 7" /><path d="M16 5c-2 2-2 5 0 7s2 5 0 7" />
    </svg>
  );
}
function LockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4.5" y="10" width="15" height="10" rx="2.5" /><path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

const ITEMS = [
  { title: 'Free shipping',    note: 'On orders over ₹999, India-wide.',    Icon: ShipIcon },
  { title: '30-day returns',   note: 'Not right? Send it back, no fuss.',    Icon: ReturnIcon },
  { title: 'Knit small-batch', note: 'Inspected pair-by-pair in Morbi.',     Icon: KnitIcon },
  { title: 'Secure checkout',  note: '100% secure payments, every time.',    Icon: LockIcon },
];

export default function TrustStrip() {
  return (
    <section className="section-y">
      <div className="wrap">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
          {ITEMS.map(({ title, note, Icon }) => (
            <div
              key={title}
              className="group card-soft lift p-5 md:p-6 flex flex-col gap-4"
            >
              <span className="w-11 h-11 rounded-full bg-ink text-paper flex items-center justify-center shadow-sm transition-transform duration-500 group-hover:-translate-y-0.5">
                <Icon />
              </span>
              <div>
                <p className="eyebrow text-ink mb-1.5">{title}</p>
                <p className="text-[12px] text-ink-soft leading-relaxed max-w-[220px]">{note}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

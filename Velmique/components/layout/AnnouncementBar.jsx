'use client';

const messages = [
  '✦ Complimentary Shipping on Orders Over $150',
  '✦ New Launch — Phantom Encens · Discover Now',
  '✦ Free Sample with Every Order',
  '✦ Lumière Dorée — Luminara Collection Available',
];

export default function AnnouncementBar() {
  return (
    <div className="relative bg-[var(--ink)] py-2.5 px-4 overflow-hidden">
      <div className="marquee-container">
        <div className="marquee-content">
          {[...messages, ...messages, ...messages].map((msg, i) => (
            <span key={i} className="inline-block mx-10 text-[10px] tracking-[0.3em] text-[var(--gold-light)] font-body uppercase">
              {msg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

'use client';

const messages = [
  '✦ Complimentary Shipping on Orders Over $150',
  '✦ New Launch — Phantom Encens · Discover Now',
  '✦ Free Sample with Every Order',
  '✦ Lumière Dorée — Luminara Collection Available',
];

export default function AnnouncementBar() {
  // NOT sticky — scrolls away with the page
  return (
    <div className="relative bg-[#1c1a16] py-2.5 px-4 overflow-hidden">
      <div className="marquee-container">
        <div className="marquee-content">
          {[...messages, ...messages, ...messages].map((msg, i) => (
            <span key={i} className="inline-block mx-10 text-[10px] tracking-[0.3em] text-[#d8bf92] font-body uppercase">
              {msg}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

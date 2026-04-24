'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

const messages = [
  '✦ Complimentary Shipping on Orders Over $150',
  '✦ New Launch — Phantom Encens · Discover Now',
  '✦ Free Sample with Every Order',
  '✦ Lumière Dorée — Luminara Collection Available',
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

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
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#d8bf92] transition-colors"
        aria-label="Close announcement"
      >
        <X size={13} />
      </button>
    </div>
  );
}

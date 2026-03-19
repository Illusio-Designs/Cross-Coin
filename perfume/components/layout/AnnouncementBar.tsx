'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

const messages = [
  '✦ Free Shipping on Orders Over $150 ✦',
  '✦ New Collection: Luminara — Shop Now ✦',
  '✦ Exclusive Members-Only Sale — Join Today ✦',
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const [idx, setIdx] = useState(0);

  if (!visible) return null;

  return (
    <div className="relative bg-black border-b border-[#C9A84C]/20 py-2.5 px-4 text-center">
      <div className="marquee-container">
        <div className="marquee-content">
          {[...messages, ...messages].map((msg, i) => (
            <span key={i} className="inline-block mx-12 text-xs tracking-[0.2em] text-[#C9A84C] font-body uppercase">
              {msg}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={() => setVisible(false)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

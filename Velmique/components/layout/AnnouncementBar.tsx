'use client';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const messages = [
  '✦ Free Shipping on Orders Over $150 ✦',
  '✦ New Collection: Luminara — Shop Now ✦',
  '✦ Exclusive Members-Only Sale — Join Today ✦',
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  // Keep CSS variable in sync with bar height so Navbar can offset itself
  useEffect(() => {
    const update = () => {
      const h = barRef.current ? barRef.current.offsetHeight : 0;
      document.documentElement.style.setProperty('--announcement-h', `${h}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [visible]);

  // When dismissed, zero out the variable
  const handleClose = () => {
    setVisible(false);
    document.documentElement.style.setProperty('--announcement-h', '0px');
  };

  if (!visible) return null;

  return (
    <div
      ref={barRef}
      className="sticky top-0 z-50 relative bg-black border-b border-[#C9A84C]/20 py-2.5 px-4 text-center"
    >
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
        onClick={handleClose}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#C9A84C]/60 hover:text-[#C9A84C] transition-colors"
        aria-label="Close announcement"
      >
        <X size={14} />
      </button>
    </div>
  );
}

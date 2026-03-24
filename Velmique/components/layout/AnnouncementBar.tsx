'use client';
import { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const messages = [
  '✦ Free Delivery on Orders Over $150 ✦',
  '✦ New Launch: Phantom Encens — Shop Now ✦',
  '✦ Complimentary Sample with Every Order ✦',
  '✦ Lumière Dorée — Now Available ✦',
];

export default function AnnouncementBar() {
  const [visible, setVisible] = useState(true);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      const h = barRef.current ? barRef.current.offsetHeight : 0;
      document.documentElement.style.setProperty('--announcement-h', `${h}px`);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [visible]);

  const handleClose = () => {
    setVisible(false);
    document.documentElement.style.setProperty('--announcement-h', '0px');
  };

  if (!visible) return null;

  return (
    <div ref={barRef} className="sticky top-0 z-50 relative bg-black py-2.5 px-4 text-center">
      <div className="marquee-container">
        <div className="marquee-content">
          {[...messages, ...messages].map((msg, i) => (
            <span key={i} className="inline-block mx-12 text-[10px] tracking-[0.25em] text-[#C9A84C] font-body uppercase font-semibold">
              {msg}
            </span>
          ))}
        </div>
      </div>
      <button
        onClick={handleClose}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-[#C9A84C] transition-colors"
        aria-label="Close announcement"
      >
        <X size={13} />
      </button>
    </div>
  );
}

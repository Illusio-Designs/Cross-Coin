'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

// Floating helpers pinned bottom-right, same as the other brands:
//  • a WhatsApp chat button (always visible)
//  • a back-to-top button that appears once you scroll down
const WA_URL = `https://wa.me/917434834000?text=${encodeURIComponent('Hi! I need help with my Velquira order.')}`;

export default function FloatingWidgets() {
  const [scrolled, setScrolled] = useState(false);
  const [greetVisible, setGreetVisible] = useState(true);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      {greetVisible && !scrolled && (
        <div className="gzwa-greet">
          <a href={WA_URL} target="_blank" rel="noopener noreferrer" style={{ flex: 1, whiteSpace: 'nowrap', color: 'inherit', textDecoration: 'none' }}>👋 Hi! Need help? Chat with us</a>
          <button className="gzwa-greet-close" onClick={() => setGreetVisible(false)} aria-label="Close">×</button>
          <style jsx>{`
            .gzwa-greet { position: fixed; right: 20px; bottom: 86px; background: #fff; border-radius: 12px 12px 0 12px; padding: 10px 14px 10px 12px; box-shadow: 0 4px 20px rgba(0,0,0,.12); font-size: 13.5px; color: #111827; z-index: 61; display: flex; align-items: center; gap: 8px; max-width: 240px; white-space: nowrap; animation: gzwaPop .3s cubic-bezier(.34,1.4,.64,1); }
            .gzwa-greet-close { background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 18px; line-height: 1; padding: 0; flex-shrink: 0; }
            @keyframes gzwaPop { from { opacity: 0; transform: translateY(8px) scale(.92); } to { opacity: 1; transform: none; } }
            @media (max-width: 640px) { .gzwa-greet { right: 14px; bottom: 76px; } }
          `}</style>
        </div>
      )}
      <div className="fab-stack" aria-hidden={false}>
      <button
        type="button"
        className={`fab fab-top${scrolled ? ' show' : ''}`}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="Back to top"
        tabIndex={scrolled ? 0 : -1}
      >
        <Icon name="ArrowUp" size={20} />
      </button>

      <a
        href={WA_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="fab fab-wa"
        aria-label="Chat on WhatsApp"
      >
        <Icon name="WhatsApp" size={26} />
      </a>
      </div>
    </>
  );
}

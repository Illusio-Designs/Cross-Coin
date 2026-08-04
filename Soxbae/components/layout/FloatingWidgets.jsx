'use client';

import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';

// Floating helpers pinned bottom-right, same as the other brands:
//  • a WhatsApp chat button (always visible)
//  • a back-to-top button that appears once you scroll down
const WA_URL = `https://wa.me/919712891700?text=${encodeURIComponent('Hi! I need help with my Soxbae order.')}`;

export default function FloatingWidgets() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
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
  );
}

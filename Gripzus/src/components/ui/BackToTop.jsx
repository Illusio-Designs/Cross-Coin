import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/router';

/* Scroll-to-top arrow — sticky bottom-right, sits above the WhatsApp
   button. Fades in once the page is scrolled down. */

export default function BackToTop() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Hide on the product detail page — the sticky Add-to-Bag bar takes
  // the bottom-right, no need for this on top of it.
  if (router.pathname === '/products/[slug]') return null;
  if (!mounted) return null;

  return createPortal(
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      className={`fixed bottom-[6.25rem] right-6 z-[1050] flex h-11 w-11 items-center justify-center rounded-full bg-ink text-paper shadow-card transition-all duration-200 hover:bg-ink-soft ${
        visible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-3 pointer-events-none'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="19" x2="12" y2="5" />
        <polyline points="5 12 12 5 19 12" />
      </svg>
    </button>,
    document.body
  );
}

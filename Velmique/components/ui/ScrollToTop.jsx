'use client';
import { useState, useEffect } from 'react';
import BrandIcon from './BrandIcon';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  if (!visible) return null;
  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="Back to top"
      data-scrolltop="true"
      className="fixed bottom-[96px] right-[32px] z-[1071] w-10 h-10 rounded-full bg-[var(--m-accent)] text-[color:var(--m-on-band)] flex items-center justify-center shadow-lg hover:bg-[var(--m-accent-deep)] transition-colors"
    >
      <BrandIcon name="up" size={18} />
    </button>
  );
}

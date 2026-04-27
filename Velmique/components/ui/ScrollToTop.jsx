'use client';
import { useState, useEffect } from 'react';
import { ArrowUp, X, Cookie } from 'lucide-react';

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
      className="fixed bottom-8 right-6 z-50 w-10 h-10 bg-[#C9A84C] text-black rounded-full flex items-center justify-center shadow-lg hover:bg-[#FFD700] transition-all hover:shadow-[0_0_20px_rgba(201,168,76,0.5)]"
    >
      <ArrowUp size={16} />
    </button>
  );
}

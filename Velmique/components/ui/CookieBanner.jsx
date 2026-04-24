'use client';
import { useState, useEffect } from 'react';

const KEY = 'vlm-cookies';

export default function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Only show if the user hasn't decided yet
    try {
      if (!localStorage.getItem(KEY)) setVisible(true);
    } catch {}
  }, []);

  const handle = (choice) => {
    try { localStorage.setItem(KEY, choice); } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1f1b16]/95 backdrop-blur border-t border-[#b8624f]/20 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[#f3ede0]/50 text-xs font-body leading-relaxed">
          We use cookies to enhance your experience and personalize content. By continuing, you agree to our{' '}
          <a href="/privacy-policy" className="text-[#d4927f] hover:underline">Privacy Policy</a>.
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={() => handle('declined')} className="btn-outline-gold px-5 py-2 text-xs tracking-wider uppercase font-body rounded-sm">
            Decline
          </button>
          <button onClick={() => handle('accepted')} className="btn-gold px-5 py-2 text-xs tracking-wider uppercase font-body rounded-sm">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

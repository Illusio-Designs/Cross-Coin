'use client';
import { useState } from 'react';
import { X } from 'lucide-react';

export default function CookieBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-[#1f1b16]/95 backdrop-blur border-t border-[#b8624f]/20 px-6 py-4">
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <p className="text-[#f3ede0]/50 text-xs font-body leading-relaxed">
          We use cookies to enhance your experience and personalize content. By continuing, you agree to our{' '}
          <a href="/privacy-policy" className="text-[#d4927f] hover:underline">Privacy Policy</a>.
        </p>
        <div className="flex gap-3 flex-shrink-0">
          <button onClick={() => setVisible(false)} className="btn-outline-gold px-5 py-2 text-xs tracking-wider uppercase font-body rounded-sm">
            Decline
          </button>
          <button onClick={() => setVisible(false)} className="btn-gold px-5 py-2 text-xs tracking-wider uppercase font-body rounded-sm">
            Accept
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

const messages = [
  '✦ Free shipping on all orders',
  '✦ Crafted in small batches',
  '✦ 10% off your first order with code VELMIQUE10',
];

export default function AnnouncementBar() {
  // Dismissible, but visible by default. Persist dismissal per browser so the
  // bar does not re-appear on every navigation after a shopper closes it.
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem('vq-announce-dismissed') === '1') setDismissed(true);
    } catch { /* ignore storage errors (private mode, etc.) */ }
  }, []);

  const close = () => {
    setDismissed(true);
    try { localStorage.setItem('vq-announce-dismissed', '1'); } catch { /* ignore */ }
  };

  if (dismissed) return null;

  return (
    <div className="relative bg-[var(--ink)] py-2.5 pl-4 pr-9 overflow-hidden">
      <div className="marquee-container">
        <div className="marquee-content">
          {[...messages, ...messages, ...messages].map((msg, i) => (
            <span key={i} className="inline-block mx-10 text-[10px] tracking-[0.3em] text-[var(--gold-light)] font-body uppercase">
              {msg}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Dismiss announcement"
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--gold-light)]/70 hover:text-[var(--gold-light)] transition-colors"
      >
        <X size={13} strokeWidth={1.5} />
      </button>
    </div>
  );
}

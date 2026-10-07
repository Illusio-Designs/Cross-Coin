'use client';
import { useState, useEffect } from 'react';
import {
  getConsent, setConsent, acceptAll, rejectAll, OPEN_SETTINGS_EVENT,
} from '@/lib/consent';

/* Cookie consent banner (DPDP). Appears until the visitor makes a choice, and
   can be reopened any time from the footer "Cookie settings" link. Essential
   cookies are always on; Analytics and Marketing are opt-in and stay off until
   accepted — the Analytics component and VisitTracker read this choice before
   loading any tag. */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    const c = getConsent();
    if (!c.set) setVisible(true);
    const open = () => {
      const cur = getConsent();
      setAnalytics(cur.analytics);
      setMarketing(cur.marketing);
      setCustomise(true);
      setVisible(true);
    };
    window.addEventListener(OPEN_SETTINGS_EVENT, open);
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open);
  }, []);

  const close = () => { setVisible(false); setCustomise(false); };
  const onAcceptAll = () => { acceptAll(); close(); };
  const onRejectAll = () => { rejectAll(); close(); };
  const onSave = () => { setConsent({ analytics, marketing }); close(); };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[70] bg-[var(--surface)]/97 backdrop-blur border-t border-[var(--border)] px-5 sm:px-6 py-4"
      style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))' }}
      role="dialog" aria-label="Cookie preferences">
      <div className="max-w-[1100px] mx-auto">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
          <p className="text-[var(--ink-soft)] text-xs font-body leading-relaxed flex-1">
            We use essential cookies to run the store. With your consent we also use analytics and
            marketing cookies to improve the site and show relevant offers. You can accept, reject,
            or choose. See our{' '}
            <a href="/privacy-policy" className="text-[var(--gold-deep)] hover:underline">Privacy Policy</a>.
          </p>

          <div className="flex flex-wrap gap-2.5 shrink-0">
            {!customise && (
              <button onClick={() => setCustomise(true)}
                className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-body border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white transition-colors">
                Customise
              </button>
            )}
            <button onClick={onRejectAll}
              className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-body border border-[var(--ink)] text-[var(--ink)] hover:bg-[var(--ink)] hover:text-white transition-colors">
              Reject non-essential
            </button>
            <button onClick={onAcceptAll}
              className="px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-body bg-[var(--ink)] text-white border border-[var(--ink)] hover:bg-[var(--gold-deep)] hover:border-[var(--gold-deep)] transition-colors">
              Accept all
            </button>
          </div>
        </div>

        {customise && (
          <div className="mt-4 pt-4 border-t border-[var(--border)] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
            <label className="flex items-center gap-2.5 text-xs font-body text-[var(--ink-muted)]">
              <input type="checkbox" checked disabled className="accent-[var(--gold-deep)]" />
              Essential <span className="text-[var(--ink-muted)]/70">(always on)</span>
            </label>
            <label className="flex items-center gap-2.5 text-xs font-body text-[var(--ink)] cursor-pointer">
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} className="accent-[var(--gold-deep)]" />
              Analytics
            </label>
            <label className="flex items-center gap-2.5 text-xs font-body text-[var(--ink)] cursor-pointer">
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="accent-[var(--gold-deep)]" />
              Marketing
            </label>
            <button onClick={onSave}
              className="sm:ml-auto px-5 py-2.5 text-[10px] tracking-[0.2em] uppercase font-body bg-[var(--ink)] text-white hover:bg-[var(--gold-deep)] transition-colors">
              Save choices
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

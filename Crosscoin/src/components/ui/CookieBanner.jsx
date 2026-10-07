'use client';
import { useState, useEffect } from 'react';
import {
  getConsent, setConsent, acceptAll, rejectAll, OPEN_SETTINGS_EVENT,
} from '@/lib/consent';

/* Cookie consent banner (DPDP). Self-contained styling (no brand tokens) so it
   drops into any storefront. Essential cookies are always on; Analytics and
   Marketing are opt-in and stay off until accepted — the Analytics component
   and VisitTracker read this choice before loading any tag. Reopen any time
   from the footer "Cookie settings" link. */
const BAR = { background: '#16140f', borderTop: '1px solid rgba(255,255,255,.14)' };
const GOLD = '#D9C190';

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
  const reopen = () => {
    const cur = getConsent();
    setAnalytics(cur.analytics);
    setMarketing(cur.marketing);
    setCustomise(true);
    setVisible(true);
  };

  // Once a choice is made, keep a discreet reopen control so consent can be
  // reviewed or withdrawn at any time (DPDP: as easy to withdraw as to give).
  if (!visible) {
    return (
      <button type="button" onClick={reopen} aria-label="Cookie settings"
        style={{ position: 'fixed', left: 12, bottom: 12, zIndex: 60, background: '#16140f',
          color: 'rgba(255,255,255,.7)', border: '1px solid rgba(255,255,255,.22)',
          padding: '7px 11px', fontSize: 9, letterSpacing: '0.16em', textTransform: 'uppercase',
          fontWeight: 600, cursor: 'pointer', opacity: 0.85 }}>
        Cookie settings
      </button>
    );
  }

  const btnBase = {
    padding: '10px 20px', fontSize: 10, letterSpacing: '0.2em', textTransform: 'uppercase',
    fontWeight: 600, cursor: 'pointer', transition: 'all .2s', lineHeight: 1.2,
  };
  const outline = { ...btnBase, background: 'transparent', color: '#fff', border: '1px solid rgba(255,255,255,.55)' };
  const filled = { ...btnBase, background: '#fff', color: '#16140f', border: '1px solid #fff' };

  return (
    <div role="dialog" aria-label="Cookie preferences"
      style={{ position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 70, ...BAR,
        padding: '16px 20px', paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        backdropFilter: 'blur(6px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 16 }}>
          <p style={{ flex: '1 1 320px', minWidth: 0, color: 'rgba(255,255,255,.75)', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
            We use essential cookies to run the store. With your consent we also use analytics and
            marketing cookies to improve the site and show relevant offers. You can accept, reject,
            or choose. See our <a href="/privacy-policy" style={{ color: GOLD, textDecoration: 'underline' }}>Privacy Policy</a>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {!customise && (
              <button type="button" style={outline} onClick={() => setCustomise(true)}>Customise</button>
            )}
            <button type="button" style={outline} onClick={onRejectAll}>Reject non-essential</button>
            <button type="button" style={filled} onClick={onAcceptAll}>Accept all</button>
          </div>
        </div>

        {customise && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,.14)',
            display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 18, color: 'rgba(255,255,255,.85)', fontSize: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: .7 }}>
              <input type="checkbox" checked disabled style={{ accentColor: GOLD }} /> Essential (always on)
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} style={{ accentColor: GOLD }} /> Analytics
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} style={{ accentColor: GOLD }} /> Marketing
            </label>
            <button type="button" style={{ ...filled, marginLeft: 'auto' }} onClick={onSave}>Save choices</button>
          </div>
        )}
      </div>
    </div>
  );
}

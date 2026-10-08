'use client';
import { useState, useEffect } from 'react';
import {
  getConsent, setConsent, acceptAll, rejectAll, OPEN_SETTINGS_EVENT,
} from '@/lib/consent';

/* Cookie consent banner (DPDP). Styled in src/styles/components/CookieBanner.css
   to match the CrossCoin storefront. Essential cookies are always on; Analytics
   and Marketing are opt-in and stay off until accepted — the Analytics component
   and VisitTracker read this choice before loading any tag. Reopen any time from
   the footer "Cookie Settings" link (withdrawal is as easy as giving consent). */
export default function CookieBanner() {
  const [visible, setVisible] = useState(false);
  const [customise, setCustomise] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    if (!getConsent().set) setVisible(true);
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

  const Toggle = ({ label, hint, checked, onChange, disabled }) => (
    <div className="cc-cookie__cat">
      <div>
        <strong>{label}</strong>
        <small>{hint}</small>
      </div>
      <label className="cc-cookie__switch">
        <input type="checkbox" checked={checked} disabled={disabled}
          aria-label={label} onChange={(e) => onChange?.(e.target.checked)} />
        <span />
      </label>
    </div>
  );

  return (
    <div role="dialog" aria-label="Cookie preferences" className="cc-cookie">
      <h2 className="cc-cookie__title">Your cookie choices</h2>
      <p className="cc-cookie__text">
        We use essential cookies to run the store. With your consent we also use analytics and
        marketing cookies to improve CrossCoin and show relevant offers. Read our{' '}
        <a href="/policy/privacy-policy">Privacy Policy</a>.
      </p>

      {customise && (
        <div className="cc-cookie__cats">
          <Toggle label="Essential" hint="Cart, login and security. Always on." checked disabled />
          <Toggle label="Analytics" hint="Helps us understand how the store is used."
            checked={analytics} onChange={setAnalytics} />
          <Toggle label="Marketing" hint="Ads and retargeting (e.g. Meta Pixel)."
            checked={marketing} onChange={setMarketing} />
        </div>
      )}

      <div className="cc-cookie__actions">
        {customise ? (
          <>
            <button type="button" className="cc-cookie__btn" onClick={onRejectAll}>Reject non-essential</button>
            <button type="button" className="cc-cookie__btn cc-cookie__btn--primary" onClick={onSave}>Save choices</button>
          </>
        ) : (
          <>
            <button type="button" className="cc-cookie__btn" onClick={onRejectAll}>Reject non-essential</button>
            <button type="button" className="cc-cookie__btn cc-cookie__btn--primary" onClick={onAcceptAll}>Accept all</button>
            <button type="button" className="cc-cookie__link" onClick={() => setCustomise(true)}>Customise</button>
          </>
        )}
      </div>
    </div>
  );
}

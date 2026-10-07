'use client';
import { openCookieSettings } from '@/lib/consent';

/* Footer link that reopens the cookie preferences so a visitor can review or
   withdraw analytics/marketing consent at any time (DPDP: withdrawal must be
   as easy as giving consent). */
export default function CookieSettingsButton({ className = '' }) {
  return (
    <button type="button" onClick={openCookieSettings} className={className}>
      Cookie Settings
    </button>
  );
}

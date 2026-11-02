'use client';

/* No cookie preferences on Knitwink: every visitor is tracked (lib/consent), so
   there is nothing to reopen. Kept (rendering nothing) so the footers that
   place it keep working. */
export default function CookieSettingsButton() {
  return null;
}

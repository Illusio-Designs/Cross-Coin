/* Phone OTP via the MSG91 widget (loaded idle-deferred in the root layout; it
   exposes window.sendOtp / window.verifyOtp). On localhost there is no widget:
   OTP "1111" maps to the backend's dev bypass token.

   sendOtp(digits)  → Promise<void>   resolves once the code is on its way
   verifyOtp(code)  → Promise<string> resolves with the access token for
                                      POST /api/users/login */
const isLocalHost = () => typeof window !== 'undefined'
  && ['localhost', '127.0.0.1'].includes(window.location.hostname);

export function sendOtp(digits) {
  if (isLocalHost()) return Promise.resolve();
  const identifier = `91${digits}`;
  return new Promise((resolve, reject) => {
    let attempts = 0;
    let settled = false;
    const ok = () => { if (!settled) { settled = true; resolve(); } };
    const fail = (m) => { if (!settled) { settled = true; reject(new Error(m)); } };
    const trySend = () => {
      if (typeof window.sendOtp === 'function') {
        window.sendOtp(identifier, ok, () => fail('Failed to send OTP. Please try again.'));
        // MSG91's success callback occasionally never fires even though the
        // SMS went out; carry on after a moment — verify fails cleanly if not.
        setTimeout(ok, 1500);
      } else if (attempts < 15) {
        attempts += 1;
        setTimeout(trySend, 400);
      } else {
        fail('OTP service not ready. Please refresh the page.');
      }
    };
    trySend();
  });
}

export function verifyOtp(code) {
  if (isLocalHost()) {
    return code === '1111'
      ? Promise.resolve('dev-localhost-bypass')
      : Promise.reject(new Error('Dev mode: use OTP 1111'));
  }
  return new Promise((resolve, reject) => {
    if (typeof window.verifyOtp !== 'function') { reject(new Error('OTP service not ready. Please refresh the page.')); return; }
    window.verifyOtp(
      code,
      (data) => resolve(typeof data === 'string' ? data : (data?.message || data?.token || JSON.stringify(data))),
      () => reject(new Error('Invalid OTP. Please try again.')),
    );
  });
}

/** Internal path to return to after sign-in (?next=/account/returns), never an external URL. */
export function safeNext(raw, fallback = '/account') {
  const v = String(raw || '');
  return v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : fallback;
}

'use client';

import { useEffect } from 'react';

/**
 * MSG91 OTP widget loader — the SAME shared widget the other brands use.
 * Loads the provider after page load (see below) and exposes window.sendOtp / window.verifyOtp
 * (exposeMethods:true) for the login + register OTP steps.
 */
const CONFIG = {
  widgetId: '366342706343383735393039',
  tokenAuth: '426738T7QwVqDd1uX69c7fc1dP1',
  exposeMethods: true,
  identifier: '',
  success: (data) => { window.__msg91OtpSuccess = data; },
  failure: (error) => { window.__msg91OtpFailure = error; },
};

let started = false;

function loadMsg91() {
  if (started || typeof window === 'undefined' || window.sendOtp) return;
  started = true;
  const urls = ['https://verify.msg91.com/otp-provider.js', 'https://verify.phone91.com/otp-provider.js'];
  const tryLoad = (i) => {
    if (i >= urls.length) { started = false; return; }
    const s = document.createElement('script');
    s.src = urls[i];
    s.async = true;
    s.onload = () => {
      if (typeof window.initSendOTP === 'function') window.initSendOTP(CONFIG);
    };
    s.onerror = () => { tryLoad(i + 1); };
    document.head.appendChild(s);
  };
  tryLoad(0);
}

// Everywhere else the widget waits until the page has fully loaded and the
// browser is idle (plus a few seconds), so it never competes with the page's
// own pictures and code; the login/register pages pass `eager` because the
// shopper is about to ask for an OTP there.
export default function Msg91Loader({ eager = false }) {
  useEffect(() => {
    if (eager) { loadMsg91(); return undefined; }
    let timer;
    let idle;
    const ric = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 1));
    const start = () => { timer = window.setTimeout(() => { idle = ric(loadMsg91); }, 4000); };
    if (document.readyState === 'complete') start();
    else window.addEventListener('load', start, { once: true });
    return () => {
      window.removeEventListener('load', start);
      window.clearTimeout(timer);
      if (window.cancelIdleCallback && typeof idle === 'number') window.cancelIdleCallback(idle);
    };
  }, [eager]);
  return null;
}

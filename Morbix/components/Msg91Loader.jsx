'use client';

import { useEffect } from 'react';

/**
 * MSG91 OTP widget loader — the SAME shared widget the other brands use.
 * Loads the provider on idle and exposes window.sendOtp / window.verifyOtp
 * (exposeMethods:true) for the login + register OTP steps.
 */
const CONFIG = {
  widgetId: '366342706343383735393039',
  tokenAuth: '426738T7QwVqDd1uX69c7fc1dP1',
  exposeMethods: true,
  identifier: '',
  captchaType: 'invisible',
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

export default function Msg91Loader() {
  useEffect(() => {
    const ric = window.requestIdleCallback || ((cb) => window.setTimeout(cb, 2000));
    const id = ric(loadMsg91);
    return () => { if (window.cancelIdleCallback && typeof id === 'number') window.cancelIdleCallback(id); };
  }, []);
  return null;
}

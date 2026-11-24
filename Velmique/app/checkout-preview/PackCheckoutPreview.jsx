'use client';

import { useEffect, useRef, useState } from 'react';
import { loadShiprocketSdk } from '@/lib/api/shiprocketCheckout';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });

export default function PackCheckoutPreview() {
  const token = useRef('');
  const [total, setTotal] = useState(null);
  const [opening, setOpening] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const totalPaise = Number(hash.get('total'));
    if (hash.has('token') && Number.isSafeInteger(totalPaise) && totalPaise > 0) {
      token.current = hash.get('token');
      setTotal(totalPaise);
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
  }, []);

  useEffect(() => {
    const lockCheckout = () => {
      const iframe = document.getElementById('headless-iframe');
      if (!iframe) return;
      iframe.inert = true;
      iframe.tabIndex = -1;
      iframe.blur();
    };
    const observer = new MutationObserver(lockCheckout);
    observer.observe(document.body, { childList: true, subtree: true });
    lockCheckout();
    return () => observer.disconnect();
  }, []);

  async function openPreview(event) {
    event.preventDefault();
    setOpening(true);
    setError('');
    try {
      const sdk = await loadShiprocketSdk();
      await sdk.addToCart(event, token.current, { fallbackUrl: window.location.pathname });
      setPreviewOpen(true);
    } catch {
      setError('Shiprocket could not open the preview. Generate a fresh preview in Brand Settings and try again.');
    } finally {
      setOpening(false);
    }
  }

  return (
    <section className="m-wrap m-ph">
      <style>{'#headless-iframe { pointer-events: none !important; }'}</style>
      <h1>Shiprocket Pack Preview</h1>
      {total ? (
        <>
          <p>Muse + Halva. Expected product subtotal {rupees.format(total / 100)} before shipping and other offers.</p>
          <p>This preview is read-only. Compare the product subtotal in Shiprocket.</p>
          <button className="m-btn m-btn--fill" type="button" disabled={opening || previewOpen} onClick={openPreview}>
            {opening ? 'Opening…' : 'Open Shiprocket Preview'}
          </button>
        </>
      ) : <p>Start a new preview from Velmique’s Payments settings in CrossCoin Admin.</p>}
      {error && <p role="alert">{error}</p>}
      {previewOpen && (
        <a className="m-btn m-btn--fill" href="/checkout-preview" style={{ position: 'fixed', bottom: 16, left: 16, zIndex: 2147483647 }}>Close preview</a>
      )}
    </section>
  );
}

'use client';

import { useEffect } from 'react';
import { preloadShiprocket } from '@/lib/api/shiprocketCheckout';

// Shiprocket's markup and images use local storefront styles.
// The provider stylesheet loads with the checkout SDK.
/* eslint-disable @next/next/no-img-element -- Shiprocket's button images, as Shiprocket serves them */
export default function ShiprocketButton({ label = 'BUY NOW', onClick, busy = false, disabled = false }) {
  useEffect(() => { preloadShiprocket(); }, []);
  return (
    <button type="button" className="sr-headless-checkout" name="sr-headless-button" onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined}>
      <div className="sr-d-flex flex-center">
        <div className="sr-d-flex full-width flex-center">
          <span className="sr-checkout-visible2">{busy ? 'OPENING…' : label}</span>
          {' '}
          <img src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/upi_options.svg" alt="" className="sr-pl-15 sr-checkout-visible" />
          <div className="loader5" />
          <img src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/right_arrow.svg" className="sr-pl-15 sr-checkout-visible1" alt="" />
        </div>
        <div>
          <span className="sr-powered-by"><img src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/powered_by.svg" alt="" /></span>
        </div>
      </div>
    </button>
  );
}

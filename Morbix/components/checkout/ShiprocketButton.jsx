'use client';

import { useEffect } from 'react';
import { preloadShiprocket } from '@/lib/api/shiprocketCheckout';

// Shiprocket's own checkout button: their markup and images, styled by their
// stylesheet, the way their Shopify app renders it (our globals.css gives it
// the store's look, so it needs nothing from them to show). Shiprocket's
// script + stylesheet start downloading on the shopper's first touch or
// scroll. The click runs our handler, which opens Shiprocket Checkout.
/* eslint-disable @next/next/no-img-element -- Shiprocket's button images, as Shiprocket serves them */
export default function ShiprocketButton({ label = 'BUY NOW', onClick, busy = false, disabled = false }) {
  useEffect(() => { preloadShiprocket(); }, []);
  return (
    <button type="button" className="sr-headless-checkout" name="sr-headless-button" onClick={onClick} disabled={disabled || busy} aria-busy={busy || undefined}>
      <div className="sr-d-flex flex-center">
        <div className="sr-d-flex full-width flex-center">
          <span className="sr-checkout-visible2">{busy ? 'OPENING…' : label}</span>
          {' '}
          <img src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/upi_options.svg" alt="Google Pay | Phone Pay | UPI" className="sr-pl-15 sr-checkout-visible" />
          <div className="loader5" />
          <img src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/right_arrow.svg" className="sr-pl-15 sr-checkout-visible1" alt="right_arrow" />
        </div>
        <div>
          <span className="sr-powered-by"><img src="https://fastrr-boost-ui.pickrr.com/assets/images/boost_button/powered_by.svg" alt="" /></span>
        </div>
      </div>
    </button>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useStore } from '@/lib/store';
import { shiprocketEnabled, shiprocketTakes, openShiprocketCheckout } from '@/lib/api/shiprocketCheckout';
import ShiprocketButton from '@/components/checkout/ShiprocketButton';
import { fbTrack } from '@/utils/pixel';
import { ik } from '@/lib/imagekit';
import SkImg from './SkImg';
import { BagSkeleton, Sk } from './Skeleton';

const inr = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');

/* The bag as a page (/cart) and the checkout landing (/checkout). The full
   checkout — address, coupons, shipping/COD fees, prepaid discount, Razorpay,
   WhatsApp abandoned-cart capture — lives in the CartDrawer (root layout);
   this view lists the bag and opens that drawer on its checkout step.
   `autoCheckout` (the /checkout route) opens it straight away.
   With Shiprocket Checkout set up (and a bag it can take), the checkout button
   is Shiprocket's BUY NOW instead, opening their checkout for the bag. */
export default function BagView({ autoCheckout = false }) {
  const { cart, cartHydrated, cartTotal, cartCount, updateQuantity, removeFromCart, openCheckout } = useStore();
  const opened = useRef(false);

  // /checkout: open the drawer on delivery & payment once the saved bag has
  // been restored (it hydrates from localStorage after mount).
  useEffect(() => {
    if (!autoCheckout || opened.current || !cart.length) return;
    opened.current = true;
    openCheckout();
  }, [autoCheckout, cart.length, openCheckout]);

  const packLines = cart.filter((i) => i.packGroup).reduce((a, i) => a + (Number(i.quantity) || 1), 0);

  const [srOn, setSrOn] = useState(false);
  const [srBusy, setSrBusy] = useState(false);
  useEffect(() => { let live = true; shiprocketEnabled().then((on) => { if (live) setSrOn(on); }); return () => { live = false; }; }, []);
  const useShiprocket = srOn && shiprocketTakes(cart);

  // Fires InitiateCheckout, then opens Shiprocket for the whole bag; if it
  // can't start, the drawer's own checkout opens instead.
  const onShiprocket = async (e) => {
    if (srBusy || !cart.length) return;
    fbTrack('InitiateCheckout', {
      content_ids: cart.map((i) => String(i.productId ?? i.id)),
      content_type: 'product',
      contents: cart.map((i) => ({ id: String(i.productId ?? i.id), quantity: i.quantity || 1 })),
      num_items: cart.reduce((s, i) => s + (i.quantity || 1), 0),
      value: cart.reduce((s, i) => s + Number(i.price || 0) * (i.quantity || 1), 0),
      currency: 'INR',
    });
    setSrBusy(true);
    try {
      await openShiprocketCheckout(e, cart, 'cart');
    } catch {
      openCheckout();
    } finally {
      setSrBusy(false);
    }
  };

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">{autoCheckout ? 'Checkout' : 'Your selection'}</span>
        <h1>{autoCheckout ? 'Almost Yours.' : 'The Bag.'}</h1>
        {cart.length ? <p>{cartCount} item{cartCount === 1 ? '' : 's'} · {inr(cartTotal)}</p>
          : !cartHydrated ? <Sk w={120} h={14} style={{ marginTop: 18 }} /> : null}
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        {/* The saved bag is restored from this browser after mount — show its
            shape until then instead of flashing "Your bag is empty". */}
        {!cartHydrated && cart.length === 0 ? (
          <BagSkeleton />
        ) : cart.length === 0 ? (
          <div className="m-empty">
            <h3>Your bag is empty</h3>
            <p style={{ marginBottom: 20 }}>Discover a scent worth remembering.</p>
            <Link className="m-btn m-btn--fill" href="/shop" style={{ justifyContent: 'center' }}>Explore the collection</Link>
          </div>
        ) : (
          <div className="m-cartgrid">
            <ul className="m-crows" aria-label="Items in your bag">
              {cart.map((it) => {
                const href = it.slug ? `/product/${it.slug}` : null;
                const img = it.image ? <SkImg frameClassName="m-crow__img" src={ik(it.image, 200)} alt="" loading="lazy" /> : <span className="m-crow__img" />;
                return (
                  <li className="m-crow" key={`${it.id}-${it.size}`}>
                    <div style={{ gridArea: 'img' }}>{href ? <Link href={href} tabIndex={-1} aria-hidden="true">{img}</Link> : img}</div>
                    <div style={{ gridArea: 'body' }}>
                      <div className="m-crow__n">{href ? <Link href={href}>{it.name}</Link> : it.name}</div>
                      {it.size ? <div className="m-crow__m">{it.size}{it.packGroup ? ' · Build-your-pack' : ''}</div> : null}
                      <div className="m-line__q" style={{ marginTop: 10 }}>
                        <button type="button" aria-label={`Decrease ${it.name} quantity`} onClick={() => updateQuantity(it.id, it.quantity - 1, it.size)}>−</button>
                        <span aria-live="polite">{it.quantity}</span>
                        <button type="button" aria-label={`Increase ${it.name} quantity`} onClick={() => updateQuantity(it.id, it.quantity + 1, it.size)}>+</button>
                      </div>
                      <button type="button" className="m-line__rm" onClick={() => removeFromCart(it.id, it.size)}>Remove</button>
                    </div>
                    <div className="m-crow__n" style={{ gridArea: 'price', textAlign: 'right' }}>{inr(it.price * it.quantity)}</div>
                  </li>
                );
              })}
            </ul>

            <aside className="m-summary" aria-label="Order summary">
              <h3>Order Summary</h3>
              <div className="m-sumrow"><span>Subtotal</span><span>{inr(cartTotal)}</span></div>
              {packLines > 1 ? <div className="m-sumrow"><span>Build-your-pack saving</span><span>At checkout</span></div> : null}
              <div className="m-sumrow"><span>Shipping</span><span>At checkout</span></div>
              <div className="m-sumrow tot"><span>Subtotal</span><b>{inr(cartTotal)}</b></div>
              <p className="m-muted" style={{ fontSize: 12.5, marginTop: 6 }}>Offers &amp; coupons, shipping, and Cash on Delivery or prepaid options are applied in the next step.</p>
              {useShiprocket ? (
                <div style={{ marginTop: 16 }}>
                  <ShiprocketButton label="BUY NOW" onClick={onShiprocket} busy={srBusy} />
                </div>
              ) : (
                <button type="button" className="m-btn m-btn--fill" onClick={openCheckout} style={{ justifyContent: 'center', width: '100%', marginTop: 16 }}>
                  {autoCheckout ? 'Continue to delivery & payment' : 'Proceed to checkout'}
                </button>
              )}
              <Link className="m-btn m-btn--ghost" href="/shop" style={{ justifyContent: 'center', width: '100%', marginTop: 10 }}>Continue shopping</Link>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}

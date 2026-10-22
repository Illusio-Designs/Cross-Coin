'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/components/cart/CartItem';
import { FreeShippingBar } from '@/components/cart/FreeShippingBar';
import { CartUpsell } from '@/components/cart/CartUpsell';
import { formatPrice } from '@/lib/utils';
import { SHIPPING_THRESHOLD } from '@/lib/constants';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Skeleton, SkeletonRegion } from '@/components/ui/Skeleton';
import { fbTrack } from '@/utils/pixel';
import { shiprocketEnabled, openShiprocketCheckout } from '@/lib/api/shiprocketCheckout';
import ShiprocketButton from '@/components/checkout/ShiprocketButton';

// Cart lines + summary while the saved cart is read from this browser (the
// server can't see it), so the page never flashes "Your cart is empty".
const noopSubscribe = () => () => {};

function CartPageSkeleton() {
  return (
    <section className="bg-white px-6 pt-28 pb-12 md:px-10 lg:px-16">
      <div className="mx-auto max-w-site">
        <h1 className="mb-8 font-display text-3xl font-normal text-brand-black">Your Cart</h1>
        <SkeletonRegion label="Loading your cart…" className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
          <div aria-hidden="true">
            <Skeleton className="h-12 w-full rounded-xl" />
            <ul className="mt-4">
              {[0, 1].map((i) => (
                <li key={i} className="flex gap-4 border-b border-gray-200 py-4 last:border-0">
                  <Skeleton className="h-20 w-16 shrink-0 rounded-lg" />
                  <div className="flex flex-1 flex-col gap-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-1/3" />
                    <div className="mt-auto flex items-center justify-between"><Skeleton className="h-8 w-24 rounded-full" /><Skeleton className="h-4 w-14" /></div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-gray-200 p-6" aria-hidden="true">
            <Skeleton className="mb-4 h-4 w-32" />
            <div className="flex flex-col gap-3 border-b border-gray-200 pb-4">
              <div className="flex justify-between"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-14" /></div>
              <div className="flex justify-between"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-10" /></div>
            </div>
            <div className="mt-4 flex justify-between"><Skeleton className="h-4 w-12" /><Skeleton className="h-4 w-16" /></div>
            <Skeleton className="mt-6 h-12 w-full rounded-full" />
          </div>
        </SkeletonRegion>
      </div>
    </section>
  );
}






export function CartPageClient({ upsellProducts }) {
  const { items, subtotal, openDrawer } = useCart();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : 499;
  const total = subtotal + shipping;
  // false on the server / first hydration pass, true once in the browser.
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);

  // Shiprocket Checkout (when switched on for Knitwink): Checkout opens it
  // with every cart line (each needs a variation id). Otherwise — or if it
  // can't start — Checkout opens the cart drawer, our own checkout.
  const [srOn, setSrOn] = useState(false);
  const [srBusy, setSrBusy] = useState(false);
  useEffect(() => { let live = true; shiprocketEnabled().then((on) => { if (live) setSrOn(on); }); return () => { live = false; }; }, []);
  const useShiprocket = srOn && items.length > 0 && items.every((i) => i.variationId != null && i.variationId !== '');

  const onShiprocketCheckout = async (e) => {
    if (srBusy) return;
    fbTrack('InitiateCheckout', {
      content_ids: items.map((i) => String(i.productId)),
      content_type: 'product',
      contents: items.map((i) => ({ id: String(i.productId), quantity: i.quantity || 1 })),
      num_items: items.reduce((s, i) => s + (i.quantity || 1), 0),
      value: subtotal,
      currency: 'INR',
    });
    setSrBusy(true);
    try {
      await openShiprocketCheckout(e, items.map((i) => ({ variationId: i.variationId, quantity: i.quantity || 1 })), 'cart');
    } catch {
      openDrawer();
    } finally {
      setSrBusy(false);
    }
  };

  if (!mounted) return <CartPageSkeleton />;

  if (items.length === 0) {
    return (
      <section className="bg-white">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
          <ShoppingBag size={48} className="text-gray-200" />
          <h1 className="font-display text-3xl font-normal text-brand-black">
            Your cart is empty
          </h1>
          <p className="text-base text-gray-600">Looks like you haven&apos;t added anything yet.</p>
          <Link
            href="/collections/all"
            className="inline-flex items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage">
            
            Shop Now
          </Link>
        </div>
      </section>);

  }

  return (
    <section className="bg-white px-6 pt-28 pb-12 md:px-10 lg:px-16">
      <div className="mx-auto max-w-site">
        <h1 className="mb-8 font-display text-3xl font-normal text-brand-black">Your Cart</h1>

        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
          {/* Left — items + upsell */}
          <div>
            <FreeShippingBar subtotal={subtotal} />
            <ul className="mt-4">
              {items.map((item) =>
              <CartItem key={item.id} item={item} />
              )}
            </ul>
            <CartUpsell products={upsellProducts} />
          </div>

          {/* Right — order summary */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-gray-200 p-6">
              <h2 className="mb-4 text-sm font-medium uppercase tracking-widest text-gray-600">
                Order Summary
              </h2>

              <div className="flex flex-col gap-3 border-b border-gray-200 pb-4">
                <div className="flex justify-between text-sm text-gray-800">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-800">
                  <span>Shipping</span>
                  <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
                </div>
              </div>

              <div className="mt-4 flex justify-between text-sm font-medium text-brand-black">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              {useShiprocket ? (
                <div className="mt-6">
                  <ShiprocketButton label="BUY NOW" onClick={onShiprocketCheckout} busy={srBusy} />
                </div>
              ) : (
              <button
                onClick={openDrawer}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage">
                Checkout
              </button>
              )}

              <Link
                href="/collections/all"
                className="mt-3 block text-center text-sm text-gray-600 underline underline-offset-4 hover:text-brand-black transition-colors duration-150">
                
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>);

}
'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CartItem } from '@/components/cart/CartItem';
import { FreeShippingBar } from '@/components/cart/FreeShippingBar';
import { CartUpsell } from '@/components/cart/CartUpsell';
import { formatPrice } from '@/lib/utils';
import { ROUTES, SHIPPING_THRESHOLD } from '@/lib/constants';






export function CartPageClient({ upsellProducts }) {
  const { items, subtotal } = useCart();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : 499;
  const total = subtotal + shipping;

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
    <section className="bg-white px-6 py-12 md:px-10 lg:px-16">
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

              <Link
                href={ROUTES.checkout}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage">
                
                Checkout
              </Link>

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
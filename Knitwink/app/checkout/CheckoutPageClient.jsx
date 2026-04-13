'use client';

import Link from 'next/link';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { CheckoutForm } from '@/components/checkout/CheckoutForm';
import { OrderSummary } from '@/components/checkout/OrderSummary';

export function CheckoutPageClient() {
  const { items, subtotal } = useCart();

  if (items.length === 0) {
    return (
      <section className="bg-white">
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-6 text-center">
          <ShoppingBag size={48} className="text-gray-200" />
          <h1 className="font-display text-3xl font-normal text-brand-black">Your cart is empty</h1>
          <p className="text-base text-gray-600">Add some items before checking out.</p>
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
        <h1 className="mb-10 font-display text-3xl font-normal text-brand-black">Checkout</h1>
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-[1fr_380px]">
          <CheckoutForm />
          <OrderSummary items={items} subtotal={subtotal} />
        </div>
      </div>
    </section>);

}
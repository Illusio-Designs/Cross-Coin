'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Minus, Plus, X } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { SHIPPING_THRESHOLD, ROUTES } from '@/lib/constants';
import { Reveal } from '@/components/ui/Reveal';

function FreeShippingNotice({ subtotal }) {
  const progress = Math.min((subtotal / SHIPPING_THRESHOLD) * 100, 100);
  const remaining = SHIPPING_THRESHOLD - subtotal;
  const achieved = subtotal >= SHIPPING_THRESHOLD;

  return (
    <div className="py-5">
      <p className="text-center text-[11px] font-medium uppercase tracking-[0.28em] text-brand-black/65">
        {achieved
          ? 'Complimentary shipping unlocked.'
          : `${formatPrice(remaining)} away from complimentary shipping.`}
      </p>
      <div className="mt-3 h-px w-full overflow-hidden bg-gold/15">
        <div
          className="h-full bg-gold transition-all duration-500"
          style={{ width: `${progress}%` }}
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}

function CartRow({ item, onRemove, onUpdateQty }) {
  return (
    <li className="flex gap-5 border-b border-gold/20 py-6 last:border-0">
      <Link
        href={ROUTES.product(item.handle)}
        className="relative h-24 w-20 shrink-0 overflow-hidden bg-ivory"
      >
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
      </Link>

      <div className="flex flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <Link href={ROUTES.product(item.handle)} className="font-display text-base leading-snug text-brand-black hover:text-gold">
              {item.name}
            </Link>
            <p className="mt-1 text-[11px] uppercase tracking-[0.22em] text-brand-black/55">
              {item.color}{item.size ? ` · ${item.size}` : ''}
            </p>
          </div>
          <button
            onClick={() => onRemove(item.id)}
            className="p-1 text-brand-black/40 transition-colors hover:text-gold"
            aria-label={`Remove ${item.name}`}
          >
            <X size={15} strokeWidth={1.6} />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-3 border border-gold/30 px-3 py-1.5">
            <button
              onClick={() => onUpdateQty(item.id, item.quantity - 1)}
              className="flex h-5 w-5 items-center justify-center text-gold transition-colors hover:text-gold-deep"
              aria-label="Decrease quantity"
            >
              <Minus size={11} strokeWidth={1.8} />
            </button>
            <span className="min-w-[1.25rem] text-center font-display text-sm text-brand-black">
              {item.quantity}
            </span>
            <button
              onClick={() => onUpdateQty(item.id, item.quantity + 1)}
              className="flex h-5 w-5 items-center justify-center text-gold transition-colors hover:text-gold-deep"
              aria-label="Increase quantity"
            >
              <Plus size={11} strokeWidth={1.8} />
            </button>
          </div>
          <span className="font-display text-base text-brand-black">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </li>
  );
}

export function CartPageClient({ upsellProducts }) {
  const { items, subtotal, openDrawer, removeItem, updateQty } = useCart();
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : 499;
  const total = subtotal + shipping;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-cream">
        <section className="px-4 pt-36 pb-10 text-center sm:px-6 md:px-10">
          <Reveal>
            <span className="vq-diamond mx-auto block" aria-hidden />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Your Bag</p>
          </Reveal>
          <Reveal delay={0.16}>
            <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
              Your Bag is Empty
            </h1>
          </Reveal>
          <Reveal delay={0.24}>
            <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
              No pieces have caught your eye yet. The atelier is waiting.
            </p>
          </Reveal>
          <Reveal delay={0.32}>
            <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
          </Reveal>
          <Reveal delay={0.4}>
            <Link
              href="/collections/all"
              className="vq-lift mt-10 inline-flex items-center justify-center rounded-full bg-brand-black px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:bg-brand-black/90"
            >
              Discover the Collection
            </Link>
          </Reveal>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream">
      {/* Refined page header */}
      <section className="px-4 pt-36 pb-10 text-center sm:px-6 md:px-10">
        <Reveal>
          <span className="vq-diamond mx-auto block" aria-hidden />
        </Reveal>
        <Reveal delay={0.08}>
          <p className="mt-5 text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Ready to Acquire</p>
        </Reveal>
        <Reveal delay={0.16}>
          <h1 className="mt-3 font-display text-4xl font-normal leading-tight text-brand-black md:text-5xl">
            Your Bag
          </h1>
        </Reveal>
        <Reveal delay={0.24}>
          <p className="mx-auto mt-4 max-w-lg text-sm leading-relaxed text-brand-black/55">
            {items.length} piece{items.length === 1 ? '' : 's'} reserved in your bag.
          </p>
        </Reveal>
        <Reveal delay={0.32}>
          <div className="mx-auto mt-6 h-px w-12 bg-gold vq-rule" />
        </Reveal>
      </section>

      {/* Content */}
      <section className="px-4 pb-24 sm:px-6 md:px-10 lg:px-16">
        <div className="mx-auto max-w-site grid grid-cols-1 gap-14 lg:grid-cols-[1fr_360px]">
          {/* Items */}
          <Reveal delay={0.1}>
            <div>
              <FreeShippingNotice subtotal={subtotal} />
              <ul className="mt-2">
                {items.map((item) => (
                  <CartRow
                    key={item.id}
                    item={item}
                    onRemove={removeItem}
                    onUpdateQty={updateQty}
                  />
                ))}
              </ul>
            </div>
          </Reveal>

          {/* Summary */}
          <Reveal delay={0.18}>
            <aside className="lg:sticky lg:top-28 lg:self-start">
              <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-gold">Order Summary</p>
              <div className="mt-4 h-px w-12 bg-gold/60 vq-rule" />

              <div className="mt-6 flex flex-col gap-4 text-sm">
                <div className="flex justify-between text-brand-black/80">
                  <span>Subtotal</span>
                  <span className="font-display">{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-brand-black/80">
                  <span>Shipping</span>
                  <span className="font-display">{shipping === 0 ? 'Complimentary' : formatPrice(shipping)}</span>
                </div>
              </div>

              <div className="mt-6 flex items-baseline justify-between border-t border-gold/20 pt-6">
                <span className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-black">Total</span>
                <span className="font-display text-2xl text-brand-black">{formatPrice(total)}</span>
              </div>

              <button
                onClick={openDrawer}
                className="vq-lift mt-8 inline-flex w-full items-center justify-center rounded-full bg-brand-black px-8 py-3.5 text-[11px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:bg-brand-black/90"
              >
                Proceed to Checkout
              </button>

              <Link
                href="/collections/all"
                className="mt-4 block text-center text-[10px] uppercase tracking-[0.3em] text-brand-black/55 underline-offset-4 hover:text-gold"
              >
                Continue Browsing
              </Link>

              <p className="mt-8 text-center text-[10px] uppercase tracking-[0.28em] text-brand-black/45">
                Hallmarked · Certificate of Authenticity included
              </p>
            </aside>
          </Reveal>
        </div>
      </section>
    </main>
  );
}
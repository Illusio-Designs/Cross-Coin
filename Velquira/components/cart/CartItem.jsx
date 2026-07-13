'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCart } from '@/hooks/useCart';
import { formatPrice } from '@/lib/utils';
import { ROUTES } from '@/lib/constants';

export function CartItem({ item }) {
  const { removeItem, updateQty } = useCart();

  const meta = [item.color, item.size ? `Size ${item.size}` : null].
  filter(Boolean).
  join(' · ');

  return (
    <li className="flex gap-4 border-b border-line py-5 last:border-0">
      <Link
        href={ROUTES.product(item.handle)}
        className="relative h-[88px] w-[88px] shrink-0 overflow-hidden rounded-lg bg-paper">

        <Image src={item.imageUrl} alt={item.name} fill className="object-contain" />
      </Link>

      <div className="flex flex-1 flex-col">
        <p className="vq-display text-[15px] leading-snug text-ink">{item.name}</p>
        {meta &&
        <p className="mt-1 text-[11.5px] tracking-wide text-text-faint">{meta}</p>
        }

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="vq-display text-base text-gold">
            {formatPrice(item.price * item.quantity)}
          </span>

          <div className="inline-flex items-center rounded-full border border-line">
            <button
              onClick={() => updateQty(item.id, item.quantity - 1)}
              className="flex h-7 w-7 items-center justify-center text-text-muted transition-colors duration-300 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
              aria-label="Decrease quantity">

              −
            </button>
            <span className="min-w-[1.5rem] text-center text-xs font-semibold tracking-wide text-ink">
              {item.quantity}
            </span>
            <button
              onClick={() => updateQty(item.id, item.quantity + 1)}
              className="flex h-7 w-7 items-center justify-center text-text-muted transition-colors duration-300 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
              aria-label="Increase quantity">

              +
            </button>
          </div>
        </div>

        <button
          onClick={() => removeItem(item.id)}
          className="mt-2 self-start text-[10px] font-semibold uppercase tracking-[0.18em] text-text-faint transition-colors duration-300 hover:text-ink focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-gold"
          aria-label={`Remove ${item.name}`}>

          Remove
        </button>
      </div>
    </li>);

}

import Image from 'next/image'
import { Lock } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { SHIPPING_THRESHOLD } from '@/lib/constants'
import type { CartItem } from '@/types'

interface OrderSummaryProps {
  items: CartItem[]
  subtotal: number
}

export function OrderSummary({ items, subtotal }: OrderSummaryProps) {
  const shipping = subtotal >= SHIPPING_THRESHOLD ? 0 : 499
  const total = subtotal + shipping

  return (
    <div className="lg:sticky lg:top-8 lg:self-start">
      <div className="rounded-2xl border border-gray-200 p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-gray-600 border-b border-gray-200 pb-3">
          Order Summary
        </h2>

        {/* Items */}
        <ul className="flex flex-col gap-4 py-4 border-b border-gray-200">
          {items.map((item) => (
            <li key={item.id} className="flex gap-3">
              <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
                <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-gray-600 text-[10px] text-white">
                  {item.quantity}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-center gap-0.5">
                <p className="text-sm text-gray-800">{item.name}</p>
                <p className="text-xs text-gray-600">{item.color} · Size {item.size}</p>
              </div>
              <p className="text-sm font-medium text-brand-black">
                {formatPrice(item.price * item.quantity)}
              </p>
            </li>
          ))}
        </ul>

        {/* Totals */}
        <div className="flex flex-col gap-3 py-4 border-b border-gray-200">
          <div className="flex justify-between text-sm text-gray-800">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-800">
            <span>Shipping</span>
            <span>{shipping === 0 ? 'Free' : formatPrice(shipping)}</span>
          </div>
        </div>
        <div className="flex justify-between pt-4 text-sm font-medium text-brand-black">
          <span>Total</span>
          <span>{formatPrice(total)}</span>
        </div>

        <div className="mt-4 flex items-center justify-center gap-1.5">
          <Lock size={12} className="text-gray-600" aria-hidden="true" />
          <p className="text-xs text-gray-600">Secure checkout</p>
        </div>
      </div>
    </div>
  )
}

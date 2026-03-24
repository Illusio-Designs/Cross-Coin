'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, X } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { formatPrice } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import type { CartItem as CartItemType } from '@/types'

interface CartItemProps {
  item: CartItemType
}

export function CartItem({ item }: CartItemProps) {
  const { removeItem, updateQty } = useCart()

  return (
    <li className="flex gap-4 border-b border-gray-200 py-4 last:border-0">
      <Link href={ROUTES.product(item.handle)} className="relative h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-100">
        <Image src={item.imageUrl} alt={item.name} fill className="object-cover" />
      </Link>

      <div className="flex flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm text-gray-800">{item.name}</p>
            <p className="text-xs text-gray-600">
              {item.color} · Size {item.size}
            </p>
          </div>
          <button
            onClick={() => removeItem(item.id)}
            className="p-0.5 text-gray-400 hover:text-brand-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
            aria-label={`Remove ${item.name}`}
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-2 py-1">
            <button
              onClick={() => updateQty(item.id, item.quantity - 1)}
              className="text-gray-600 hover:text-brand-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              aria-label="Decrease quantity"
            >
              <Minus size={12} />
            </button>
            <span className="min-w-[1.5rem] text-center text-sm">{item.quantity}</span>
            <button
              onClick={() => updateQty(item.id, item.quantity + 1)}
              className="text-gray-600 hover:text-brand-black transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
              aria-label="Increase quantity"
            >
              <Plus size={12} />
            </button>
          </div>
          <span className="text-sm font-medium text-brand-black">
            {formatPrice(item.price * item.quantity)}
          </span>
        </div>
      </div>
    </li>
  )
}

'use client'

import Link from 'next/link'
import { useCart } from '@/hooks/useCart'
import { Drawer } from '@/components/ui/Drawer'
import { Button } from '@/components/ui/Button'
import { CartItem } from './CartItem'
import { FreeShippingBar } from './FreeShippingBar'
import { formatPrice } from '@/lib/utils'
import { ROUTES } from '@/lib/constants'
import { cn } from '@/lib/utils'

const linkButtonClass =
  'inline-flex w-full items-center justify-center rounded-full bg-sage px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-sage-dark focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage'

export function CartDrawer() {
  const { items, drawerOpen, closeDrawer, subtotal } = useCart()

  return (
    <Drawer open={drawerOpen} onClose={closeDrawer} title={`Cart (${items.length})`}>
      <div className="flex h-full flex-col">
        <FreeShippingBar subtotal={subtotal} />

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p className="text-sm text-gray-600">Your cart is empty</p>
            <Link
              href="/collections/all"
              onClick={closeDrawer}
              className={cn(
                'inline-flex items-center justify-center rounded-full border border-brand-black px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-brand-black transition-colors duration-150 hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage'
              )}
            >
              Shop Now
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 overflow-y-auto px-6 py-4">
              {items.map((item) => (
                <CartItem key={item.id} item={item} />
              ))}
            </ul>

            <div className="border-t border-gray-200 px-6 py-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="text-sm font-medium text-brand-black">
                  {formatPrice(subtotal)}
                </span>
              </div>
              <Link href={ROUTES.checkout} onClick={closeDrawer} className={linkButtonClass}>
                Checkout
              </Link>
              <p className="mt-3 text-center text-xs text-gray-600">
                Taxes and shipping calculated at checkout
              </p>
            </div>
          </>
        )}
      </div>
    </Drawer>
  )
}

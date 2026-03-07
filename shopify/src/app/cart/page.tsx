'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Minus, Plus, X, ShoppingBag } from 'lucide-react'
import { useCartStore } from '@/store/cartStore'

export default function CartPage() {
  const [mounted, setMounted] = useState(false)
  const { items, updateQuantity, removeItem, getTotalPrice } = useCartStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="container-custom py-20">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag size={64} className="mx-auto text-gray-300 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Loading cart...</h1>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="container-custom py-20">
        <div className="max-w-md mx-auto text-center">
          <ShoppingBag size={64} className="mx-auto text-gray-300 mb-6" />
          <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
          <p className="text-muted mb-8">Add some products to get started</p>
          <Link href="/collections" className="btn-primary">
            Continue Shopping
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items */}
        <div className="lg:col-span-2">
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-6 p-6 border border-border">
                <div className="relative w-32 h-32 flex-shrink-0 bg-gray-100">
                  <Image src={item.image} alt={item.name} fill className="object-cover" />
                </div>

                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <h3 className="font-bold text-lg">{item.name}</h3>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-muted hover:text-primary transition-colors"
                      aria-label="Remove item"
                    >
                      <X size={24} />
                    </button>
                  </div>

                  <p className="text-muted mb-4">
                    Size: {item.size} / Color: {item.color}
                  </p>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-2 border border-border hover:bg-gray-50 transition-colors"
                        aria-label="Decrease quantity"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="w-12 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="p-2 border border-border hover:bg-gray-50 transition-colors"
                        aria-label="Increase quantity"
                      >
                        <Plus size={16} />
                      </button>
                    </div>

                    <p className="text-xl font-bold">${(item.price * item.quantity).toFixed(2)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Order Summary */}
        <div>
          <div className="border border-border p-6 sticky top-24">
            <h2 className="text-2xl font-bold mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">${getTotalPrice().toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span className="font-medium">Calculated at checkout</span>
              </div>
            </div>

            <div className="border-t pt-4 mb-6">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span>${getTotalPrice().toFixed(2)}</span>
              </div>
            </div>

            <Link href="/checkout" className="block w-full btn-primary text-center mb-4">
              Proceed to Checkout
            </Link>

            <Link href="/collections" className="block w-full btn-secondary text-center">
              Continue Shopping
            </Link>

            {/* Discount Code */}
            <div className="mt-6 pt-6 border-t">
              <label className="block font-medium mb-2">Discount Code</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter code"
                  className="flex-1 px-4 py-2 border border-border rounded-none focus:outline-none focus:border-primary"
                />
                <button className="px-6 py-2 bg-primary text-white hover:bg-accent transition-colors">
                  Apply
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

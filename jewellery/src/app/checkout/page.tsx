'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useCartStore } from '@/store/cartStore'
import { formatPrice } from '@/lib/utils'
import { CreditCard, Lock } from 'lucide-react'

export default function CheckoutPage() {
  const [mounted, setMounted] = useState(false)
  const { items, getTotalPrice } = useCartStore()

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="container-custom py-12">
        <h1 className="text-4xl font-serif font-bold mb-8">Loading checkout...</h1>
      </div>
    )
  }

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'United States',
    shippingMethod: 'standard',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Checkout:', formData)
  }

  const shippingCost = formData.shippingMethod === 'express' ? 25 : 0
  const tax = getTotalPrice() * 0.08
  const total = getTotalPrice() + shippingCost + tax

  return (
    <div className="container-custom py-12">
      <h1 className="text-4xl font-serif font-bold mb-8">Secure Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Checkout Form */}
        <div>
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Contact Information */}
            <div>
              <h2 className="text-2xl font-serif font-bold mb-4">Contact Information</h2>
              <input
                type="email"
                placeholder="Email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
                required
              />
            </div>

            {/* Shipping Address */}
            <div>
              <h2 className="text-2xl font-serif font-bold mb-4">Shipping Address</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input-field"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <input
                  type="text"
                  placeholder="Address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                  required
                />
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="City"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="input-field"
                    required
                  />
                  <input
                    type="text"
                    placeholder="State"
                    value={formData.state}
                    onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="ZIP Code"
                    value={formData.zip}
                    onChange={(e) => setFormData({ ...formData, zip: e.target.value })}
                    className="input-field"
                    required
                  />
                  <select
                    value={formData.country}
                    onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                    className="input-field"
                  >
                    <option>United States</option>
                    <option>Canada</option>
                    <option>United Kingdom</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Shipping Method */}
            <div>
              <h2 className="text-2xl font-serif font-bold mb-4">Shipping Method</h2>
              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 border-2 border-gold/30 cursor-pointer hover:border-gold transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="standard"
                      checked={formData.shippingMethod === 'standard'}
                      onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                    />
                    <div>
                      <p className="font-medium">Free Insured Shipping</p>
                      <p className="text-sm text-muted">5-7 business days</p>
                    </div>
                  </div>
                  <span className="font-bold text-gold">FREE</span>
                </label>
                <label className="flex items-center justify-between p-4 border-2 border-gold/30 cursor-pointer hover:border-gold transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="radio"
                      name="shipping"
                      value="express"
                      checked={formData.shippingMethod === 'express'}
                      onChange={(e) => setFormData({ ...formData, shippingMethod: e.target.value })}
                    />
                    <div>
                      <p className="font-medium">Express Insured Shipping</p>
                      <p className="text-sm text-muted">2-3 business days</p>
                    </div>
                  </div>
                  <span className="font-bold text-gold">$25.00</span>
                </label>
              </div>
            </div>

            {/* Payment Method */}
            <div>
              <h2 className="text-2xl font-serif font-bold mb-4">Payment Method</h2>
              <div className="p-6 border border-gold/30 bg-gray-50">
                <div className="flex items-center gap-2 mb-4">
                  <CreditCard size={24} className="text-gold" />
                  <span className="font-medium">Credit Card</span>
                  <Lock size={16} className="ml-auto text-muted" />
                </div>
                <div className="space-y-4">
                  <input
                    type="text"
                    placeholder="Card Number"
                    className="input-field"
                    required
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="MM/YY"
                      className="input-field"
                      required
                    />
                    <input
                      type="text"
                      placeholder="CVV"
                      className="input-field"
                      required
                    />
                  </div>
                </div>
              </div>
            </div>

            <button type="submit" className="w-full btn-primary">
              Complete Order
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div>
          <div className="border border-gold/20 p-6 sticky top-24 bg-white">
            <h2 className="text-2xl font-serif font-bold mb-6">Order Summary</h2>

            <div className="space-y-4 mb-6 max-h-64 overflow-y-auto">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4">
                  <div className="relative w-20 h-20 flex-shrink-0 bg-gray-100">
                    <Image src={item.image} alt={item.name} fill className="object-cover" />
                    <span className="absolute -top-2 -right-2 bg-gold text-primary text-xs w-6 h-6 rounded-full flex items-center justify-center font-bold">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium mb-1">{item.name}</h3>
                    <p className="text-sm text-muted">
                      {item.material}
                      {item.size && ` / Size ${item.size}`}
                    </p>
                  </div>
                  <p className="font-medium text-gold">{formatPrice(item.price * item.quantity)}</p>
                </div>
              ))}
            </div>

            <div className="space-y-3 py-4 border-t border-gold/20">
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span className="font-medium">{formatPrice(getTotalPrice())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Shipping</span>
                <span className="font-medium">{shippingCost === 0 ? 'FREE' : formatPrice(shippingCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Tax</span>
                <span className="font-medium">{formatPrice(tax)}</span>
              </div>
            </div>

            <div className="border-t border-gold/20 pt-4">
              <div className="flex justify-between text-xl font-bold">
                <span>Total</span>
                <span className="text-gold">{formatPrice(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

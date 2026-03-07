'use client'

import { useState } from 'react'

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Simulate API call
    setTimeout(() => {
      setStatus('success')
      setEmail('')
    }, 1000)
  }

  return (
    <section className="py-20 bg-primary text-white">
      <div className="container-custom">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-serif font-bold mb-4 text-gold">Join Our Exclusive Circle</h2>
          <p className="text-gray-300 text-lg mb-8">
            Subscribe to receive updates on new collections, special offers, and jewelry care tips
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className="flex-1 px-6 py-4 bg-white/10 border border-gold/30 text-white placeholder-gray-400 focus:outline-none focus:border-gold"
              required
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              Subscribe
            </button>
          </form>

          {status === 'success' && (
            <p className="mt-4 text-gold font-medium">
              Thank you for subscribing! Check your email for exclusive offers.
            </p>
          )}
        </div>
      </div>
    </section>
  )
}

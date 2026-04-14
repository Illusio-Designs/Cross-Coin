'use client'

import { useState } from 'react'
import { Star, X, CheckCircle } from 'lucide-react'
import { submitReview } from '@/lib/api/reviews'

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0)
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(s)}
          aria-label={`${s} star`}
        >
          <Star
            size={28}
            className={`transition-colors ${(hovered || value) >= s ? 'fill-amber-400 text-amber-400' : 'fill-gray-200 text-gray-200'}`}
          />
        </button>
      ))}
    </div>
  )
}

export function ReviewModal({ isOpen, onClose, productId = null, productName = null }) {
  const [form, setForm] = useState({ name: '', email: '', rating: 0, comment: '' })
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  if (!isOpen) return null

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.rating) { setError('Please select a rating'); return }
    if (!form.comment.trim()) { setError('Please write a review'); return }
    setError('')
    setSubmitting(true)
    try {
      await submitReview({
        productId: productId ?? undefined,
        rating: form.rating,
        comment: form.comment,
        name: form.name,
        email: form.email,
      })
      setDone(true)
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    setForm({ name: '', email: '', rating: 0, comment: '' })
    setError('')
    setDone(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md rounded-t-3xl bg-white p-6 shadow-2xl sm:rounded-3xl">
        <button onClick={handleClose} className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:bg-gray-200">
          <X size={15} />
        </button>

        {done ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-black">
              <CheckCircle size={26} className="text-white" />
            </div>
            <p className="text-base font-semibold text-brand-black">Thank you!</p>
            <p className="text-sm text-gray-500">Your review has been submitted and is pending approval.</p>
            <button onClick={handleClose} className="mt-2 rounded-full bg-brand-black px-6 py-2.5 text-sm font-semibold text-white hover:opacity-80">
              Close
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">Write a Review</p>
              {productName && <p className="mt-1 text-xs text-gray-400">{productName}</p>}
            </div>

            {/* Star rating */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Your Rating</label>
              <StarPicker value={form.rating} onChange={(v) => set('rating', v)} />
            </div>

            {/* Name + Email */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Name</label>
                <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Priya S."
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-500">Email</label>
                <input required type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com"
                  className="rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none" />
              </div>
            </div>

            {/* Review text */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-gray-500">Your Review</label>
              <textarea required rows={4} value={form.comment} onChange={(e) => set('comment', e.target.value)} placeholder="Share your experience..."
                className="resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none" />
            </div>

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button type="submit" disabled={submitting}
              className="rounded-full bg-brand-black py-3 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:opacity-50">
              {submitting ? 'Submitting…' : 'Submit Review'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

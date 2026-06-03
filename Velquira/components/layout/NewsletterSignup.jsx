'use client'

import { useState } from 'react'

/**
 * Newsletter — compact inline single line, sits inside the dark cocoa
 * footer. Hairline gold underline input + small gold serif italic
 * "Subscribe →" button. On submit replaces with an inline italic
 * confirmation. No API call.
 */
export function NewsletterSignup() {
  const [email, setEmail] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail('')
  }

  if (submitted) {
    return (
      <p className="font-display text-sm italic text-gold-light">
        Welcome. Look out for our first letter.
      </p>
    )
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md items-center gap-3 border-b border-gold/40 transition-colors duration-300 hover:border-gold focus-within:border-gold"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email address"
        aria-label="Email address"
        className="flex-1 bg-transparent py-2 text-sm text-white placeholder:text-white/45 caret-gold focus:outline-none"
      />
      <button
        type="submit"
        className="shrink-0 py-2 font-display text-sm italic tracking-wide text-gold transition-colors duration-200 hover:text-gold-light"
      >
        Subscribe →
      </button>
    </form>
  )
}
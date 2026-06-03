'use client'

import { useRef, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'

export function SearchInput({ initialQuery }) {
  const router = useRouter()
  const [value, setValue] = useState(initialQuery || '')
  const debounceRef = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const q = value.trim()
      if (q) router.replace(`/search?q=${encodeURIComponent(q)}`)
      else router.replace('/search')
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [value, router])

  const handleClear = () => {
    setValue('')
    router.replace('/search')
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} role="search">
      <label htmlFor="search-input" className="sr-only">Search products</label>
      <div className="relative flex items-center gap-3 border-b border-gold/30 focus-within:border-gold">
        <Search size={15} className="text-gold" strokeWidth={1.6} aria-hidden="true" />
        <input
          id="search-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search rings, pendants, occasions…"
          autoFocus
          autoComplete="off"
          className="flex-1 border-0 bg-transparent px-0 py-3 text-sm text-brand-black placeholder:text-brand-black/30 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="flex h-6 w-6 items-center justify-center text-brand-black/40 transition-colors hover:text-gold"
            aria-label="Clear search"
          >
            <X size={13} strokeWidth={1.6} />
          </button>
        )}
      </div>
    </form>
  )
}
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
      <div className="relative">
        <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-white/40" aria-hidden="true" />
        <input
          id="search-input"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search socks, colours, packs…"
          autoFocus
          autoComplete="off"
          className="w-full rounded-full border border-white/15 bg-white/10 py-4 pl-12 pr-12 text-sm text-white placeholder:text-white/35 transition-all duration-150 focus:border-white/30 focus:bg-white/15 focus:outline-none"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-4 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
            aria-label="Clear search"
          >
            <X size={13} />
          </button>
        )}
      </div>
    </form>
  )
}

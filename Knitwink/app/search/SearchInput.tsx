'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

interface SearchInputProps {
  initialQuery: string
}

export function SearchInput({ initialQuery }: SearchInputProps) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = inputRef.current?.value.trim()
    if (q) {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    } else {
      router.push('/search')
    }
  }

  return (
    <form onSubmit={handleSubmit} role="search">
      <label htmlFor="search-input" className="sr-only">
        Search products
      </label>
      <div className="relative">
        <Search
          size={16}
          className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id="search-input"
          type="search"
          name="q"
          defaultValue={initialQuery}
          placeholder="Search for shoes, materials…"
          autoFocus
          className="w-full rounded-full border border-gray-200 bg-white py-3.5 pl-12 pr-5 text-sm text-gray-800 placeholder:text-gray-400 transition-colors duration-150 focus:border-brand-black focus:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        />
      </div>
    </form>
  )
}

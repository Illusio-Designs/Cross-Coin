'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const FILTERS = [
  { label: 'All', value: '' },
  { label: 'New', value: 'new' },
  { label: 'Sale', value: 'sale' },
  { label: 'Running', value: 'running' },
  { label: 'Walking', value: 'walking' },
  { label: 'Casual', value: 'casual' },
]

export function FilterBar() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const active = searchParams.get('filter') ?? ''

  const handleFilter = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set('filter', value)
    } else {
      params.delete('filter')
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Filter products">
      {FILTERS.map((f) => (
        <button
          key={f.value}
          onClick={() => handleFilter(f.value)}
          aria-pressed={active === f.value}
          className={cn(
            'rounded-full border px-4 py-1.5 text-xs font-medium uppercase tracking-widest transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
            active === f.value
              ? 'border-brand-black bg-brand-black text-white'
              : 'border-gray-200 text-gray-800 hover:border-brand-black'
          )}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}

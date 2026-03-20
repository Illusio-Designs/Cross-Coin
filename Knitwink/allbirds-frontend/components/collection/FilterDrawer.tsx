'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { SlidersHorizontal } from 'lucide-react'
import { Drawer } from '@/components/ui/Drawer'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'

const FILTER_GROUPS = [
  {
    label: 'Category',
    param: 'filter',
    options: [
      { label: 'All', value: '' },
      { label: 'Running', value: 'running' },
      { label: 'Walking', value: 'walking' },
      { label: 'Casual', value: 'casual' },
    ],
  },
  {
    label: 'Status',
    param: 'status',
    options: [
      { label: 'All', value: '' },
      { label: 'New', value: 'new' },
      { label: 'Sale', value: 'sale' },
      { label: 'Bestseller', value: 'bestseller' },
    ],
  },
]

export function FilterDrawer() {
  const { filterDrawerOpen, closeFilterDrawer } = useUiStore()
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setParam = (param: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (value) {
      params.set(param, value)
    } else {
      params.delete(param)
    }
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <>
      {/* Mobile trigger */}
      <button
        onClick={() => useUiStore.getState().openFilterDrawer()}
        className="flex items-center gap-2 rounded-full border border-gray-200 px-4 py-1.5 text-xs font-medium uppercase tracking-widest text-gray-800 transition-colors duration-150 hover:border-brand-black md:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
        aria-label="Open filters"
      >
        <SlidersHorizontal size={14} />
        Filters
      </button>

      <Drawer open={filterDrawerOpen} onClose={closeFilterDrawer} title="Filter" side="left">
        <div className="flex flex-col gap-8 px-6 py-6">
          {FILTER_GROUPS.map((group) => {
            const active = searchParams.get(group.param) ?? ''
            return (
              <div key={group.label}>
                <p className="mb-3 text-xs font-medium uppercase tracking-widest text-gray-600">
                  {group.label}
                </p>
                <div className="flex flex-col gap-2">
                  {group.options.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setParam(group.param, opt.value)}
                      aria-pressed={active === opt.value}
                      className={cn(
                        'text-left text-sm transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2',
                        active === opt.value
                          ? 'font-medium text-brand-black'
                          : 'text-gray-600 hover:text-brand-black'
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </Drawer>
    </>
  )
}

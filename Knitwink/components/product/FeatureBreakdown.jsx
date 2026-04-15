'use client'

import { Leaf, Wind, Droplets, Zap, Shield, Recycle } from 'lucide-react'

const ICON_MAP = {
  leaf: Leaf, wind: Wind, droplets: Droplets,
  zap: Zap, shield: Shield, recycle: Recycle,
}

const DEFAULT_FEATURES = [
  { icon: 'shield', title: 'Anti-Microbial', description: 'Keeps your feet fresh and odor-free all day long.' },
  { icon: 'wind',   title: 'Breathable Knit', description: 'Temperature-regulating fibers for all-season comfort.' },
  { icon: 'droplets', title: 'Moisture-Wicking', description: 'Draws moisture away to keep feet dry and comfortable.' },
  { icon: 'zap',    title: 'Elastane Grip', description: 'No-sag welt that stays in place without squeezing.' },
  { icon: 'recycle', title: 'Machine Washable', description: 'Easy care — toss them in the wash, good as new.' },
  { icon: 'leaf',   title: 'Soft Cotton Blend', description: 'Premium materials that feel gentle against your skin.' },
]

export function FeatureBreakdown({ features }) {
  const items = features?.length > 0 ? features : DEFAULT_FEATURES

  return (
    <div className="px-6 py-10 md:px-8 md:py-14">
      <p className="mb-8 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
        Built Different
      </p>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {items.map((f) => {
          const Icon = ICON_MAP[f.icon] || Leaf
          return (
            <div key={f.title} className="flex flex-col items-center gap-3 rounded-2xl border border-gray-100 bg-white px-4 py-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-50">
                <Icon size={22} className="text-brand-black" />
              </div>
              <p className="text-sm font-semibold text-brand-black">{f.title}</p>
              <p className="text-xs leading-relaxed text-gray-500">{f.description}</p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { Leaf, Wind, Droplets, Zap, Shield, Recycle, Sun, Footprints } from 'lucide-react'
import type { Feature } from '@/types'

const ICON_MAP: Record<string, React.ReactNode> = {
  leaf: <Leaf size={32} className="text-brand-black" />,
  wind: <Wind size={32} className="text-brand-black" />,
  droplets: <Droplets size={32} className="text-brand-black" />,
  zap: <Zap size={32} className="text-brand-black" />,
  shield: <Shield size={32} className="text-brand-black" />,
  recycle: <Recycle size={32} className="text-brand-black" />,
  sun: <Sun size={32} className="text-brand-black" />,
  footprints: <Footprints size={32} className="text-brand-black" />,
}

const DEFAULT_FEATURES: Feature[] = [
  { icon: 'leaf', title: 'Natural Materials', description: 'Made with ZQ-certified merino wool or TENCEL™ lyocell from eucalyptus trees.' },
  { icon: 'wind', title: 'Breathable', description: 'Temperature-regulating fibers keep you comfortable all day long.' },
  { icon: 'droplets', title: 'Moisture-Wicking', description: 'Naturally draws moisture away from your skin to keep feet dry.' },
  { icon: 'recycle', title: 'Carbon Neutral', description: 'We measure, reduce, and offset the carbon footprint of every product.' },
  { icon: 'shield', title: 'Machine Washable', description: 'Toss them in the wash. They come out looking as good as new.' },
  { icon: 'zap', title: 'Lightweight', description: 'Engineered to be as light as possible without sacrificing support.' },
]

interface FeatureBreakdownProps {
  features?: Feature[]
}

export function FeatureBreakdown({ features }: FeatureBreakdownProps) {
  const items = features && features.length > 0 ? features : DEFAULT_FEATURES

  return (
    <div className="mx-auto max-w-site px-5 py-12 lg:px-8">
      <h2 className="mb-10 text-center font-display text-2xl font-normal text-brand-black lg:text-3xl">
        Built different
      </h2>
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {items.map((f) => (
          <div key={f.title} className="flex flex-col gap-3 border-t border-gray-200 pt-6">
            <div aria-hidden="true">
              {ICON_MAP[f.icon] ?? <Leaf size={32} className="text-brand-black" />}
            </div>
            <p className="text-sm font-medium text-brand-black">{f.title}</p>
            <p className="text-sm leading-relaxed text-gray-600">{f.description}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

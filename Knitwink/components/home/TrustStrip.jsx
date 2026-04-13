import { ShieldCheck, Lock, Truck, Star } from 'lucide-react'
import { SectionHeader } from '@/components/ui/SectionHeader'

const ITEMS = [
  {
    icon: ShieldCheck,
    title: 'Premium Quality',
    sub: 'Handcrafted with the finest materials, built to last',
    badge: 'Since 2020',
    dark: false,
  },
  {
    icon: Lock,
    title: 'Secure Shopping',
    sub: '100% safe & encrypted checkout on every order',
    badge: 'SSL Protected',
    dark: true,
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    sub: 'Pan India shipping — delivered to your doorstep',
    badge: 'Pan India',
    dark: false,
  },
  {
    icon: Star,
    title: 'Authentic Products',
    sub: '100% genuine Knitwink merchandise, guaranteed',
    badge: 'Verified',
    dark: true,
  },
]

export function TrustStrip() {
  return (
    <section className="px-4 py-12 md:px-8 lg:px-16">
      <SectionHeader eyebrow="Why Knitwink" title="Crafted with <strong>Care & Commitment</strong>" center />

      {/* 4 cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, sub, badge, dark }) => (
          <div
            key={title}
            className={`relative flex flex-col items-center overflow-hidden rounded-2xl px-5 py-8 text-center ${
              dark ? 'bg-brand-black text-white' : 'bg-gray-100 text-brand-black'
            }`}
          >
            {/* Decorative circle */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${dark ? 'bg-white' : 'bg-brand-black'}`} />
            <div className={`mb-5 flex h-12 w-12 items-center justify-center rounded-full ${dark ? 'bg-white/15' : 'bg-brand-black/10'}`}>
              <Icon size={22} className={dark ? 'text-white' : 'text-brand-black'} />
            </div>
            <h3 className="mb-2 text-sm font-semibold">{title}</h3>
            <p className={`mb-5 flex-1 text-xs leading-relaxed ${dark ? 'text-white/60' : 'text-gray-500'}`}>{sub}</p>
            <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${dark ? 'border-white/20 text-white/40' : 'border-gray-300 text-gray-400'}`}>
              {badge}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

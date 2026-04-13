import { ShieldCheck, Lock, Truck, Star } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, title: 'Premium Quality',    sub: 'Finest materials, built to last',        badge: 'Since 2020',    dark: false },
  { icon: Lock,        title: 'Secure Shopping',    sub: '100% safe & encrypted checkout',         badge: 'SSL Protected', dark: true  },
  { icon: Truck,       title: 'Fast Delivery',      sub: 'Pan India — delivered to your doorstep', badge: 'Pan India',     dark: false },
  { icon: Star,        title: 'Authentic Products', sub: '100% genuine Knitwink, guaranteed',      badge: 'Verified',      dark: true  },
]

export function TrustStrip() {
  return (
    <div className="px-3 py-6">
      {/* Title */}
      <p className="mb-5 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
        Why Knitwink
      </p>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {ITEMS.map(({ icon: Icon, title, sub, badge, dark }) => (
          <div
            key={title}
            style={{ height: 300 }}
            className={`relative flex flex-col items-center justify-center overflow-hidden rounded-2xl px-6 text-center ${
              dark ? 'bg-brand-black text-white' : 'bg-[#f0ece6] text-brand-black'
            }`}
          >
            <div className={`absolute -right-6 -top-6 h-28 w-28 rounded-full opacity-[0.08] ${dark ? 'bg-white' : 'bg-brand-black'}`} />
            <div className={`absolute -bottom-6 -left-6 h-24 w-24 rounded-full opacity-[0.06] ${dark ? 'bg-white' : 'bg-brand-black'}`} />

            <div className={`mb-6 flex h-14 w-14 items-center justify-center rounded-full ${dark ? 'bg-white/10' : 'bg-brand-black/10'}`}>
              <Icon size={24} className={dark ? 'text-white' : 'text-brand-black'} />
            </div>
            <h3 className="text-base font-semibold">{title}</h3>
            <p className={`mt-2 text-xs leading-relaxed ${dark ? 'text-white/55' : 'text-gray-600'}`}>{sub}</p>
            <span className={`mt-6 rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-widest ${dark ? 'border-white/20 text-white/40' : 'border-brand-black/20 text-brand-black/50'}`}>
              {badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

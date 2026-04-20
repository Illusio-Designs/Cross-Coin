import { ShieldCheck, Lock, Truck, Star } from 'lucide-react'

const ITEMS = [
  { icon: ShieldCheck, title: 'Premium Quality',    sub: 'Finest materials, built to last',        badge: 'Since 2020',    dark: false },
  { icon: Lock,        title: 'Secure Shopping',    sub: '100% safe & encrypted checkout',         badge: 'SSL Protected', dark: true  },
  { icon: Truck,       title: 'Fast Delivery',      sub: 'Pan India delivered to your doorstep',   badge: 'Pan India',     dark: false },
  { icon: Star,        title: 'Authentic Products', sub: '100% genuine Knitwink, guaranteed',      badge: 'Verified',      dark: true  },
]

export function TrustStrip() {
  return (
    <div className="px-3 py-6">
      <p className="mb-4 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
        Why Knitwink
      </p>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 md:gap-3">
        {ITEMS.map(({ icon: Icon, title, sub, badge, dark }) => (
          <div
            key={title}
            className={`aspect-square relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl p-4 text-center ${
              dark ? 'bg-brand-black text-white' : 'bg-[#f0ece6] text-brand-black'
            }`}
          >
            {/* subtle bg circle */}
            <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-[0.07] ${dark ? 'bg-white' : 'bg-brand-black'}`} />

            <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${dark ? 'bg-white/10' : 'bg-brand-black/8'}`}>
              <Icon size={18} className={dark ? 'text-white' : 'text-brand-black'} />
            </div>

            <div>
              <p className="text-[11px] font-bold leading-tight">{title}</p>
              <p className={`mt-1 text-[10px] leading-snug ${dark ? 'text-white/50' : 'text-gray-500'}`}>{sub}</p>
            </div>

            <span className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest ${dark ? 'border-white/20 text-white/40' : 'border-brand-black/20 text-brand-black/40'}`}>
              {badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

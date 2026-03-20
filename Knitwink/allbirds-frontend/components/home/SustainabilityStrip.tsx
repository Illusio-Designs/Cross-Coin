import { CheckCircle, Lock, Truck, Star } from 'lucide-react'

const features = [
  {
    icon: CheckCircle,
    title: 'Premium Quality',
    description: 'Handcrafted with the finest natural materials, built to last',
    badge: 'Since 2016',
    bg: 'bg-brand-black',
    iconBg: 'bg-gray-800',
    text: 'text-white',
  },
  {
    icon: Lock,
    title: 'Secure Shopping',
    description: '100% safe & encrypted checkout on every order',
    badge: 'SSL Protected',
    bg: 'bg-white border border-gray-200',
    iconBg: 'bg-gray-100',
    text: 'text-brand-black',
  },
  {
    icon: Truck,
    title: 'Fast Delivery',
    description: 'Nationwide shipping — delivered to your doorstep',
    badge: 'Pan India',
    bg: 'bg-brand-black',
    iconBg: 'bg-gray-800',
    text: 'text-white',
  },
  {
    icon: Star,
    title: 'Authentic Products',
    description: '100% genuine Allbirds merchandise, guaranteed',
    badge: 'Verified',
    bg: 'bg-white border border-gray-200',
    iconBg: 'bg-gray-100',
    text: 'text-brand-black',
  },
]

export function SustainabilityStrip() {
  return (
    <section className="px-6 py-16 md:px-10 md:py-24 lg:px-16 lg:py-32">
      <div className="mx-auto grid max-w-site grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        {features.map(({ icon: Icon, title, description, badge, bg, iconBg, text }) => (
          <div
            key={title}
            className={`${bg} ${text} flex flex-col items-center rounded-2xl px-6 py-10 text-center`}
          >
            <div className={`${iconBg} mb-6 flex h-14 w-14 items-center justify-center rounded-full`}>
              <Icon size={24} aria-hidden="true" />
            </div>
            <h3 className="mb-3 text-base font-medium">{title}</h3>
            <p className="mb-6 flex-1 text-sm leading-relaxed opacity-70">{description}</p>
            <span className="rounded-full border border-current px-3 py-1 text-xs font-medium uppercase tracking-widest opacity-50">
              {badge}
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}

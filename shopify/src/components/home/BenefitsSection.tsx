import { Wind, Shield, Heart, Truck } from 'lucide-react'

const benefits = [
  {
    icon: Wind,
    title: 'Breathable Cotton',
    description: 'Premium cotton fabric keeps your feet cool and dry all day',
  },
  {
    icon: Shield,
    title: 'Anti-Odor Technology',
    description: 'Advanced moisture-wicking keeps your socks fresh',
  },
  {
    icon: Heart,
    title: 'All Day Comfort',
    description: 'Ergonomic design provides superior comfort and support',
  },
  {
    icon: Truck,
    title: 'Free Shipping',
    description: 'Free shipping on all orders over $50',
  },
]

export default function BenefitsSection() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-primary text-white rounded-full mb-4">
                <benefit.icon size={32} />
              </div>
              <h3 className="text-xl font-bold mb-2">{benefit.title}</h3>
              <p className="text-muted">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

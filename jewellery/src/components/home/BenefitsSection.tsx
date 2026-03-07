import { Shield, Award, Gem, Truck } from 'lucide-react'

const benefits = [
  {
    icon: Gem,
    title: 'Certified Gemstones',
    description: 'Every gemstone comes with authenticity certification',
  },
  {
    icon: Award,
    title: 'Master Craftsmanship',
    description: 'Handcrafted by skilled artisans with decades of experience',
  },
  {
    icon: Shield,
    title: 'Lifetime Warranty',
    description: 'Comprehensive warranty on all fine jewelry pieces',
  },
  {
    icon: Truck,
    title: 'Insured Shipping',
    description: 'Free insured shipping on orders over $500',
  },
]

export default function BenefitsSection() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {benefits.map((benefit) => (
            <div key={benefit.title} className="text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gold text-primary rounded-full mb-4">
                <benefit.icon size={32} />
              </div>
              <h3 className="text-xl font-serif font-bold mb-2">{benefit.title}</h3>
              <p className="text-muted">{benefit.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

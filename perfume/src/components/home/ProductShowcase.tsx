import Image from 'next/image'
import Link from 'next/link'

export default function ProductShowcase() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-square">
            <Image
              src="https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=800"
              alt="Premium Socks Showcase"
              fill
              className="object-cover"
            />
          </div>
          <div>
            <h2 className="text-4xl font-bold mb-6">
              Engineered for Performance, Designed for Comfort
            </h2>
            <p className="text-muted text-lg mb-6">
              Our premium socks are crafted with the finest materials and cutting-edge technology
              to provide unmatched comfort and durability. Whether you're hitting the gym,
              heading to the office, or relaxing at home, we have the perfect pair for you.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Premium combed cotton for superior softness</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Reinforced heel and toe for extra durability</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Seamless toe closure prevents irritation</span>
              </li>
              <li className="flex items-start">
                <span className="text-primary mr-2">✓</span>
                <span>Arch support for all-day comfort</span>
              </li>
            </ul>
            <Link href="/collections" className="btn-primary">
              Shop All Products
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

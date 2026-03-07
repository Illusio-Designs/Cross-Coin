import Image from 'next/image'
import Link from 'next/link'

export default function ProductShowcase() {
  return (
    <section className="py-20 bg-primary text-white">
      <div className="container-custom">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="relative aspect-square">
            <Image
              src="https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800"
              alt="Luxury Jewelry Showcase"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 border-4 border-gold/30" />
          </div>
          <div>
            <h2 className="text-4xl font-serif font-bold mb-6 text-gold">
              Crafted for Eternity
            </h2>
            <p className="text-gray-300 text-lg mb-6">
              Each piece in our collection is meticulously crafted using the finest materials
              and time-honored techniques. From ethically sourced gemstones to precious metals,
              we ensure every detail meets our exacting standards of excellence.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start">
                <span className="text-gold mr-2">✓</span>
                <span className="text-gray-300">Ethically sourced diamonds and gemstones</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2">✓</span>
                <span className="text-gray-300">18K gold and platinum settings</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2">✓</span>
                <span className="text-gray-300">Handcrafted by master jewelers</span>
              </li>
              <li className="flex items-start">
                <span className="text-gold mr-2">✓</span>
                <span className="text-gray-300">Lifetime warranty and free resizing</span>
              </li>
            </ul>
            <Link href="/collections" className="btn-primary">
              Explore Collection
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}

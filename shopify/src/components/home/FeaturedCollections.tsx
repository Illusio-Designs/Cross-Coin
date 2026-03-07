import Link from 'next/link'
import Image from 'next/image'

const collections = [
  {
    name: 'Athletic Socks',
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=600',
    href: '/collections/athletic',
    count: 24,
  },
  {
    name: 'Casual Socks',
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=600',
    href: '/collections/casual',
    count: 32,
  },
  {
    name: 'Formal Socks',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=600',
    href: '/collections/formal',
    count: 18,
  },
  {
    name: 'Winter Socks',
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=600',
    href: '/collections/winter',
    count: 15,
  },
]

export default function FeaturedCollections() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Shop By Collection</h2>
          <p className="text-muted text-lg">Find the perfect socks for every occasion</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((collection) => (
            <Link
              key={collection.href}
              href={collection.href}
              className="group relative aspect-[3/4] overflow-hidden"
            >
              <Image
                src={collection.image}
                alt={collection.name}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-bold mb-1">{collection.name}</h3>
                <p className="text-sm opacity-90">{collection.count} Products</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

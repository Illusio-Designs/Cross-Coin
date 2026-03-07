import Link from 'next/link'
import Image from 'next/image'

const collections = [
  {
    name: 'Rings',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600',
    href: '/collections/rings',
    count: 156,
  },
  {
    name: 'Necklaces',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600',
    href: '/collections/necklaces',
    count: 98,
  },
  {
    name: 'Earrings',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600',
    href: '/collections/earrings',
    count: 124,
  },
  {
    name: 'Bracelets',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=600',
    href: '/collections/bracelets',
    count: 87,
  },
]

export default function FeaturedCollections() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold mb-4">Explore Our Collections</h2>
          <p className="text-muted text-lg">Discover exquisite pieces for every occasion</p>
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
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <h3 className="text-2xl font-serif font-bold mb-1">{collection.name}</h3>
                <p className="text-sm text-gold">{collection.count} Pieces</p>
              </div>
              <div className="absolute inset-0 border-2 border-gold opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

import Link from 'next/link'
import Image from 'next/image'

const categories = [
  {
    name: 'Athletic',
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400',
    href: '/collections/athletic',
  },
  {
    name: 'Casual',
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400',
    href: '/collections/casual',
  },
  {
    name: 'Formal',
    image: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400',
    href: '/collections/formal',
  },
  {
    name: 'Winter',
    image: 'https://images.unsplash.com/photo-1544441892-794166f1e3be?w=400',
    href: '/collections/winter',
  },
  {
    name: 'Compression',
    image: 'https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=400',
    href: '/collections/compression',
  },
  {
    name: 'No-Show',
    image: 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400',
    href: '/collections/no-show',
  },
]

export default function ShopByCategory() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold mb-4">Shop By Category</h2>
          <p className="text-muted text-lg">Find your perfect style</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group text-center"
            >
              <div className="relative aspect-square mb-3 overflow-hidden rounded-full">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <h3 className="font-medium group-hover:text-muted transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

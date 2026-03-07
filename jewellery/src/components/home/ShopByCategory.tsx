import Link from 'next/link'
import Image from 'next/image'

const categories = [
  {
    name: 'Engagement Rings',
    image: 'https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=400',
    href: '/collections/engagement-rings',
  },
  {
    name: 'Wedding Bands',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
    href: '/collections/wedding-bands',
  },
  {
    name: 'Pearl Jewelry',
    image: 'https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=400',
    href: '/collections/pearls',
  },
  {
    name: 'Diamond Studs',
    image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=400',
    href: '/collections/diamond-studs',
  },
  {
    name: 'Tennis Bracelets',
    image: 'https://images.unsplash.com/photo-1611591437281-460bfbe1220a?w=400',
    href: '/collections/tennis-bracelets',
  },
  {
    name: 'Luxury Watches',
    image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=400',
    href: '/collections/watches',
  },
]

export default function ShopByCategory() {
  return (
    <section className="py-20">
      <div className="container-custom">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-serif font-bold mb-4">Shop By Category</h2>
          <p className="text-muted text-lg">Find the perfect piece for any occasion</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {categories.map((category) => (
            <Link
              key={category.href}
              href={category.href}
              className="group text-center"
            >
              <div className="relative aspect-square mb-3 overflow-hidden rounded-full border-4 border-gold/20 group-hover:border-gold transition-colors">
                <Image
                  src={category.image}
                  alt={category.name}
                  fill
                  className="object-cover group-hover:scale-110 transition-transform duration-300"
                />
              </div>
              <h3 className="font-medium group-hover:text-gold transition-colors">
                {category.name}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

import Image from 'next/image';
import Link from 'next/link';

const EXCLUSIVES = [
{
  handle: 'mens-tree-runner-nz',
  label: "Men's",
  name: "Men's Tree Runner NZ",
  colorName: 'Burnt Olive',
  price: '₹8,999',
  badge: 'New Color',
  image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=900&q=80',
  bg: '#e8e4dc',
  href: '/collections/mens'
},
{
  handle: 'womens-tree-runner-nz',
  label: "Women's",
  name: "Women's Tree Runner NZ",
  colorName: 'Hazy Ivory',
  price: '₹8,999',
  badge: 'New Color',
  image: 'https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=900&q=80',
  bg: '#dde4e0',
  href: '/collections/womens'
}];


export function ExclusivePair() {
  return (
    <section className="bg-white px-4 py-10 md:px-6 md:py-12">
      {/* Heading */}
      <div className="mb-8 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-gray-600">Just dropped</p>
        <h2 className="mt-2 font-display text-3xl font-normal text-brand-black lg:text-4xl">
          Exclusive new colors
        </h2>
      </div>

      {/* Two cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {EXCLUSIVES.map((item) =>
        <Link
          key={item.handle}
          href={item.href}
          className="group relative overflow-hidden rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          style={{ backgroundColor: item.bg }}>
          
            {/* Badge */}
            <div className="absolute left-4 top-4 z-10">
              <span className="rounded-full bg-white/80 px-3 py-1 text-[11px] font-medium uppercase tracking-widest text-brand-black backdrop-blur-sm">
                {item.badge}
              </span>
            </div>

            {/* Image */}
            <div className="relative aspect-[4/3] w-full">
              <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(max-width: 640px) 100vw, 50vw"
              className="object-contain object-center p-8 transition-transform duration-500 group-hover:scale-105" />
            
            </div>

            {/* Info bar */}
            <div className="flex items-end justify-between px-5 pb-5 pt-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-widest text-gray-600">
                  {item.label}
                </p>
                <p className="mt-0.5 text-sm font-semibold uppercase tracking-wide text-brand-black">
                  {item.name}
                </p>
                <p className="mt-0.5 text-sm text-gray-600">{item.colorName}</p>
              </div>
              <p className="text-sm font-medium text-brand-black">{item.price}</p>
            </div>
          </Link>
        )}
      </div>
    </section>);

}
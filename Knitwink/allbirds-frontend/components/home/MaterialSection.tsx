import Image from 'next/image'
import Link from 'next/link'
import type { Material } from '@/types'

const FALLBACK_MATERIALS: Material[] = [
  {
    name: 'Merino Wool',
    description:
      'Naturally temperature-regulating, moisture-wicking, and odor-resistant. Our ZQ-certified merino wool is sourced from farms with the highest animal welfare standards.',
    imageUrl: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=80',
    carbonRating: 4,
  },
  {
    name: 'Tree Fiber',
    description:
      'Silky-soft TENCEL™ lyocell made from sustainably harvested eucalyptus trees. Breathable, lightweight, and produced in a closed-loop process that recycles water and solvents.',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=900&q=80',
    carbonRating: 5,
  },
]

interface MaterialSectionProps {
  materials?: Material[]
}

export function MaterialSection({ materials }: MaterialSectionProps) {
  const items = materials && materials.length > 0 ? materials.slice(0, 2) : FALLBACK_MATERIALS

  return (
    <section className="mx-auto max-w-site px-6 py-16 md:px-10 md:py-24 lg:px-16 lg:py-32">
      <h2 className="mb-16 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
        What we&apos;re made of
      </h2>
      <div className="flex flex-col gap-24">
        {items.map((material, i) => {
          const isEven = i % 2 === 0
          return (
            <div
              key={material.name}
              className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2"
            >
              {/* Image — alternates sides */}
              <div className={`relative aspect-[4/3] overflow-hidden rounded-2xl bg-gray-100 ${isEven ? 'lg:order-1' : 'lg:order-2'}`}>
                <Image
                  src={material.imageUrl}
                  alt={material.name}
                  fill
                  className="object-cover"
                />
              </div>

              {/* Text */}
              <div className={isEven ? 'lg:order-2' : 'lg:order-1'}>
                <p className="text-xs font-medium uppercase tracking-widest text-sage">
                  Natural Material
                </p>
                <h3 className="mt-3 font-display text-3xl font-normal text-brand-black lg:text-4xl">
                  {material.name}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-gray-600">
                  {material.description}
                </p>
                <Link
                  href="/sustainability"
                  className="mt-6 inline-block text-sm text-brand-black underline underline-offset-4 transition-colors duration-150 hover:text-sage focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
                >
                  Learn more about {material.name}
                </Link>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

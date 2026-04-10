import Link from 'next/link'

export function CollectionGrid({ categories = [] }) {
  if (categories.length === 0) {
    return (
      <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-4 py-10 md:px-6 md:py-14">
        <h2 className="mb-6 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
          Shop by Collection
        </h2>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-gray-100" />
          ))}
        </div>
      </section>
    )
  }

  const tiles = categories.slice(0, 4).map((c) => {
    let img = c.image || ''
    if (img.includes('https://') && img.indexOf('https://') !== img.lastIndexOf('https://')) {
      img = img.substring(img.lastIndexOf('https://'))
    }
    return { name: c.name, handle: c.slug || String(c.id), image: img }
  })

  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-4 py-10 md:px-6 md:py-14">
      <h2 className="mb-6 text-center font-display text-3xl font-normal text-brand-black lg:text-4xl">
        Shop by Collection
      </h2>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.handle}
            href={`/collections?category=${encodeURIComponent(tile.name)}`}
            className="group relative overflow-hidden rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            <div className="relative aspect-[3/4]">
              {tile.image
                ? <img src={tile.image} alt={tile.name} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                : <div className="absolute inset-0 bg-gray-200" />
              }
              <div className="absolute inset-0 bg-gradient-to-t from-brand-black/50 to-transparent" />
              <span className="absolute bottom-4 left-4 text-sm font-medium text-white">{tile.name}</span>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

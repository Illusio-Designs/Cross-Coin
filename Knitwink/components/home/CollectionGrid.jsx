import Link from 'next/link'
import { SectionHeader } from '@/components/ui/SectionHeader'

export function CollectionGrid({ categories = [] }) {
  const tiles = categories.slice(0, 4).map((c) => {
    let img = c.image || ''
    if (img.includes('https://') && img.indexOf('https://') !== img.lastIndexOf('https://')) {
      img = img.substring(img.lastIndexOf('https://'))
    }
    return { name: c.name, handle: c.slug || String(c.id), image: img }
  })

  return (
    <section className="bg-white px-4 py-12 md:px-8 lg:px-16">
      <SectionHeader eyebrow="Browse" title="Find Your <strong>Perfect Fit</strong>" center />

      {tiles.length === 0 ? (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-gray-100" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-[2fr_1fr_1fr]">
          {tiles[0] && (
            <Link href={`/collections?category=${encodeURIComponent(tiles[0].name)}`} className="group relative col-span-2 overflow-hidden rounded-2xl lg:col-span-1 lg:row-span-2">
              <div className="relative aspect-[4/3] lg:aspect-auto lg:h-full" style={{ minHeight: 320 }}>
                {tiles[0].image ? <img src={tiles[0].image} alt={tiles[0].name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="h-full w-full bg-gray-100" />}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-white/60">Collection</p>
                  <h3 className="mt-0.5 text-base font-semibold text-white">{tiles[0].name}</h3>
                </div>
              </div>
            </Link>
          )}
          {tiles.slice(1, 4).map((tile) => (
            <Link key={tile.handle} href={`/collections?category=${encodeURIComponent(tile.name)}`} className="group relative overflow-hidden rounded-2xl">
              <div className="relative aspect-[4/3]">
                {tile.image ? <img src={tile.image} alt={tile.name} className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" /> : <div className="h-full w-full bg-gray-100" />}
                <div className="absolute inset-0 bg-gradient-to-t from-brand-black/55 to-transparent" />
                <span className="absolute bottom-3 left-4 text-sm font-semibold text-white">{tile.name}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}

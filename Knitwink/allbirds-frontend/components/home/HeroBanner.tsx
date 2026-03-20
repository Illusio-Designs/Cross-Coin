import Image from 'next/image'
import Link from 'next/link'

export function HeroBanner() {
  return (
    <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden bg-off-white">
      {/* Background image */}
      <Image
        src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1600&q=80"
        alt="Allbirds hero — person walking in natural setting wearing Allbirds shoes"
        fill
        className="object-cover object-center"
        priority
      />
      {/* Overlay */}
      <div className="absolute inset-0 bg-brand-black/20" />

      {/* Content */}
      <div className="relative z-10 mx-auto max-w-site px-6 text-center md:px-10 lg:px-16">
        <h1 className="font-display text-6xl font-normal tracking-tight text-white lg:text-8xl">
          Feel good
          <br />
          in every step
        </h1>
        <p className="mx-auto mt-6 max-w-md text-base leading-relaxed text-white/90">
          Shoes made with natural materials, designed for everyday comfort and a lighter footprint.
        </p>
        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <Link
            href="/collections/mens"
            className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-brand-black transition-colors duration-150 hover:bg-off-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
          >
            Shop Men
          </Link>
          <Link
            href="/collections/womens"
            className="inline-flex items-center justify-center rounded-full border border-white px-8 py-3.5 text-sm font-medium uppercase tracking-wider text-white transition-colors duration-150 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-sage"
          >
            Shop Women
          </Link>
        </div>
      </div>
    </section>
  )
}

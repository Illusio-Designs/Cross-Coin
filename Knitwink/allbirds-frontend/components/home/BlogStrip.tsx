import Image from 'next/image'
import Link from 'next/link'

const POSTS = [
  {
    slug: 'why-merino-wool',
    category: 'Materials',
    title: 'Why Merino Wool Is the Ultimate Performance Fabric',
    excerpt: 'Temperature-regulating, odor-resistant, and incredibly soft — here\'s why we built our best shoes around it.',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80',
    date: 'Mar 12, 2025',
    readTime: '4 min read',
  },
  {
    slug: 'carbon-footprint-explained',
    category: 'Sustainability',
    title: 'What Does Carbon Neutral Actually Mean?',
    excerpt: 'We put a number on every product we make. Here\'s how we calculate it, reduce it, and offset the rest.',
    image: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=800&q=80',
    date: 'Feb 28, 2025',
    readTime: '6 min read',
  },
  {
    slug: 'sweetfoam-sugarcane',
    category: 'Innovation',
    title: 'SweetFoam®: The World\'s First Carbon-Negative Sole',
    excerpt: 'Made from sugarcane grown in Brazil, our midsole actually removes more carbon than it creates.',
    image: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=800&q=80',
    date: 'Feb 10, 2025',
    readTime: '5 min read',
  },
]

export function BlogStrip() {
  return (
    <section className="mx-2 mt-2 overflow-hidden rounded-2xl bg-white px-4 py-10 md:px-6 md:py-12">
      {/* Heading */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-600">The Journal</p>
          <h2 className="mt-2 font-display text-3xl font-normal text-brand-black lg:text-4xl">
            Stories worth reading
          </h2>
        </div>
        <Link
          href="/journal"
          className="hidden text-sm text-brand-black underline underline-offset-4 transition-colors duration-150 hover:text-sage sm:block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage"
        >
          View all
        </Link>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {POSTS.map((post) => (
          <Link
            key={post.slug}
            href={`/journal/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-off-white transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage focus-visible:ring-offset-2"
          >
            {/* Image */}
            <div className="relative aspect-video overflow-hidden rounded-t-2xl bg-gray-100">
              <Image
                src={post.image}
                alt={post.title}
                fill
                sizes="(max-width: 640px) 100vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col gap-2 p-5">
              <span className="text-[11px] font-medium uppercase tracking-widest text-sage">
                {post.category}
              </span>
              <h3 className="text-sm font-semibold leading-snug text-brand-black">
                {post.title}
              </h3>
              <p className="line-clamp-2 text-sm leading-relaxed text-gray-600">
                {post.excerpt}
              </p>
              <div className="mt-auto flex items-center gap-2 pt-3">
                <span className="text-xs text-gray-400">{post.date}</span>
                <span className="text-xs text-gray-300">·</span>
                <span className="text-xs text-gray-400">{post.readTime}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Mobile view all */}
      <div className="mt-6 text-center sm:hidden">
        <Link
          href="/journal"
          className="text-sm text-brand-black underline underline-offset-4 hover:text-sage"
        >
          View all articles
        </Link>
      </div>
    </section>
  )
}

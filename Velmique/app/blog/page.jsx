import Link from 'next/link';
import { ArrowUpRight, Clock, User } from 'lucide-react';
import { blogPosts } from '@/lib/data';
import PageHeader from '@/components/layout/PageHeader';

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Stories & Notes"
        title="THE VELMIQUE"
        accent="JOURNAL"
        intro="Dispatches from the world of perfumery — note essays, maison stories and editorial features."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {/* Featured */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-14">
          <div className="relative h-[60vh] min-h-[420px] overflow-hidden rounded-2xl">
            <img src={featured.image} alt={featured.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/85 via-[var(--ink)]/30 to-transparent" />
            <div className="absolute top-6 left-6">
              <span className="inline-block bg-white text-[var(--ink)] text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 font-body rounded-full">
                {featured.category}
              </span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
              <h2 className="font-display text-white uppercase leading-[0.95] tracking-tight max-w-3xl"
                style={{ fontSize: 'clamp(2rem, 5vw, 4rem)' }}>
                {featured.title}
              </h2>
              <p className="text-white/80 font-body text-base mt-4 max-w-2xl">{featured.excerpt}</p>
              <div className="flex items-center gap-4 text-white/60 text-xs font-body mt-5">
                <span className="flex items-center gap-1.5"><User size={11} /> {featured.author}</span>
                <span>{featured.date}</span>
                <span className="flex items-center gap-1.5"><Clock size={11} /> {featured.readTime} min read</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Rest of posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {rest.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`}
              className="group bg-white border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--gold)] transition-colors">
              <div className="aspect-[4/3] overflow-hidden bg-[var(--surface-2)]">
                <img src={post.image} alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <span className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body">{post.category}</span>
                <h3 className="font-serif italic text-[var(--ink)] text-2xl mt-2 mb-3 group-hover:text-[var(--gold-deep)] transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-[var(--ink-soft)] text-sm font-body leading-relaxed mb-4">{post.excerpt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-[var(--ink-muted)] text-xs font-body">
                    <span>{post.author}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime} min</span>
                  </div>
                  <ArrowUpRight size={16} className="text-[var(--ink-muted)] group-hover:text-[var(--gold-deep)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

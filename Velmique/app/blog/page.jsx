import Link from 'next/link';
import { ArrowRight, Clock, User } from 'lucide-react';
import { blogPosts } from '@/lib/data';

export default function BlogPage() {
  const [featured, ...rest] = blogPosts;

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        {/* Header */}
        <div className="text-center mb-14">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Stories & Style</p>
          <h1 className="font-serif text-5xl text-[#f3ede0]">The Velmique Journal</h1>
          <div className="gold-divider w-24 mx-auto mt-4" />
          <p className="text-[#f3ede0]/40 text-sm font-body mt-4 max-w-md mx-auto">
            Dispatches from the world of luxury fashion — style notes, brand stories, and editorial content.
          </p>
        </div>

        {/* Featured post */}
        <Link href={`/blog/${featured.slug}`} className="group block mb-12">
          <div className="relative h-[50vh] overflow-hidden rounded-sm">
            <img src={featured.image} alt={featured.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-8">
              <span className="inline-block bg-[#b8624f] text-[#f7f2e8] text-[10px] tracking-[0.2em] uppercase px-3 py-1 font-body mb-3">
                {featured.category}
              </span>
              <h2 className="font-serif text-4xl text-[#f7f2e8] mb-3 max-w-2xl group-hover:text-[#d4927f] transition-colors">
                {featured.title}
              </h2>
              <p className="text-[#f7f2e8]/70 font-body text-sm max-w-xl mb-4">{featured.excerpt}</p>
              <div className="flex items-center gap-4 text-[#f7f2e8]/50 text-xs font-body">
                <span className="flex items-center gap-1"><User size={11} /> {featured.author}</span>
                <span>{featured.date}</span>
                <span className="flex items-center gap-1"><Clock size={11} /> {featured.readTime} min read</span>
              </div>
            </div>
          </div>
        </Link>

        {/* Rest of posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {rest.map(post => (
            <Link key={post.id} href={`/blog/${post.slug}`} className="group">
              <div className="aspect-[4/3] overflow-hidden rounded-sm mb-4 bg-[#1d1915]">
                <img src={post.image} alt={post.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              </div>
              <span className="text-[#d4927f]/60 text-[10px] tracking-[0.2em] uppercase font-body">{post.category}</span>
              <h3 className="font-serif text-xl text-[#f3ede0] mt-1 mb-2 group-hover:text-[#d4927f] transition-colors leading-snug">
                {post.title}
              </h3>
              <p className="text-[#f3ede0]/50 text-xs font-body leading-relaxed mb-3">{post.excerpt}</p>
              <div className="flex items-center gap-3 text-[#f3ede0]/30 text-xs font-body">
                <span>{post.author}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Clock size={10} /> {post.readTime} min</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

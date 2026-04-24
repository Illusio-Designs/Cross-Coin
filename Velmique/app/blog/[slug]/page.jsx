'use client';
import { blogPosts } from '@/lib/data';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, User } from 'lucide-react';

export default function BlogPostPage() {
  const params = useParams();
  const post = blogPosts.find(p => p.slug === params.slug) || blogPosts[0];
  const related = blogPosts.filter(p => p.id !== post.id).slice(0, 2);

  const articleContent = `
    <p>In the world of high fashion, clothing is never merely functional — it is a language, a declaration, a carefully constructed expression of who you are and who you wish to become. Velmique was founded on this principle, and it remains the guiding philosophy behind every piece we create.</p>

    <p>The garments we choose have always carried weight beyond fabric. From the ceremonial robes of ancient royalty to the power suits of the modern executive, what we wear communicates before we speak a single word. Understanding this — truly internalizing it — can transform how you move through the world.</p>

    <h2>The Architecture of Presence</h2>

    <p>Think of getting dressed not as a utilitarian act, but as an architectural one. You are constructing a silhouette, a presence, an atmosphere. The Velmique woman understands that proportion matters as much as palette, that texture speaks as eloquently as color, and that fit is the foundation upon which everything else rests.</p>

    <p>Our Evening Collection was designed with this philosophy at its core. Each gown, each blazer, each precisely tailored coat was conceived to do more than clothe — to elevate. The Noir Élégance Gown, for instance, was sketched with one question in mind: what does a woman feel when she walks into a room and knows she owns it?</p>

    <h2>Investment Pieces vs. Trend Pieces</h2>

    <p>A question we hear often: how does one build a wardrobe that is both current and enduring? The answer lies in understanding the difference between investment pieces and trend pieces — and knowing which is which.</p>

    <p>Investment pieces are the backbone: a perfectly cut blazer, a silk blouse of impeccable quality, a coat that will outlast a decade of winters. These are pieces you save for, consider carefully, and wear with the confidence of permanence. Trend pieces have their place too — they keep a wardrobe alive, responsive, of-the-moment. But they should orbit your investment pieces, not replace them.</p>

    <p>At Velmique, we design almost exclusively in the investment space. We believe in creating clothing that grows more meaningful with wear, that develops patina and story, that becomes more yours over time.</p>
  `;

  return (
    <div className="pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        {/* Back */}
        <Link href="/blog" className="flex items-center gap-2 text-[#f3ede0]/40 hover:text-[#d4927f] transition-colors text-xs tracking-wider uppercase font-body mb-10">
          <ArrowLeft size={12} /> Back to Journal
        </Link>

        {/* Article body — full width */}
        <article>
          {/* Meta */}
          <div className="mb-6">
            <span className="inline-block bg-[#b8624f]/10 text-[#d4927f] border border-[#b8624f]/30 text-[10px] tracking-[0.2em] uppercase px-3 py-1 font-body rounded-sm mb-4">
              {post.category}
            </span>
            <h1 className="font-serif text-4xl md:text-5xl text-[#f3ede0] leading-snug mb-4">{post.title}</h1>
            <div className="flex items-center gap-4 text-[#f3ede0]/40 text-xs font-body">
              <span className="flex items-center gap-1.5"><User size={11} className="text-[#d4927f]" /> {post.author}</span>
              <span>{post.date}</span>
              <span className="flex items-center gap-1.5"><Clock size={11} /> {post.readTime} min read</span>
            </div>
          </div>

          {/* Hero image */}
          <div className="aspect-[16/9] overflow-hidden rounded-sm mb-10 bg-[#1d1915]">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          </div>

          {/* Content */}
          <div
            className="prose-velmique text-[#f3ede0]/70 font-body text-sm leading-loose space-y-6"
            dangerouslySetInnerHTML={{ __html: articleContent }}
          />

          {/* Divider */}
          <div className="gold-divider my-12" />

          {/* Author */}
          <div className="flex items-center gap-4 bg-[#1d1915] border border-[#b8624f]/15 rounded-sm p-5">
            <div className="w-14 h-14 rounded-full bg-[#b8624f]/10 border border-[#b8624f]/20 flex items-center justify-center text-[#d4927f] font-serif text-xl">
              {post.author.charAt(0)}
            </div>
            <div>
              <p className="text-[#f3ede0] font-body text-sm">{post.author}</p>
              <p className="text-[#f3ede0]/40 text-xs font-body mt-0.5">Velmique Style Director</p>
            </div>
          </div>
        </article>

        {/* Related — full width of outer container */}
        {related.length > 0 && (
          <div className="mt-20">
            <p className="text-xs tracking-[0.3em] uppercase text-[#f3ede0]/30 font-body mb-6">Continue Reading</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`} className="group">
                  <div className="aspect-[3/2] overflow-hidden rounded-sm mb-3 bg-[#1d1915]">
                    <img src={r.image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <h3 className="font-serif text-base text-[#f3ede0] group-hover:text-[#d4927f] transition-colors leading-snug">{r.title}</h3>
                  <p className="text-[#f3ede0]/40 text-xs font-body mt-1">{r.date}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

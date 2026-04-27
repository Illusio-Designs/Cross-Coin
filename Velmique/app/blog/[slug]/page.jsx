'use client';
import { blogPosts } from '@/lib/data';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock, User, ArrowUpRight } from 'lucide-react';

export default function BlogPostPage() {
  const params = useParams();
  const post = blogPosts.find(p => p.slug === params.slug) || blogPosts[0];
  const related = blogPosts.filter(p => p.id !== post.id).slice(0, 3);

  const articleContent = `
    <p>In the world of fine perfumery, a fragrance is never merely a scent — it is a language, a declaration, a carefully composed expression of who you are and who you wish to become. Velmique was founded on this principle, and it remains the guiding philosophy behind every extrait we create.</p>

    <p>The scents we choose carry weight beyond aroma. From the ceremonial incense of ancient temples to the signature perfumes of modern style icons, what we wear on our skin communicates before we speak a single word.</p>

    <h2>The Architecture of Sillage</h2>

    <p>Think of wearing a fragrance not as a finishing touch, but as an architectural one. You are constructing a presence, an atmosphere, a memory others carry long after you leave the room. The Velmique patron understands that note structure matters as much as concentration, that base accords speak as eloquently as opening citrus, and that skin chemistry is the foundation upon which every formula rests.</p>

    <p>Our Noir collection was designed with this philosophy at its core. Each extrait was conceived to do more than scent — to elevate. Noir Absolu, for instance, was sketched with one question in mind: what does a person feel when they walk into a room and know they own it?</p>

    <h2>Investment Scents vs. Trend Scents</h2>

    <p>A question we hear often: how does one build a fragrance wardrobe that is both current and enduring? The answer lies in understanding the difference between investment scents and trend scents — and knowing which is which.</p>

    <p>Investment scents are the backbone: a perfectly composed extrait, an oud of impeccable quality, a signature that will outlast a decade of changing seasons. These are bottles you save for, consider carefully, and wear with the confidence of permanence.</p>

    <p>At Velmique, we compose almost exclusively in the investment space. We believe in creating fragrances that grow more meaningful with wear, that develop patina and story, that become more yours over time.</p>
  `;

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <div className="max-w-[1100px] mx-auto px-6 md:px-12 lg:px-20 pt-10 pb-24">
        <Link href="/blog"
          className="inline-flex items-center gap-2 text-[var(--ink-muted)] hover:text-[var(--gold-deep)] transition-colors text-[10px] tracking-[0.3em] uppercase font-body mb-10">
          <ArrowLeft size={12} /> Back to Journal
        </Link>

        <article>
          <span className="inline-block bg-[var(--surface-2)] text-[var(--ink)] text-[10px] tracking-[0.3em] uppercase px-3 py-1.5 font-body rounded-full mb-6">
            {post.category}
          </span>
          <h1 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight mb-6"
            style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>
            {post.title}
          </h1>
          <div className="flex items-center gap-5 text-[var(--ink-muted)] text-xs font-body mb-10">
            <span className="flex items-center gap-1.5"><User size={11} className="text-[var(--gold-deep)]" /> {post.author}</span>
            <span>{post.date}</span>
            <span className="flex items-center gap-1.5"><Clock size={11} /> {post.readTime} min read</span>
          </div>

          <div className="aspect-[16/9] overflow-hidden rounded-2xl mb-12 bg-[var(--surface-2)]">
            <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          </div>

          <div
            className="prose-velmique text-[var(--ink-soft)] font-body text-lg leading-loose space-y-6"
            style={{
              ['--prose-h2-color']: 'var(--ink)',
            }}
            dangerouslySetInnerHTML={{ __html: articleContent }}
          />

          <div className="h-px bg-[var(--border)] my-14" />

          <div className="flex items-center gap-5 bg-white border border-[var(--border)] rounded-2xl p-6">
            <div className="w-14 h-14 rounded-full bg-[var(--surface-2)] flex items-center justify-center font-serif italic text-[var(--gold-deep)] text-2xl">
              {post.author.charAt(0)}
            </div>
            <div>
              <p className="font-serif italic text-[var(--ink)] text-lg">{post.author}</p>
              <p className="text-[var(--ink-muted)] text-xs font-body mt-0.5 tracking-[0.15em] uppercase">Velmique Editorial</p>
            </div>
          </div>
        </article>

        {related.length > 0 && (
          <div className="mt-20 pt-14 border-t border-[var(--border)]">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Continue Reading</p>
            <h2 className="font-display text-[var(--ink)] uppercase leading-tight tracking-tight mb-8"
              style={{ fontSize: 'clamp(1.8rem, 4vw, 3rem)' }}>
              MORE FROM THE <em className="not-italic gold-text">JOURNAL</em>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {related.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`}
                  className="group bg-white border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--gold)] transition-colors">
                  <div className="aspect-[3/2] overflow-hidden bg-[var(--surface-2)]">
                    <img src={r.image} alt={r.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  </div>
                  <div className="p-5">
                    <h3 className="font-serif italic text-[var(--ink)] text-lg group-hover:text-[var(--gold-deep)] transition-colors leading-snug">{r.title}</h3>
                    <div className="flex items-center justify-between mt-3">
                      <p className="text-[var(--ink-muted)] text-xs font-body">{r.date}</p>
                      <ArrowUpRight size={14} className="text-[var(--ink-muted)] group-hover:text-[var(--gold-deep)] transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import Head from 'next/head';
import Link from 'next/link';
import BlogCard from '../../components/common/BlogCard';
import { JOURNAL_POSTS, getPost } from '../../data/journal';

/* Journal detail — routed by slug (/journal/<slug>). Full-width layout. */

export default function JournalPost({ post, related }) {
  if (!post) {
    return (
      <div className="wrap section-y text-center">
        <p className="h-display text-3xl mb-3">Post not found</p>
        <Link href="/journal" className="btn-outline inline-flex">Back to The Thread</Link>
      </div>
    );
  }

  const initials = (post.author || 'G').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <Head><title>{post.title} — Gripzus</title></Head>

      <article>
        {/* Title block */}
        <header className="bg-paper-warm border-b border-line">
          <div className="wrap py-14 md:py-20 text-center">
            <p className="eyebrow mb-5">{post.category}</p>
            <h1 className="h-display text-3xl md:text-5xl lg:text-6xl max-w-4xl mx-auto leading-[1.05]">
              {post.title}
            </h1>
            {/* Byline */}
            <div className="flex items-center justify-center gap-3 mt-7">
              <span className="w-10 h-10 rounded-full bg-ink text-paper text-[13px] font-medium flex items-center justify-center">{initials}</span>
              <div className="text-left">
                <p className="text-[14px] text-ink leading-tight">{post.author}</p>
                <p className="text-[12px] text-ink-muted leading-tight">{post.date} · {post.readTime}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Cover — full wrap width */}
        <div className="wrap pt-10 md:pt-14">
          <div className="relative aspect-[16/8] md:aspect-[16/6] overflow-hidden rounded-xl bg-gray-100">
            <img src={post.image} alt={post.title} className="absolute inset-0 w-full h-full object-cover" />
          </div>
        </div>

        {/* Body — readable measure, centered inside the full-width wrap */}
        <div className="wrap py-12 md:py-16">
          <div className="max-w-[680px] mx-auto">
            <p className="h-display text-xl md:text-2xl text-ink leading-snug mb-8">{post.excerpt}</p>
            {post.body.map((para, i) => (
              <p key={i} className="prose-body text-base md:text-lg mb-5">{para}</p>
            ))}
            <div className="mt-10 pt-8 border-t border-line flex items-center justify-between gap-4">
              <Link href="/journal" className="btn-outline inline-flex">← All stories</Link>
              <p className="text-sm text-ink-muted">Written by <span className="text-ink">{post.author}</span></p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="section-y bg-paper-warm border-t border-line">
            <div className="wrap">
              <p className="eyebrow mb-3">Keep reading</p>
              <h2 className="h-display text-2xl md:text-4xl mb-10">More from <span className="h-italic">The Thread.</span></h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-7">
                {related.map((p) => <BlogCard key={p.slug} post={p} />)}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}

export function getStaticPaths() {
  return {
    paths: JOURNAL_POSTS.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export function getStaticProps({ params }) {
  const post = getPost(params.slug);
  const related = JOURNAL_POSTS.filter((p) => p.slug !== params.slug).slice(0, 3);
  return { props: { post, related } };
}

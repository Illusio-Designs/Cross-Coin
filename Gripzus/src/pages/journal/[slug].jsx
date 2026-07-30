import Link from 'next/link';
import BlogCard from '../../components/common/BlogCard';
import SeoWrapper from '../../components/SeoWrapper';
import { JOURNAL_POSTS, getPost as getLocalPost } from '../../data/journal';
import { getPosts, getPostBySlug } from '../../services/blog';

/* Journal detail — routed by slug (/journal/<slug>). Full-width layout.
   Content comes from the blog API; falls back to the local seed data. */

export default function JournalPost({ post, related }) {
  if (!post) {
    return (
      <div className="wrap section-y text-center">
        <p className="h-mark text-3xl md:text-4xl text-ink mb-4">POST NOT FOUND</p>
        <Link href="/journal" className="btn-outline inline-flex">Back to The Thread</Link>
      </div>
    );
  }

  const initials = (post.author || 'G').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SeoWrapper pageName={post.slug || 'blog-details'} seoData={post.seo || null}>
      <article>
        {/* Title block */}
        <header className="bg-ink text-paper border-b-2 border-ink">
          <div className="wrap py-16 md:py-24 text-center">
            <span className="kicker kicker-light mb-6 justify-center inline-flex">{post.category}</span>
            <h1 className="h-mark text-paper text-4xl md:text-6xl lg:text-7xl mt-2">
              {post.title}
            </h1>
            {/* Byline */}
            <div className="flex items-center justify-center gap-3 mt-8">
              <span className="w-10 h-10 bg-paper text-ink text-[13px] font-bold flex items-center justify-center">{initials}</span>
              <div className="text-left">
                <p className="text-[14px] text-paper leading-tight">{post.author}</p>
                <p className="text-[12px] text-paper/55 leading-tight">{post.date} · {post.readTime}</p>
              </div>
            </div>
          </div>
        </header>

        {/* Cover — full wrap width, natural height so the whole image shows */}
        <div className="wrap pt-10 md:pt-14">
          <div className="overflow-hidden border-2 border-ink bg-paper-deep">
            <img src={post.image} alt={post.title} className="w-full h-auto" />
          </div>
        </div>

        {/* Body — readable measure, centered inside the full-width wrap */}
        <div className="wrap py-12 md:py-16">
          <div className="max-w-none mx-auto">
            <p className="h-display text-xl md:text-2xl text-ink leading-snug mb-8 border-l-2 border-ink pl-5">{post.excerpt}</p>
            {post.body.map((block, i) => {
              // Body items are typed blocks ({ type, text }) from the API,
              // or plain strings from the local seed data — handle both.
              const isHeading = typeof block === 'object' && block?.type === 'heading';
              const text = typeof block === 'string' ? block : block?.text || '';
              if (!text) return null;
              return isHeading ? (
                <h2
                  key={i}
                  className="font-display uppercase text-ink text-2xl md:text-3xl leading-tight mt-12 mb-4 first:mt-0"
                  style={{ fontWeight: 800, letterSpacing: '-0.01em' }}
                >
                  {text}
                </h2>
              ) : (
                <p key={i} className="prose-body text-base md:text-lg mb-5">{text}</p>
              );
            })}
            <div className="mt-10 pt-8 border-t-2 border-ink flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <Link href="/journal" className="btn-outline inline-flex">← All stories</Link>
              <p className="text-sm text-ink-muted">Written by <span className="text-ink font-bold">{post.author}</span></p>
            </div>
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <section className="section-y bg-paper-warm border-t-2 border-ink">
            <div className="wrap">
              <span className="kicker mb-4">Keep reading</span>
              <h2 className="h-mark text-ink text-3xl md:text-5xl mb-10 mt-2">MORE FROM THE THREAD.</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 md:gap-7">
                {related.map((p) => <BlogCard key={p.slug} post={p} />)}
              </div>
            </div>
          </section>
        )}
      </article>
    </SeoWrapper>
  );
}

export async function getServerSideProps({ params }) {
  const { slug } = params;

  // Live API first; fall back to the local seed data if the API has nothing.
  let post = await getPostBySlug(slug);
  if (!post) post = getLocalPost(slug);

  let all = await getPosts();
  if (!all || !all.length) all = JOURNAL_POSTS;

  const related = all.filter((p) => p.slug !== slug).slice(0, 3);

  return { props: { post: post || null, related } };
}

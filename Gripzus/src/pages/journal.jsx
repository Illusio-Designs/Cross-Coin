import Head from 'next/head';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import BlogCard from '../components/common/BlogCard';
import { JOURNAL_POSTS } from '../data/journal';
import { getPosts } from '../services/blog';

export default function JournalPage({ posts }) {
  // Use live API posts; fall back to local seed data if the API has none.
  const list = posts && posts.length ? posts : JOURNAL_POSTS;
  const [feature, ...rest] = list;
  const featureInitials = (feature.author || 'G').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <>
      <Head><title>The Thread — Gripzus</title></Head>

      <PageHero
        eyebrow="Notes from the atelier"
        title="The"
        accent="Thread."
        intro="Long-form essays on craft, materials and the people who make a Gripzus pair. Read at your own pace."
      />

      <section className="section-y">
        <div className="wrap">

          {/* Featured */}
          <Link href={`/journal/${feature.slug}`} className="group grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16 md:mb-20">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-gray-100">
              <img src={feature.image} alt={feature.title} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute top-5 left-5 bg-paper/95 text-ink eyebrow px-3 py-1.5 rounded-sm">Featured · {feature.category}</span>
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="h-display text-3xl md:text-5xl mb-5 leading-[1.05]">{feature.title}</h2>
              <p className="prose-body text-base md:text-lg max-w-xl mb-6 text-justify">{feature.excerpt}</p>
              <div className="flex items-center gap-3 mb-7">
                <span className="w-9 h-9 rounded-full bg-ink text-paper text-[12px] font-medium flex items-center justify-center">{featureInitials}</span>
                <div>
                  <p className="text-[14px] text-ink leading-tight">{feature.author}</p>
                  <p className="text-[12px] text-ink-muted leading-tight">{feature.date} · {feature.readTime}</p>
                </div>
              </div>
              <span className="btn-outline w-fit">Read the essay</span>
            </div>
          </Link>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10">
            {rest.map((p) => <BlogCard key={p.slug} post={p} />)}
          </div>
        </div>
      </section>
    </>
  );
}

export async function getServerSideProps() {
  const posts = await getPosts();
  return { props: { posts } };
}

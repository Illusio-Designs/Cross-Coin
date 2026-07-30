import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import BlogCard from '../components/common/BlogCard';
import SeoWrapper from '../components/SeoWrapper';
import { JOURNAL_POSTS } from '../data/journal';
import { getPosts } from '../services/blog';

export default function JournalPage({ posts }) {
  // Use live API posts; fall back to local seed data if the API has none.
  const list = posts && posts.length ? posts : JOURNAL_POSTS;
  const [feature, ...rest] = list;
  const featureInitials = (feature.author || 'G').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <SeoWrapper pageName="blog">
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
            <div className="media-zoom relative aspect-[4/3] overflow-hidden border-2 border-ink bg-paper-deep">
              <img src={feature.image} alt={feature.title} className="absolute inset-0 w-full h-full object-cover" />
              <span className="absolute top-4 left-4 bg-ink text-paper text-[10px] font-bold tracking-[0.16em] uppercase px-3 py-1.5">Featured · {feature.category}</span>
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="h-mark text-ink text-3xl md:text-5xl mb-5 leading-[0.9]">{feature.title}</h2>
              <p className="prose-body text-base md:text-lg max-w-xl mb-6">{feature.excerpt}</p>
              <div className="flex items-center gap-3 mb-7">
                <span className="w-9 h-9 bg-ink text-paper text-[12px] font-bold flex items-center justify-center">{featureInitials}</span>
                <div>
                  <p className="text-[14px] text-ink leading-tight">{feature.author}</p>
                  <p className="text-[12px] text-ink-muted leading-tight">{feature.date} · {feature.readTime}</p>
                </div>
              </div>
              <span className="btn-outline w-fit">Read the essay</span>
            </div>
          </Link>

          {/* Grid */}
          <div className="border-t-2 border-ink pt-12">
            <span className="kicker mb-8 inline-flex">All stories</span>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-10 mt-6">
              {rest.map((p) => <BlogCard key={p.slug} post={p} />)}
            </div>
          </div>
        </div>
      </section>
    </SeoWrapper>
  );
}

export async function getServerSideProps() {
  const posts = await getPosts();
  return { props: { posts } };
}

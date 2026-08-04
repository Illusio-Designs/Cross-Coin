import { useState } from 'react';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';
import BlogCard from '../components/common/BlogCard';
import Pagination from '../components/common/Pagination';
import SeoWrapper from '../components/SeoWrapper';
import { JOURNAL_POSTS } from '../data/journal';
import { getPostsPage } from '../services/blog';

const LIMIT = 12;

export default function JournalPage({ initialPosts = [], initialTotalPages = 1 }) {
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);

  const goToPage = async (n) => {
    if (n < 1 || n > totalPages || n === page || loading) return;
    setLoading(true);
    try {
      const res = await getPostsPage({ page: n, limit: LIMIT });
      setPosts(res.posts);
      setTotalPages(res.totalPages);
      setPage(n);
    } catch {
      /* keep current page on failure */
    } finally {
      setLoading(false);
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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
          <Link href={`/journal/${feature.slug}`} className="group grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 mb-16 md:mb-20 md:items-center">
            <div className="relative overflow-hidden rounded-xl bg-paper-deep self-start">
              <img src={feature.image} alt={feature.title} className="w-full h-auto transition-transform duration-700 group-hover:scale-[1.03]" />
              <span className="absolute top-5 left-5 bg-paper/95 text-ink eyebrow px-3 py-1.5 rounded-sm">Featured · {feature.category}</span>
            </div>
            <div className="flex flex-col justify-center">
              <h2 className="h-display text-3xl md:text-5xl mb-5 leading-[1.05]">{feature.title}</h2>
              <p className="prose-body text-base md:text-lg max-w-xl mb-6">{feature.excerpt}</p>
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

          <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loading} />
        </div>
      </section>
    </SeoWrapper>
  );
}

export async function getServerSideProps() {
  const { posts, totalPages } = await getPostsPage({ page: 1, limit: LIMIT });
  return { props: { initialPosts: posts, initialTotalPages: totalPages } };
}

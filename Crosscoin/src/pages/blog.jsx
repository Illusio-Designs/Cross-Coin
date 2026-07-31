import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import SeoWrapper from '../console/SeoWrapper';
import { getPublicBlogs } from '../services/publicApi';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import { getBlogImageSrc } from '../utils/imageUtils';
import Skeleton from '../components/common/Skeleton';
import Pagination from '../components/common/Pagination';

// Deploy trigger: first build shipped via the fixed GitHub Actions pipeline.
const LIMIT = 12;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

async function fetchJson(url) {
  try {
    const r = await fetch(url, { headers: { 'X-Brand-Name': 'crosscoin' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function getServerSideProps(ctx) {
  // Always serve fresh HTML — the journal updates often and we never want a
  // browser or CDN holding an old copy of this listing.
  ctx.res.setHeader('Cache-Control', 'no-store, max-age=0, must-revalidate');

  // First page rendered on the server so the grid ships in the initial HTML.
  const [seoData, postsJson] = await Promise.all([
    fetchPageSeo('blog', ctx),
    fetchJson(`${API_URL}/api/blogs/listing?page=1&limit=${LIMIT}`),
  ]);

  return {
    props: {
      seoData,
      initialPosts: postsJson?.data || [],
      initialTotalPages: postsJson?.pagination?.totalPages || 1,
    },
  };
}

const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';

const BlogPage = ({ seoData, initialPosts = [], initialTotalPages = 1 }) => {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const seededRef = useRef(initialPosts.length > 0);

  const load = async (nextPage) => {
    setLoading(true);
    try {
      const res = await getPublicBlogs({ page: nextPage, limit: LIMIT });
      setPosts(res?.data || []);
      setTotalPages(res?.pagination?.totalPages || 1);
      setPage(nextPage);
    } catch {
      if (nextPage === 1) setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (seededRef.current) return;
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goToPage = (n) => {
    if (n < 1 || n > totalPages || n === page || loading) return;
    load(n);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <SeoWrapper pageName="blog" seoData={seoData}>
      <div className="blog-page">
        {/* Header */}
        <div className="blog-page-header">
          <div className="section-header-inline">
            <h1 className="section-header-h2">Crosscoin <strong>Journal</strong></h1>
            <p className="section-header-sub">Stories, Tips & Style</p>
          </div>
        </div>

        {/* Blog Grid */}
        {loading && posts.length === 0 ? (
          <div className="blog-page-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="blog-card-home">
                <div className="bc-img-wrap"><Skeleton height={200} /></div>
                <div className="bc-body" style={{ display: 'grid', gap: 10, padding: 16 }}>
                  <Skeleton type="text" width="90%" height="20px" />
                  <Skeleton type="text" width="100%" height="14px" />
                  <Skeleton type="text" width="60%" height="14px" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="blog-page-grid">
            {posts.map((post) => {
              let sections = post.sections || [];
              if (typeof sections === 'string') {
                try { sections = JSON.parse(sections); } catch { sections = []; }
              }
              const preview = sections[0]?.content ? stripHtml(sections[0].content) : '';

              return (
              <div
                key={post.id}
                className="blog-card-home"
                onClick={() => router.push(`/blog/${post.slug}`)}
              >
                <div className="bc-img-wrap">
                  {post.hero_image
                    ? <img src={getBlogImageSrc(post.hero_image, { w: 800, h: 450, q: 70 })} alt={post.title} loading="lazy" />
                    : <div style={{ background: '#f3f4f6', width: '100%', height: '100%', minHeight: 180 }} />
                  }
                  <div className="bc-badge">
                    <span className="bc-badge-dot" />
                    {post.BlogCategory?.name || 'Blog'}
                  </div>
                </div>
                <div className="bc-body">
                  <h3 className="bc-title">{post.title}</h3>
                  {preview && (
                    <p className="bc-desc">{preview.slice(0, 120)}{preview.length > 120 ? '...' : ''}</p>
                  )}
                  <div className="bc-meta">
                    <div className="bc-meta-item">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                      </svg>
                      {formatDate(post.published_at)}
                    </div>
                    {post.author_name && (
                      <div className="bc-meta-item bc-meta-diff">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                        </svg>
                        {post.author_name}
                      </div>
                    )}
                  </div>
                  <button className="bc-btn">
                    <div className="bc-btn-inner">
                      <div className="bc-btn-icon">
                        <svg viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"/></svg>
                      </div>
                      Read Article
                    </div>
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {posts.length === 0 && !loading && (
          <div className="blog-no-results"><p>No articles found.</p></div>
        )}

        <Pagination page={page} totalPages={totalPages} onChange={goToPage} disabled={loading} />
      </div>
    </SeoWrapper>
  );
};

export default BlogPage;

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import SeoWrapper from '../console/SeoWrapper';
import { getPublicBlogs, getPublicBlogTags } from '../services/publicApi';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import { getBlogImageSrc } from '../utils/imageUtils';

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
  // Fetch the first page of posts + tags on the server so the blog grid ships
  // in the initial HTML instead of after a client-side useEffect. The edge
  // cache header set by fetchPageSeo keeps repeat requests cheap.
  const [seoData, postsJson, tagsJson] = await Promise.all([
    fetchPageSeo('blog', ctx),
    fetchJson(`${API_URL}/api/blogs/listing?page=1&limit=${LIMIT}`),
    fetchJson(`${API_URL}/api/blogs/tags`),
  ]);

  const initialPosts = postsJson?.data || [];
  const initialTags = tagsJson?.data || [];

  return {
    props: {
      seoData,
      initialPosts,
      initialTags,
      initialHasMore: initialPosts.length === LIMIT,
    },
  };
}

const stripHtml = (html) => html ? html.replace(/<[^>]*>/g, '') : '';

const BlogPage = ({ seoData, initialPosts = [], initialTags = [], initialHasMore = false }) => {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [tags, setTags] = useState(initialTags);
  const [activeCategory, setActiveCategory] = useState('all');
  const [activeTag, setActiveTag] = useState('');
  const [loading, setLoading] = useState(initialPosts.length === 0);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(initialHasMore);

  // The first page + tags are seeded from getServerSideProps, so only run the
  // client fetch as a fallback when the server didn't provide them.
  const seededRef = useRef(initialPosts.length > 0);

  useEffect(() => {
    if (seededRef.current) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        const [postsRes, tagsRes] = await Promise.all([
          getPublicBlogs({ page: 1, limit: LIMIT }),
          getPublicBlogTags(),
        ]);
        const list = postsRes?.data || [];
        setPosts(list);
        setHasMore(list.length === LIMIT);
        setTags(tagsRes?.data || []);
      } catch {
        setPosts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const applyFilter = async (category, tag, nextPage = 1) => {
    setLoading(true);
    try {
      const params = { page: nextPage, limit: LIMIT };
      if (category && category !== 'all') params.category = category;
      if (tag) params.tag = tag;
      const res = await getPublicBlogs(params);
      const list = res?.data || [];
      if (nextPage === 1) setPosts(list);
      else setPosts(prev => [...prev, ...list]);
      setHasMore(list.length === LIMIT);
      setPage(nextPage);
    } catch {
      if (nextPage === 1) setPosts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryChange = (cat) => {
    setActiveCategory(cat);
    setActiveTag('');
    applyFilter(cat, '', 1);
  };

  const handleTagChange = (tag) => {
    const next = activeTag === tag ? '' : tag;
    setActiveTag(next);
    applyFilter(activeCategory, next, 1);
  };

  const handleLoadMore = () => applyFilter(activeCategory, activeTag, page + 1);

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // Unique categories from posts
  const categories = ['all', ...Array.from(new Set(posts.map(p => p.BlogCategory?.slug).filter(Boolean)))];

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

        {/* Category Filter */}
        <div className="blog-category-filter">
          {categories.map(cat => (
            <button
              key={cat}
              className={`filter-btn ${activeCategory === cat ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
            >
              {cat === 'all' ? 'All Articles' : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Blog Grid */}
        {loading && posts.length === 0 ? (
          <div className="blog-no-results"><p>Loading articles...</p></div>
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
                onClick={() => router.push(`/blog-details?slug=${post.slug}`)}
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

        {hasMore && (
          <div style={{ textAlign: 'center', marginTop: 32 }}>
            <button className="view-all-btn-home" onClick={handleLoadMore} disabled={loading}>
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </SeoWrapper>
  );
};

export default BlogPage;

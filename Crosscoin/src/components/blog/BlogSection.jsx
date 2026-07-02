import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getPublicBlogs } from '../../services/publicApi';
import { getBlogImageSrc } from '../../utils/imageUtils';

const stripHtml = (html) => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

const BlogSection = () => {
  const router = useRouter();
  const [blogs, setBlogs] = useState([]);

  useEffect(() => {
    getPublicBlogs({ page: 1, limit: 4 })
      .then(res => setBlogs(res?.data || []))
      .catch(() => setBlogs([]));
  }, []);

  if (!blogs.length) return null;

  return (
    <div className="blog-section-wrapper">
      <div className="blog-section-header">
        <div className="section-header-inline">
          <h2 className="section-header-h2">Crosscoin <strong>Journal</strong></h2>
          <p className="section-header-sub">Stories, Tips & Style</p>
        </div>
      </div>

      <div className="blog-grid-home">
        {blogs.map((post) => {
          // sections may come as JSON string
          let sections = post.sections || [];
          if (typeof sections === 'string') {
            try { sections = JSON.parse(sections); } catch { sections = []; }
          }
          const preview = sections[0]?.content ? stripHtml(sections[0].content) : '';
          const tags = post.Tags || post.BlogTags || [];

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
                  <p className="bc-desc">
                    {preview.slice(0, 100)}{preview.length > 100 ? '...' : ''}
                  </p>
                )}

                <div className="bc-meta">
                  <div className="bc-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {post.BlogCategory?.name || 'Lifestyle'}
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

                <div className="bc-tags">
                  {tags.slice(0, 3).map(t => (
                    <span key={t.id} className="bc-tag">{t.name}</span>
                  ))}
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

      <div className="blog-view-all-home">
        <button className="view-all-btn-home" onClick={() => router.push('/blog')}>
          View All Articles
        </button>
      </div>
    </div>
  );
};

export default BlogSection;

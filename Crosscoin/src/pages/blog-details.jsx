import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SeoWrapper from '../console/SeoWrapper';
import BlogSection from '../components/blog/BlogSection';
import { getPublicBlogBySlug } from '../services/publicApi';

const BlogDetails = () => {
  const router = useRouter();
  const { slug } = router.query;
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [activeSection, setActiveSection] = useState(0);

  useEffect(() => {
    if (!slug) return;
    const fetch = async () => {
      setLoading(true);
      setNotFound(false);
      try {
        const res = await getPublicBlogBySlug(slug);
        setPost(res?.post || res);
      } catch (e) {
        if (e?.status === 404 || e?.statusCode === 404) setNotFound(true);
        else setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [slug]);

  useEffect(() => {
    if (!post?.sections?.length) return;
    const handleScroll = () => {
      post.sections.forEach((_, i) => {
        const el = document.getElementById(`section-${i}`);
        if (el && el.getBoundingClientRect().top < 160) setActiveSection(i);
      });
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post]);

  const scrollToSection = (i) => {
    const el = document.getElementById(`section-${i}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'mini-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2500);
  };

  const handleShare = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(window.location.href);
    showToast('🔗 Link copied to clipboard!');
  };

  const handleBookmark = () => {
    setIsBookmarked(b => !b);
    showToast(isBookmarked ? 'Removed from saved' : '🔖 Article saved!');
  };

  const formatDate = (d) => {
    if (!d) return '';
    return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <SeoWrapper pageName="blog-details">
        <div className="blog-details-page" style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
          <p>Loading article...</p>
        </div>
      </SeoWrapper>
    );
  }

  if (notFound || !post) {
    return (
      <SeoWrapper pageName="blog-details">
        <div className="blog-details-page" style={{ textAlign: 'center', padding: 80 }}>
          <h2>Article not found</h2>
          <button className="back-btn" onClick={() => router.push('/blog')}>← Back to Blog</button>
        </div>
      </SeoWrapper>
    );
  }

  const sections = Array.isArray(post.sections) ? post.sections : [];
  const tags = (post.BlogTags || []).map(t => `#${t.name}`);
  const seo = post.BlogSEO || {};

  return (
    <SeoWrapper pageName="blog-details">
      <div className="blog-details-page">

        {/* Top Bar */}
        <div className="top-bar">
          <button className="back-btn" onClick={() => router.push('/blog')}>
            <svg viewBox="0 0 24 24" fill="none"><polyline points="15 18 9 12 15 6" /></svg>
            Back to Blog
          </button>
          <div className="top-bar-actions">
            <button className="share-btn" onClick={handleShare}>
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/>
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/>
              </svg>
              Share
            </button>
            <button className={`bookmark-btn ${isBookmarked ? 'saved' : ''}`} onClick={handleBookmark}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="article-hero">
          {post.hero_image && <img src={post.hero_image} alt={post.title} />}
          <div className="article-hero-overlay" />
          <div className="article-hero-content">
            {post.BlogCategory && <div className="article-cat-tag">{post.BlogCategory.name}</div>}
            <h1 className="article-hero-title">{post.title}</h1>
          </div>
        </div>

        {/* Meta Bar */}
        <div className="article-meta-bar">
          <div className="meta-left">
            {post.author_name && (
              <div className="author-block">
                <div className="author-avatar">{post.author_name.charAt(0).toUpperCase()}</div>
                <div>
                  <div className="author-info-name">{post.author_name}</div>
                </div>
              </div>
            )}
            {post.author_name && <div className="meta-divider" />}
            <div className="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              {formatDate(post.published_at)}
            </div>
          </div>
        </div>

        {/* Article Layout */}
        <div className="article-layout">
          <article className="article-body" id="articleBody">

            {/* Sections */}
            {sections.map((sec, i) => (
              <div key={i} id={`section-${i}`}>
                {sec.heading && <h2>{sec.heading}</h2>}
                {sec.content && <p>{sec.content}</p>}
                {/* Sub-sections */}
                {Array.isArray(sec.sub_sections) && sec.sub_sections.map((sub, j) => (
                  <div key={j} className="tip-box" style={{ marginBottom: 12 }}>
                    {sub.type && <h3>{sub.type}</h3>}
                    {sub.description && <p>{sub.description}</p>}
                    {sub.quick_tip && <p><strong>Tip:</strong> {sub.quick_tip}</p>}
                  </div>
                ))}
                {sec.color_tip && <div className="tip-box"><p><strong>Color tip:</strong> {sec.color_tip}</p></div>}
                {sec.longevity_hack && <div className="tip-box"><p><strong>Hack:</strong> {sec.longevity_hack}</p></div>}
              </div>
            ))}

            {/* Featured Products */}
            {(post.FeaturedProducts || []).length > 0 && (
              <div style={{ marginTop: 32 }}>
                <h2>Featured Products</h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
                  {(post.FeaturedProducts || []).map((fp) => (
                    <div key={fp.id} className="product-spotlight" style={{ flex: '1 1 220px' }}>
                      {fp.hero_image && (
                        <div className="product-spotlight-img">
                          <img src={fp.hero_image} alt={fp.name} />
                        </div>
                      )}
                      <div className="product-spotlight-info">
                        {fp.BlogFeaturedProduct?.lifestyle_tag && (
                          <div className="ps-label">{fp.BlogFeaturedProduct.lifestyle_tag}</div>
                        )}
                        <div className="ps-name">{fp.name}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div className="article-tags">
                {tags.map((tag, idx) => <span key={idx} className="article-tag">{tag}</span>)}
              </div>
            )}

            {/* Share */}
            <div className="share-row">
              <span className="share-label">Share</span>
              <div className="share-icon" title="Copy Link" onClick={handleShare}>🔗</div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="article-sidebar">
            {/* Table of Contents */}
            {sections.length > 0 && (
              <div className="toc">
                <div className="toc-title">In This Article</div>
                <ul className="toc-list">
                  {sections.map((sec, idx) => sec.heading && (
                    <li
                      key={idx}
                      className={`toc-item ${activeSection === idx ? 'active' : ''}`}
                      onClick={() => scrollToSection(idx)}
                    >
                      {sec.heading}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* SEO canonical / og info used for meta — sidebar newsletter */}
            <div className="sidebar-nl">
              <div className="snl-label">Newsletter</div>
              <div className="snl-title">Style tips, weekly.</div>
              <div className="snl-sub">No spam. Just comfort stories delivered to your inbox.</div>
              <input className="snl-input" type="email" placeholder="Your email" />
              <button className="snl-btn">Subscribe</button>
            </div>
          </aside>
        </div>

        {/* Related Articles */}
        <BlogSection />
      </div>
    </SeoWrapper>
  );
};

export default BlogDetails;

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import SeoWrapper from '../console/SeoWrapper';

const BlogPage = () => {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');

  const blogs = [
    {
      id: 1,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Essentials Outfit Ideas for Men to Up Their Style Game',
      excerpt: 'Discover timeless outfit combinations that work for every occasion and season.',
      date: '28 Nov, 2025',
      readTime: '5 min read',
      author: 'Arjun M.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 2,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Redefine Your Style with Trunks from Jockey',
      excerpt: 'Explore the perfect blend of comfort and style with our latest trunk collection.',
      date: '23 Nov, 2025',
      readTime: '4 min read',
      author: 'Meera S.',
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
    {
      id: 3,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Redefine Luxury with these man\'s briefs',
      excerpt: 'Experience premium comfort with our luxury brief collection designed for modern men.',
      date: '29 Jun, 2025',
      readTime: '6 min read',
      author: 'Priya K.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640',
    },
    {
      id: 4,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Wear your cap with confidence',
      excerpt: 'Style tips and tricks to wear caps that complement your personal aesthetic.',
      date: '19 Mar, 2025',
      readTime: '3 min read',
      author: 'Vikram T.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 5,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Winter Essentials: Building Your Perfect Wardrobe',
      excerpt: 'A complete guide to creating a versatile winter wardrobe with essential pieces.',
      date: '15 Mar, 2025',
      readTime: '7 min read',
      author: 'Sophia L.',
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
    {
      id: 6,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Sustainable Fashion: Making Conscious Choices',
      excerpt: 'Learn how to build a sustainable wardrobe without compromising on style.',
      date: '10 Mar, 2025',
      readTime: '5 min read',
      author: 'Emma R.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640',
    },
    {
      id: 7,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Travel in Style: Packing Tips for Every Journey',
      excerpt: 'Master the art of packing with our comprehensive travel wardrobe guide.',
      date: '05 Mar, 2025',
      readTime: '6 min read',
      author: 'James K.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 8,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Color Theory: Choosing Colors That Suit You',
      excerpt: 'Discover which colors complement your skin tone and personal style best.',
      date: '28 Feb, 2025',
      readTime: '4 min read',
      author: 'Nina P.',
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
  ];

  const filteredBlogs = activeCategory === 'all' 
    ? blogs 
    : blogs.filter(blog => blog.cat === activeCategory);

  const handleBlogClick = (blogId) => {
    router.push(`/blog-details?id=${blogId}`);
  };

  return (
    <SeoWrapper pageName="blog">
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
          <button 
            className={`filter-btn ${activeCategory === 'all' ? 'active' : ''}`}
            onClick={() => setActiveCategory('all')}
          >
            All Articles
          </button>
          <button 
            className={`filter-btn ${activeCategory === 'lifestyle' ? 'active' : ''}`}
            onClick={() => setActiveCategory('lifestyle')}
          >
            Lifestyle
          </button>
          <button 
            className={`filter-btn ${activeCategory === 'fashion' ? 'active' : ''}`}
            onClick={() => setActiveCategory('fashion')}
          >
            Fashion
          </button>
        </div>

        {/* Blog Grid */}
        <div className="blog-page-grid">
          {filteredBlogs.map((blog) => (
            <div
              key={blog.id}
              className="blog-card-home"
              onClick={() => handleBlogClick(blog.id)}
            >
              {/* Image */}
              <div className="bc-img-wrap">
                <img src={blog.img} alt={blog.title} loading="lazy" />
                <div className="bc-badge">
                  <span className="bc-badge-dot" />
                  {blog.catLabel}
                </div>
              </div>

              {/* Body */}
              <div className="bc-body">
                <h3 className="bc-title">{blog.title}</h3>
                <p className="bc-desc">{blog.excerpt}</p>

                {/* Meta */}
                <div className="bc-meta">
                  <div className="bc-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                    {blog.readTime}
                  </div>
                  <div className="bc-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                    </svg>
                    {blog.date}
                  </div>
                  <div className="bc-meta-item bc-meta-diff">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    </svg>
                    {blog.author}
                  </div>
                </div>

                {/* Tags */}
                <div className="bc-tags">
                  <span className="bc-tag">{blog.catLabel}</span>
                  <span className="bc-tag">Fashion</span>
                  <span className="bc-tag">+2</span>
                </div>

                {/* CTA */}
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
          ))}
        </div>

        {/* No Results */}
        {filteredBlogs.length === 0 && (
          <div className="blog-no-results">
            <p>No articles found in this category.</p>
          </div>
        )}
      </div>
    </SeoWrapper>
  );
};

export default BlogPage;

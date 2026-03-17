import React, { useState } from 'react';
import Link from 'next/link';

const BlogSection = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const blogs = [
    {
      id: 1,
      featured: true,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'How to Pick the Best Winter Sweatshirts for Women Based on Your Lifestyle',
      excerpt: 'From cosy WFH days to weekend outdoor escapes — find out which sweatshirt fabric and fit works best for every occasion.',
      date: '01 Dec, 2025',
      readTime: '5 min read',
      author: 'Priya K.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 2,
      cat: 'woman',
      catLabel: 'Woman',
      title: "Why Jockey's Winter Jackets for Women Are a Must-Have",
      excerpt: 'Explore the collection that blends warmth, style and all-day wearability — perfect for the modern Indian woman.',
      date: '26 Nov, 2025',
      readTime: '4 min read',
      author: 'Meera S.',
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
    {
      id: 3,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Winter Sweatshirts for Men That Make Travel Effortless',
      excerpt: 'Carry-anywhere comfort and style that holds up whether you\'re at the airport or on a mountain trail.',
      date: '17 Nov, 2025',
      readTime: '6 min read',
      author: 'Arjun M.',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640',
    },
  ];

  const filteredBlogs = activeCategory === 'all' 
    ? blogs 
    : blogs.filter(blog => blog.cat === activeCategory);

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
  };

  const getInitials = (name) => {
    return name.split(' ').map(w => w[0]).join('');
  };

  return (
    <div className="blog-section-wrapper">
      <div className="blog-section-header">
        <div className="section-label">From Our Blog</div>
        <div className="section-title">Stories, Tips & Style</div>
      </div>

      <div className="cat-nav-blog">
        <div 
          className={`cat-link-blog ${activeCategory === 'all' ? 'active' : ''}`}
          onClick={() => handleCategoryClick('all')}
        >
          All
        </div>
        <div 
          className={`cat-link-blog ${activeCategory === 'lifestyle' ? 'active' : ''}`}
          onClick={() => handleCategoryClick('lifestyle')}
        >
          Lifestyle
        </div>
        <div 
          className={`cat-link-blog ${activeCategory === 'woman' ? 'active' : ''}`}
          onClick={() => handleCategoryClick('woman')}
        >
          Woman
        </div>
        <div 
          className={`cat-link-blog ${activeCategory === 'fashion' ? 'active' : ''}`}
          onClick={() => handleCategoryClick('fashion')}
        >
          Fashion
        </div>
      </div>

      <div className="blog-grid-home">
        {filteredBlogs.map((blog, index) => {
          const isFeatured = blog.featured && activeCategory === 'all' && index === 0;
          const initials = getInitials(blog.author);

          return (
            <div 
              key={blog.id} 
              className={`blog-card-home ${isFeatured ? 'featured' : ''}`}
            >
              <div className="blog-card-img-home">
                <img src={blog.img} alt={blog.title} loading="lazy" />
                <div className={`blog-card-cat-home cat-${blog.cat}`}>
                  {blog.catLabel}
                </div>
              </div>
              <div className="blog-card-meta-home">
                <span className="blog-card-date-home">{blog.date}</span>
                <div className="meta-dot-home"></div>
                <span className="blog-card-readtime-home">{blog.readTime}</span>
              </div>
              <div className="blog-card-title-home">{blog.title}</div>
              <div className="blog-card-excerpt-home">{blog.excerpt}</div>
              <div className="blog-card-footer-home">
                <div className="blog-author-home">
                  <div className="author-avatar-home">{initials}</div>
                  <div className="author-name-home">{blog.author}</div>
                </div>
                <div className="read-link-home">
                  Read Story
                  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6"/>
                  </svg>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="blog-view-all">
        <Link href="/blog">
          <button className="view-all-btn">
            View All Articles
            <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </Link>
      </div>
    </div>
  );
};

export default BlogSection;

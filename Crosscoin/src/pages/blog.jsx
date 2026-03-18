import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
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
              className="blog-page-card"
              onClick={() => handleBlogClick(blog.id)}
            >
              <div className="blog-page-card-img">
                <img src={blog.img} alt={blog.title} loading="lazy" />
              </div>
              <div className="blog-page-card-content">
                <div className="blog-page-card-meta">
                  <span className="blog-page-card-date">{blog.date}</span>
                  <span className="blog-page-card-readtime">{blog.readTime}</span>
                </div>
                <h3 className="blog-page-card-title">{blog.title}</h3>
                <p className="blog-page-card-excerpt">{blog.excerpt}</p>
                <div className="blog-page-card-footer">
                  <div className="blog-page-card-author">
                    <div className="author-avatar">{blog.author.split(' ').map(w => w[0]).join('')}</div>
                    <span className="author-name">{blog.author}</span>
                  </div>
                  <div className="read-more-link">
                    Read More
                    <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </div>
                </div>
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

import React, { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

const BlogSection = () => {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState('all');

  const blogs = [
    {
      id: 1,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Essentials Outfit Ideas for Men to Up Their Style Game',
      excerpt: 'Discover the perfect combination of comfort and style with our essential outfit ideas for men.',
      date: '28 Nov, 2025',
      readTime: '5 min read',
      category: 'Style Tips',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 2,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Redefine Your Style with Trunks from Jockey',
      excerpt: 'Explore how premium trunks can elevate your everyday wardrobe and comfort level.',
      date: '23 Nov, 2025',
      readTime: '4 min read',
      category: 'Fashion',
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
    {
      id: 3,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Redefine Luxury with these man\'s briefs',
      excerpt: 'Experience ultimate comfort and luxury with our premium collection of men\'s briefs.',
      date: '29 Jun, 2025',
      readTime: '6 min read',
      category: 'Comfort',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640',
    },
    {
      id: 4,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Wear your cap with confidence',
      excerpt: 'Learn how to style your cap with different outfits and occasions for maximum impact.',
      date: '19 Mar, 2025',
      readTime: '3 min read',
      category: 'Styling',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
  ];

  const filteredBlogs = activeCategory === 'all' 
    ? blogs 
    : blogs.filter(blog => blog.cat === activeCategory);

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
  };

  const handleBlogClick = (blogId) => {
    router.push(`/blog-details?id=${blogId}`);
  };

  return (
    <div className="blog-section-wrapper">
      <div className="blog-section-header">
        <div className="section-header-inline">
          <h2 className="section-header-h2">Crosscoin <strong>Journal</strong></h2>
          <p className="section-header-sub">Stories, Tips & Style</p>
        </div>
      </div>

      <div className="blog-grid-home">
        {filteredBlogs.map((blog) => {
          return (
            <div 
              key={blog.id} 
              className="blog-card-home"
              onClick={() => handleBlogClick(blog.id)}
            >
              <div className="blog-card-img-home">
                <img src={blog.img} alt={blog.title} loading="lazy" />
                <span className="blog-card-category-badge">{blog.category}</span>
              </div>
              <div className="blog-card-content-home">
                <h3 className="blog-card-title-home">{blog.title}</h3>
                <p className="blog-card-excerpt-home">{blog.excerpt}</p>
                
                <div className="blog-card-meta">
                  <div className="blog-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10"></circle>
                      <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    <span>{blog.readTime}</span>
                  </div>
                  <div className="blog-meta-item">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    </svg>
                    <span>{blog.date}</span>
                  </div>
                </div>

                <button className="blog-card-btn">Read Article</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="blog-pagination">
        <div className="pagination-dot active"></div>
        <div className="pagination-dot"></div>
        <div className="pagination-dot"></div>
      </div>

      <div className="blog-view-all-home">
        <button 
          className="view-all-btn-home"
          onClick={() => router.push('/blog')}
        >
          View All Articles
          <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <polyline points="9 18 15 12 9 6"/>
          </svg>
        </button>
      </div>
    </div>
  );
};

export default BlogSection;

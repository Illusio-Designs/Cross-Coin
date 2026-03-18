import React, { useState } from 'react';
import Link from 'next/link';

const BlogSection = () => {
  const [activeCategory, setActiveCategory] = useState('all');

  const blogs = [
    {
      id: 1,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Essentials Outfit Ideas for Men to Up Their Style Game',
      date: '28 Nov, 2025',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 2,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Redefine Your Style with Trunks from Jockey',
      date: '23 Nov, 2025',
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
    {
      id: 3,
      cat: 'lifestyle',
      catLabel: 'Lifestyle',
      title: 'Redefine Luxury with these man\'s briefs',
      date: '29 Jun, 2025',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640',
    },
    {
      id: 4,
      cat: 'fashion',
      catLabel: 'Fashion',
      title: 'Wear your cap with cos',
      date: '19 Mar, 2025',
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
  ];

  const filteredBlogs = activeCategory === 'all' 
    ? blogs 
    : blogs.filter(blog => blog.cat === activeCategory);

  const handleCategoryClick = (category) => {
    setActiveCategory(category);
  };

  return (
    <div className="blog-section-wrapper">
      <div className="blog-section-header">
        <div className="section-title">CROSSCOIN JOURNAL</div>
      </div>

      <div className="blog-grid-home">
        {filteredBlogs.map((blog) => {
          return (
            <div 
              key={blog.id} 
              className="blog-card-home"
            >
              <div className="blog-card-img-home">
                <img src={blog.img} alt={blog.title} loading="lazy" />
              </div>
              <div className="blog-card-content-home">
                <div className="blog-card-title-home">{blog.title}</div>
                <div className="blog-card-date-home">{blog.date}</div>
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
    </div>
  );
};

export default BlogSection;

import React from 'react';
import { useRouter } from 'next/router';

const BlogSection = () => {
  const router = useRouter();

  const blogs = [
    {
      id: 1,
      badge: 'Style Tips',
      title: 'Essentials Outfit Ideas for Men to Up Their Style Game',
      desc: 'Discover the perfect combination of comfort and style with our essential outfit ideas for everyday wear.',
      readTime: '5 mins',
      category: 'Lifestyle',
      difficulty: 'Beginner',
      tags: ['Comfort', 'Style', '+3'],
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
    {
      id: 2,
      badge: 'Fashion',
      title: 'Redefine Your Style with Premium Innerwear',
      desc: 'Explore how premium innerwear can elevate your everyday wardrobe and comfort level significantly.',
      readTime: '4 mins',
      category: 'Fashion',
      difficulty: 'Easy',
      tags: ['Premium', 'Comfort', '+5'],
      img: 'https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640',
    },
    {
      id: 3,
      badge: 'Trending',
      title: 'Redefine Luxury with Premium Men\'s Collection',
      desc: 'Experience ultimate comfort and luxury with our premium collection crafted for the modern man.',
      readTime: '6 mins',
      category: 'Lifestyle',
      difficulty: 'Medium',
      tags: ['Luxury', 'Men', '+4'],
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640',
    },
    {
      id: 4,
      badge: 'New',
      title: 'Wear Your Confidence with Every Step',
      desc: 'Learn how to style your outfits with different occasions for maximum impact and confidence.',
      readTime: '3 mins',
      category: 'Styling',
      difficulty: 'Easy',
      tags: ['Styling', 'Tips', '+6'],
      img: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=640',
    },
  ];

  return (
    <div className="blog-section-wrapper">
      <div className="blog-section-header">
        <div className="section-header-inline">
          <h2 className="section-header-h2">Crosscoin <strong>Journal</strong></h2>
          <p className="section-header-sub">Stories, Tips & Style</p>
        </div>
      </div>

      <div className="blog-grid-home">
        {blogs.map((blog) => (
          <div key={blog.id} className="blog-card-home" onClick={() => router.push(`/blog-details?id=${blog.id}`)}>

            {/* Image */}
            <div className="bc-img-wrap">
              <img src={blog.img} alt={blog.title} loading="lazy" />
              <div className="bc-badge">
                <span className="bc-badge-dot" />
                {blog.badge}
              </div>
            </div>

            {/* Body */}
            <div className="bc-body">
              <h3 className="bc-title">{blog.title}</h3>
              <p className="bc-desc">{blog.desc}</p>

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
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                  </svg>
                  {blog.category}
                </div>
                <div className="bc-meta-item bc-meta-diff">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2c0 0-3 5-3 9a3 3 0 0 0 6 0c0-4-3-9-3-9z"/>
                    <path d="M6 14c0 3.31 2.69 6 6 6s6-2.69 6-6"/>
                  </svg>
                  {blog.difficulty}
                </div>
              </div>

              {/* Tags */}
              <div className="bc-tags">
                {blog.tags.map((tag, i) => (
                  <span key={i} className="bc-tag">{tag}</span>
                ))}
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

      <div className="blog-view-all-home">
        <button className="view-all-btn-home" onClick={() => router.push('/blog')}>
          View All Articles
        </button>
      </div>
    </div>
  );
};

export default BlogSection;

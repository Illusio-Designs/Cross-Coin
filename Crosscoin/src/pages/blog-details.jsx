import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import SeoWrapper from '../console/SeoWrapper';

const BlogDetails = () => {
  const router = useRouter();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [readingProgress, setReadingProgress] = useState(0);
  const [activeSection, setActiveSection] = useState(0);

  const blog = {
    id: 1,
    cat: 'lifestyle',
    catLabel: 'Lifestyle',
    title: 'How to Pick the Best Winter Sweatshirts for Women Based on Your Lifestyle',
    date: '01 Dec, 2025',
    readTime: '5 min read',
    views: '2.4k',
    likes: 142,
    author: {
      name: 'Priya Kapoor',
      role: 'Fashion & Lifestyle Writer',
      initials: 'PK'
    },
    heroImage: 'https://www.jockey.in/cdn/shop/articles/M9Blog_How-to-Pick-the-Best-Winter-Sweatshirts-for-Women-Based-on-Your-Lifestyle_Reviewed_4081424e-c8c8-4bcd-90e5-0fabbc269f43.jpg?v=1773211517&width=1440',
    tags: ['#WinterWear', '#Sweatshirts', '#WomenFashion', '#Lifestyle']
  };

  const sections = [
    { id: 's1', title: 'Why Lifestyle Drives Your Choice' },
    { id: 's2', title: 'Fabrics: The Foundation' },
    { id: 's3', title: 'Fit Matters' },
    { id: 's4', title: 'Lifestyle Recommendations' },
    { id: 's5', title: 'Care Tips' }
  ];

  return (
    <SeoWrapper pageName="blog-details">
      <div className="blog-details-page">
        {/* Reading Progress */}
        <div className="reading-progress">
          <div className="reading-progress-fill" style={{ width: `${readingProgress}%` }}></div>
        </div>

        {/* Top Bar */}
        <div className="top-bar-blog">
          <button className="back-btn-blog" onClick={() => router.push('/blog')}>
            <svg viewBox="0 0 24 24" fill="none">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Blog
          </button>
          <div className="top-bar-actions-blog">
            <button className="share-btn-blog">
              <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="18" cy="5" r="3" />
                <circle cx="6" cy="12" r="3" />
                <circle cx="18" cy="19" r="3" />
                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
              </svg>
              Share
            </button>
            <button 
              className={`bookmark-btn-blog ${isBookmarked ? 'saved' : ''}`}
              onClick={() => setIsBookmarked(!isBookmarked)}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="article-hero-blog">
          <img src={blog.heroImage} alt={blog.title} />
          <div className="article-hero-overlay-blog"></div>
          <div className="article-hero-content-blog">
            <div className="article-cat-tag-blog">{blog.catLabel}</div>
            <h1 className="article-hero-title-blog">{blog.title}</h1>
          </div>
        </div>

        <p>Blog content will be rendered here</p>
      </div>
    </SeoWrapper>
  );
};

export default BlogDetails;

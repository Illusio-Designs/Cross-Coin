import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import SeoWrapper from '../console/SeoWrapper';
import '../styles/blog-details.css';

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
    tags: ['#WinterWear', '#Sweatshirts', '#WomenFashion', '#Lifestyle', '#ComfortClothing', '#WinterStyle']
  };

  const sections = [
    { id: 's1', title: 'Why Your Lifestyle Should Drive Your Choice' },
    { id: 's2', title: 'Fabrics: The Foundation of Comfort' },
    { id: 's3', title: 'Fit Matters: Know Your Silhouette' },
    { id: 's4', title: 'Lifestyle-Specific Recommendations' },
    { id: 's5', title: 'Care Tips to Make Them Last' }
  ];

  useEffect(() => {
    const handleScroll = () => {
      const body = document.getElementById('articleBody');
      if (!body) return;

      const rect = body.getBoundingClientRect();
      const total = body.offsetHeight;
      const scrolled = window.scrollY - body.offsetTop + window.innerHeight * 0.2;
      const pct = Math.min(100, Math.max(0, (scrolled / total) * 100));
      setReadingProgress(pct);

      // Update active TOC item
      sections.forEach((section, i) => {
        const el = document.getElementById(section.id);
        if (el && el.getBoundingClientRect().top < 160) {
          setActiveSection(i);
        }
      });
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const showToast = (msg) => {
    const toast = document.createElement('div');
    toast.className = 'mini-toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  };

  const handleShare = () => {
    showToast('🔗 Link copied to clipboard!');
  };

  const handleBookmark = () => {
    setIsBookmarked(!isBookmarked);
    showToast(isBookmarked ? 'Removed from saved' : '🔖 Article saved!');
  };

  return (
    <SeoWrapper pageName="blog-details">
      <div className="blog-details-page">
        {/* Reading Progress */}
        <div className="reading-progress">
          <div className="reading-progress-fill" style={{ width: `${readingProgress}%` }}></div>
        </div>

        {/* Top Bar */}
        <div className="top-bar">
          <button className="back-btn" onClick={() => router.push('/blog')}>
            <svg viewBox="0 0 24 24" fill="none">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back to Blog
          </button>
          <div className="top-bar-actions">
            <button className="share-btn" onClick={handleShare}>
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
              className={`bookmark-btn ${isBookmarked ? 'saved' : ''}`}
              onClick={handleBookmark}
            >
              <svg viewBox="0 0 24 24">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Hero */}
        <div className="article-hero">
          <img src={blog.heroImage} alt={blog.title} />
          <div className="article-hero-overlay"></div>
          <div className="article-hero-content">
            <div className="article-cat-tag">{blog.catLabel}</div>
            <h1 className="article-hero-title">{blog.title}</h1>
          </div>
        </div>

        {/* Meta Bar */}
        <div className="article-meta-bar">
          <div className="meta-left">
            <div className="author-block">
              <div className="author-avatar">{blog.author.initials}</div>
              <div>
                <div className="author-info-name">{blog.author.name}</div>
                <div className="author-info-role">{blog.author.role}</div>
              </div>
            </div>
            <div className="meta-divider"></div>
            <div className="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              {blog.date}
            </div>
            <div className="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              {blog.readTime}
            </div>
            <div className="meta-item">
              <svg fill="none" viewBox="0 0 24 24">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              {blog.views} views
            </div>
          </div>
          <div className="meta-right">
            <div className="meta-item">
              <svg fill="none" viewBox="0 0 24 24" width="13" height="13" stroke="currentColor" strokeWidth="2">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{blog.likes} likes</span>
            </div>
          </div>
        </div>

        {/* Article Layout */}
        <div className="article-layout">
          {/* Body */}
          <article className="article-body" id="articleBody">
            <p className="article-lead">
              Sweatshirts have come a long way from being gym-only essentials. Whether you're working from home, heading out for a morning walk, or meeting friends for brunch — the right sweatshirt can do it all. But with so many options out there, how do you actually pick the right one?
            </p>

            <h2 id="s1">Why Your Lifestyle Should Drive Your Choice</h2>
            <p>
              Most women make the mistake of buying whatever looks good in-store — without thinking about how they'll actually wear it. A plush oversized hoodie might be perfect for cosy movie nights but a poor choice for your 6 AM workout. Understanding your daily routine first is the smartest starting point.
            </p>
            <p>
              Think about where you spend most of your time. Are you commuting, working from a café, running errands, or hitting the gym three times a week? Each scenario calls for a different combination of fabric, weight and fit.
            </p>

            <figure className="article-img">
              <img src="https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=800" alt="Women in winter sweatshirts" />
              <figcaption>The right sweatshirt pairs comfort with everyday versatility.</figcaption>
            </figure>

            <h2 id="s2">Fabrics: The Foundation of Comfort</h2>
            <p>The fabric is arguably the most important factor. Here's a quick breakdown of what works for what:</p>
            <ul>
              <li><strong>French Terry:</strong> Lightweight and breathable — ideal for workouts and active use. Wicks sweat, dries fast, and won't feel heavy on you.</li>
              <li><strong>Fleece:</strong> Soft, warm and insulating. Perfect for cold winter evenings, cosy at-home days or layering under a jacket.</li>
              <li><strong>Cotton Blend:</strong> The everyday workhorse. Comfortable, easy to wash, and versatile enough for casual and semi-casual settings.</li>
              <li><strong>Modal:</strong> Silky smooth and drapes beautifully. Best for low-key work-from-home settings where you want to look put-together without trying too hard.</li>
            </ul>

            <div className="pull-quote">
              <p>"The best sweatshirt isn't the fanciest one — it's the one you reach for automatically because it just works."</p>
              <cite>— Priya Kapoor, Lifestyle Editor</cite>
            </div>

            <h2 id="s3">Fit Matters: Know Your Silhouette</h2>
            <p>Beyond fabric, fit is what separates a great sweatshirt from one that just sits in your wardrobe. Here are the main silhouettes and what they're best for:</p>

            <h3>Fitted / Slim Fit</h3>
            <p>Sits close to the body and tucks neatly into high-waisted trousers or skirts. Works brilliantly for a put-together look on video calls or a quick errand run. Avoids the "I'm wearing a sack" look that can sometimes come with bulky winter wear.</p>

            <h3>Relaxed / Regular Fit</h3>
            <p>The most popular choice and with good reason. It's comfortable without being sloppy, flattering across most body types, and pairs well with everything from joggers to denim.</p>

            <h3>Oversized</h3>
            <p>A massive trend that shows no signs of slowing down. Best worn with slim-fit bottoms — leggings, straight jeans or fitted trousers — to balance proportions. Avoids looking too casual if you keep the rest of your outfit streamlined.</p>

            <div className="tip-box">
              <div className="tip-icon">💡</div>
              <p><strong>Pro tip:</strong> If you're between sizes, go up for an oversized fit and down for a fitted look. Sweatshirts that are too wide in the shoulders rarely look intentional — even when they're "meant" to be oversized.</p>
            </div>

            <div className="product-spotlight">
              <div className="product-spotlight-img">
                <img src="https://www.jockey.in/cdn/shop/products/IC28_BLACK_0105_S123_JKY_1.webp?v=1700008414&width=200" alt="Sweatshirt" />
              </div>
              <div className="product-spotlight-info">
                <div className="ps-label">Featured in this article</div>
                <div className="ps-name">Cotton Fleece Relaxed Fit Sweatshirt - Women</div>
                <div className="ps-price">₹ 1,499</div>
                <div className="ps-btn">
                  Shop Now
                  <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </div>
              </div>
            </div>

            <h2 id="s4">Lifestyle-Specific Recommendations</h2>
            <p>Here's a quick cheat sheet depending on how you spend most of your time:</p>
            <ul>
              <li><strong>Work from Home:</strong> Go for a cotton-modal blend in a relaxed fit. Looks sharp on camera, feels like loungewear in real life.</li>
              <li><strong>Daily Commuter:</strong> Choose a mid-weight French terry sweatshirt in a neutral colour. Pairs with formal trousers and still looks intentional.</li>
              <li><strong>Fitness Enthusiast:</strong> Opt for performance-blend sweatshirts with moisture-wicking properties and a slightly cropped length that moves with you.</li>
              <li><strong>Weekend Wanderer:</strong> Thick fleece in an oversized cut, worn over a fitted tee. Comfortable enough for travel, looks deliberate in photos.</li>
              <li><strong>Fashion-Forward:</strong> Try colour-blocked or printed styles in a premium cotton blend. A clean logo or tonal embroidery keeps it elevated.</li>
            </ul>

            <figure className="article-img">
              <img src="https://www.jockey.in/cdn/shop/articles/M8_Blog_Winter-Trendy-and-Comfortable-Winter-Hoodies-for-Men_Uodated_3cb0a447-2d30-471d-8bd7-956c2a13c04e.jpg?v=1773220598&width=800" alt="Styling sweatshirts" />
              <figcaption>Layering a sweatshirt right elevates any winter outfit instantly.</figcaption>
            </figure>

            <h2 id="s5">Care Tips to Make Them Last</h2>
            <p>The best sweatshirt collection is one that stays great season after season. A few habits make a big difference:</p>
            <ul>
              <li>Wash inside-out in cold water to preserve colour and print quality.</li>
              <li>Avoid the dryer for fleece — air dry flat to maintain shape and prevent pilling.</li>
              <li>Store folded, not hung — heavy fabrics stretch out on hangers over time.</li>
              <li>Use a fabric shaver for pilling on cotton-poly blends. Takes 5 minutes and makes a big difference.</li>
            </ul>

            {/* Tags */}
            <div className="article-tags">
              {blog.tags.map((tag, idx) => (
                <span key={idx} className="article-tag">{tag}</span>
              ))}
            </div>

            {/* Share */}
            <div className="share-row">
              <span className="share-label">Share</span>
              <div className="share-icon" title="WhatsApp">💬</div>
              <div className="share-icon" title="Twitter">𝕏</div>
              <div className="share-icon" title="Facebook">f</div>
              <div className="share-icon" title="Copy Link" onClick={handleShare}>🔗</div>
            </div>
          </article>

          {/* Sidebar */}
          <aside className="article-sidebar">
            {/* Table of Contents */}
            <div className="toc">
              <div className="toc-title">In This Article</div>
              <ul className="toc-list">
                {sections.map((section, idx) => (
                  <li 
                    key={section.id}
                    className={`toc-item ${activeSection === idx ? 'active' : ''}`}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.title}
                  </li>
                ))}
              </ul>
            </div>

            {/* Sidebar Newsletter */}
            <div className="sidebar-nl">
              <div className="snl-label">Newsletter</div>
              <div className="snl-title">Style tips, weekly.</div>
              <div className="snl-sub">No spam. Just comfort stories delivered to your inbox.</div>
              <input className="snl-input" type="email" placeholder="Your email" />
              <button className="snl-btn">Subscribe</button>
            </div>

            {/* Related in sidebar */}
            <div className="sidebar-related-title">You Might Also Like</div>
            <div className="sidebar-blog-card">
              <div className="sb-img">
                <img src="https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=200" alt="" />
              </div>
              <div>
                <div className="sb-title">Why Jockey's Winter Jackets for Women Are a Must-Have</div>
                <div className="sb-date">26 Nov, 2025</div>
              </div>
            </div>
            <div className="sidebar-blog-card">
              <div className="sb-img">
                <img src="https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=200" alt="" />
              </div>
              <div>
                <div className="sb-title">Winter Sweatshirts for Men That Make Travel Effortless</div>
                <div className="sb-date">17 Nov, 2025</div>
              </div>
            </div>
          </aside>
        </div>

        {/* Related Articles */}
        <div className="related-section">
          <div className="related-header">
            <div className="related-label">Keep Reading</div>
            <div className="related-title">You Might Also Enjoy</div>
          </div>
          <div className="related-grid">
            <div className="related-card">
              <div className="related-card-img">
                <img src="https://www.jockey.in/cdn/shop/articles/Winter-Jackets-For-Women_1db4088d-3e23-4561-8377-89d8e9e0e3a3.jpg?v=1773214308&width=640" alt="" />
                <div className="rc-cat cat-woman">Woman</div>
              </div>
              <div className="rc-date">26 Nov, 2025</div>
              <div className="rc-title">Why Jockey's Winter Jackets for Women Are a Must-Have This Season</div>
              <div className="rc-read">
                Read Story
                <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="11" height="11">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
            <div className="related-card">
              <div className="related-card-img">
                <img src="https://www.jockey.in/cdn/shop/articles/M9Blog_Travel-Friendly-Winter-Sweatshirts-for-Men-You-Can-Carry-Anywhere_Jan-2026_f321a56c-6e83-4f84-9cd8-68accae9f17a.jpg?v=1773212658&width=640" alt="" />
                <div className="rc-cat cat-lifestyle">Lifestyle</div>
              </div>
              <div className="rc-date">17 Nov, 2025</div>
              <div className="rc-title">Winter Sweatshirts for Men That Make Travel Effortless</div>
              <div className="rc-read">
                Read Story
                <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="11" height="11">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
            <div className="related-card">
              <div className="related-card-img">
                <img src="https://www.jockey.in/cdn/shop/articles/M8_Blog_Winter-Trendy-and-Comfortable-Winter-Hoodies-for-Men_Uodated_3cb0a447-2d30-471d-8bd7-956c2a13c04e.jpg?v=1773220598&width=640" alt="" />
                <div className="rc-cat cat-fashion">Fashion</div>
              </div>
              <div className="rc-date">03 Nov, 2025</div>
              <div className="rc-title">Trendy and Comfortable Winter Hoodies for Men — Styled Right</div>
              <div className="rc-read">
                Read Story
                <svg fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="11" height="11">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </SeoWrapper>
  );
};

export default BlogDetails;

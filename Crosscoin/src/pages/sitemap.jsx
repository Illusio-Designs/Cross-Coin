import React from 'react';
import Link from 'next/link';
import SeoWrapper from '../console/SeoWrapper';
import '../styles/pages/sitemap.css';

const Sitemap = () => {
  return (
    <SeoWrapper pageName="sitemap">
      <div className="sitemap-page">
        {/* BREADCRUMB */}
        <nav className="breadcrumb">
          <Link href="/">Home</Link>
          <span className="sep">/</span>
          <span>Sitemap</span>
        </nav>

        {/* PAGE TITLE */}
        <div className="page-title">
          <h1>Sitemap</h1>
        </div>

        {/* MAIN */}
        <div className="sitemap-wrap">
          {/* ══════════════ SHOP ══════════════ */}
          <div className="section-block">
            <Link href="/Products" className="section-heading">Shop</Link>
            <p className="section-desc">Browse through our range of exclusive Crosscoin products. Shop for apparel, accessories and more from our latest collection.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/Products" className="cat-heading">All Products</Link>
                <ul className="cat-links">
                  <li><Link href="/Products">Featured Products</Link></li>
                  <li><Link href="/Products">Latest Arrivals</Link></li>
                  <li><Link href="/Products">Best Sellers</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/Collections" className="cat-heading">Collections</Link>
                <ul className="cat-links">
                  <li><Link href="/Collections">Browse All</Link></li>
                  <li><Link href="/Products">Men's Collection</Link></li>
                  <li><Link href="/Products">Women's Collection</Link></li>
                  <li><Link href="/Products">Accessories</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Shop by Category</a>
                <ul className="cat-links">
                  <li><Link href="/Products">Apparel</Link></li>
                  <li><Link href="/Products">Innerwear</Link></li>
                  <li><Link href="/Products">Accessories</Link></li>
                  <li><Link href="/Products">Seasonal</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Shop by Price</a>
                <ul className="cat-links">
                  <li><a href="#">Under ₹500</a></li>
                  <li><a href="#">₹500 - ₹1000</a></li>
                  <li><a href="#">₹1000 - ₹2000</a></li>
                  <li><a href="#">Above ₹2000</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">New Arrivals</a>
                <ul className="cat-links">
                  <li><a href="#">This Week</a></li>
                  <li><a href="#">This Month</a></li>
                  <li><a href="#">Trending Now</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Special Offers</a>
                <ul className="cat-links">
                  <li><a href="#">Sale Items</a></li>
                  <li><a href="#">Clearance</a></li>
                  <li><a href="#">Bundle Deals</a></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ CONTENT ══════════════ */}
          <div className="section-block">
            <a href="#" className="section-heading">Content</a>
            <p className="section-desc">Explore our blog, guides and resources to learn more about fashion, style tips and product care.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/blog" className="cat-heading">Blog</Link>
                <ul className="cat-links">
                  <li><Link href="/blog">All Articles</Link></li>
                  <li><Link href="/blog">Lifestyle</Link></li>
                  <li><Link href="/blog">Fashion Tips</Link></li>
                  <li><Link href="/blog">Style Guide</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Resources</a>
                <ul className="cat-links">
                  <li><a href="#">Size Guide</a></li>
                  <li><a href="#">Care Instructions</a></li>
                  <li><a href="#">Fabric Guide</a></li>
                  <li><a href="#">Style Tips</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Popular Topics</a>
                <ul className="cat-links">
                  <li><a href="#">Winter Fashion</a></li>
                  <li><a href="#">Summer Collection</a></li>
                  <li><a href="#">Comfort Wear</a></li>
                  <li><a href="#">Sustainable Fashion</a></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ ACCOUNT & ORDERS ══════════════ */}
          <div className="section-block">
            <a href="#" className="section-heading">Account & Orders</a>
            <p className="section-desc">Manage your account, track orders and view your purchase history.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/profile" className="cat-heading">My Account</Link>
                <ul className="cat-links">
                  <li><Link href="/profile">Profile</Link></li>
                  <li><Link href="/profile">My Orders</Link></li>
                  <li><Link href="/Wishlist">Wishlist</Link></li>
                  <li><a href="#">Saved Addresses</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/OrderTracking" className="cat-heading">Orders</Link>
                <ul className="cat-links">
                  <li><Link href="/OrderTracking">Track Order</Link></li>
                  <li><a href="#">Order History</a></li>
                  <li><a href="#">Returns</a></li>
                  <li><a href="#">Refunds</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Checkout</a>
                <ul className="cat-links">
                  <li><Link href="/UnifiedCheckout">Checkout</Link></li>
                  <li><a href="#">Payment Methods</a></li>
                  <li><a href="#">Shipping Info</a></li>
                  <li><a href="#">Delivery Tracking</a></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ COMPANY INFO ══════════════ */}
          <div className="section-block">
            <a href="#" className="section-heading">Company Info</a>
            <p className="section-desc">Learn more about Crosscoin, our policies and how we can help you.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/About" className="cat-heading">About</Link>
                <ul className="cat-links">
                  <li><Link href="/About">About Us</Link></li>
                  <li><a href="#">Our Story</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Press</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/Contact" className="cat-heading">Contact</Link>
                <ul className="cat-links">
                  <li><Link href="/Contact">Get in Touch</Link></li>
                  <li><a href="#">Customer Support</a></li>
                  <li><a href="#">Feedback</a></li>
                  <li><a href="#">Report Issue</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/policy" className="cat-heading">Policies</Link>
                <ul className="cat-links">
                  <li><Link href="/policy">Privacy Policy</Link></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Return Policy</a></li>
                  <li><a href="#">Shipping Policy</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Help & Support</a>
                <ul className="cat-links">
                  <li><a href="#">FAQs</a></li>
                  <li><a href="#">Troubleshooting</a></li>
                  <li><a href="#">Grievance Redressal</a></li>
                  <li><a href="#">Sitemap</a></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ AUTHENTICATION ══════════════ */}
          <div className="section-block">
            <a href="#" className="section-heading">Authentication</a>
            <p className="section-desc">Sign in, create an account or manage your authentication preferences.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/login" className="cat-heading">Account Access</Link>
                <ul className="cat-links">
                  <li><Link href="/login">Sign In</Link></li>
                  <li><Link href="/register">Create Account</Link></li>
                  <li><Link href="/auth/forgot-password">Forgot Password</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Security</a>
                <ul className="cat-links">
                  <li><a href="#">Password Reset</a></li>
                  <li><a href="#">Two-Factor Auth</a></li>
                  <li><a href="#">Security Settings</a></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ SPECIAL PAGES ══════════════ */}
          <div className="section-block">
            <a href="#" className="section-heading">Special Pages</a>
            <p className="section-desc">Explore our special pages and unique experiences.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/" className="cat-heading">Home</Link>
                <ul className="cat-links">
                  <li><Link href="/">Homepage</Link></li>
                  <li><Link href="/Products">Shop Now</Link></li>
                  <li><Link href="/Collections">Browse Collections</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/SearchResults" className="cat-heading">Search</Link>
                <ul className="cat-links">
                  <li><Link href="/SearchResults">Search Results</Link></li>
                  <li><a href="#">Advanced Search</a></li>
                  <li><a href="#">Popular Searches</a></li>
                </ul>
              </div>

              <div className="cat-col">
                <a href="#" className="cat-heading">Other Pages</a>
                <ul className="cat-links">
                  <li><Link href="/ThankYou">Thank You</Link></li>
                  <li><a href="#">Error Page</a></li>
                  <li><a href="#">Coming Soon</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        {/* /sitemap-wrap */}
      </div>
    </SeoWrapper>
  );
};

export default Sitemap;

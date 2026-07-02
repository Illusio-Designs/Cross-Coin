import React from 'react';
import Link from 'next/link';
import SeoWrapper from '../console/SeoWrapper';
import { useCart } from '../context/CartContext';
import { fetchPageSeo } from '../utils/fetchPageSeo';

export async function getServerSideProps(ctx) {
  return { props: { seoData: await fetchPageSeo('sitemap', ctx) } };
}

const Sitemap = ({ seoData }) => {
  const { setIsDrawerOpen } = useCart();
  return (
    <SeoWrapper pageName="sitemap" seoData={seoData}>
      <div className="sitemap-page">
        {/* PAGE TITLE */}
        <div className="page-title">
          <h1>Sitemap</h1>
          <p className="page-subtitle">Explore all pages and sections of Crosscoin</p>
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
            <Link href="/blog" className="section-heading">Content</Link>
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
                <Link href="/About" className="cat-heading">Resources</Link>
                <ul className="cat-links">
                  <li><Link href="/About">Size Guide</Link></li>
                  <li><Link href="/policy/shipping-policy">Care Instructions</Link></li>
                  <li><Link href="/About">Fabric Guide</Link></li>
                  <li><Link href="/blog">Style Tips</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/blog" className="cat-heading">Popular Topics</Link>
                <ul className="cat-links">
                  <li><Link href="/blog">Winter Fashion</Link></li>
                  <li><Link href="/blog">Summer Collection</Link></li>
                  <li><Link href="/blog">Comfort Wear</Link></li>
                  <li><Link href="/blog">Sustainable Fashion</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ ACCOUNT & ORDERS ══════════════ */}
          <div className="section-block">
            <Link href="/profile" className="section-heading">Account & Orders</Link>
            <p className="section-desc">Manage your account, track orders and view your purchase history.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/profile" className="cat-heading">My Account</Link>
                <ul className="cat-links">
                  <li><Link href="/profile">Profile</Link></li>
                  <li><Link href="/profile">My Orders</Link></li>
                  <li><Link href="/Wishlist">Wishlist</Link></li>
                  <li><Link href="/profile">Saved Addresses</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/OrderTracking" className="cat-heading">Orders</Link>
                <ul className="cat-links">
                  <li><Link href="/OrderTracking">Track Order</Link></li>
                  <li><Link href="/profile">Order History</Link></li>
                  <li><Link href="/policy/cancellation-and-refund">Returns</Link></li>
                  <li><Link href="/policy/cancellation-and-refund">Refunds</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <button className="cat-heading sitemap-btn-link" onClick={() => setIsDrawerOpen(true)}>Checkout</button>
                <ul className="cat-links">
                  <li><button className="sitemap-btn-link" onClick={() => setIsDrawerOpen(true)}>Checkout</button></li>
                  <li><Link href="/policy/terms-and-conditions">Payment Methods</Link></li>
                  <li><Link href="/policy/shipping-policy">Shipping Info</Link></li>
                  <li><Link href="/OrderTracking">Delivery Tracking</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ COMPANY INFO ══════════════ */}
          <div className="section-block">
            <Link href="/About" className="section-heading">Company Info</Link>
            <p className="section-desc">Learn more about Crosscoin, our policies and how we can help you.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/About" className="cat-heading">About</Link>
                <ul className="cat-links">
                  <li><Link href="/About">About Us</Link></li>
                  <li><Link href="/About">Our Story</Link></li>
                  <li><Link href="/Contact">Careers</Link></li>
                  <li><Link href="/Contact">Press</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/Contact" className="cat-heading">Contact</Link>
                <ul className="cat-links">
                  <li><Link href="/Contact">Get in Touch</Link></li>
                  <li><Link href="/Contact">Customer Support</Link></li>
                  <li><Link href="/Contact">Feedback</Link></li>
                  <li><Link href="/Contact">Report Issue</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/policy" className="cat-heading">Policies</Link>
                <ul className="cat-links">
                  <li><Link href="/policy/privacy-policy">Privacy Policy</Link></li>
                  <li><Link href="/policy/terms-and-conditions">Terms of Service</Link></li>
                  <li><Link href="/policy/cancellation-and-refund">Return Policy</Link></li>
                  <li><Link href="/policy/shipping-policy">Shipping Policy</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/Contact" className="cat-heading">Help & Support</Link>
                <ul className="cat-links">
                  <li><Link href="/Contact">FAQs</Link></li>
                  <li><Link href="/Contact">Troubleshooting</Link></li>
                  <li><Link href="/Contact">Grievance Redressal</Link></li>
                  <li><Link href="/sitemap">Sitemap</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ AUTHENTICATION ══════════════ */}
          <div className="section-block">
            <Link href="/login" className="section-heading">Authentication</Link>
            <p className="section-desc">Sign in, create an account or manage your authentication preferences.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/login" className="cat-heading">Account Access</Link>
                <ul className="cat-links">
                  <li><Link href="/login">Sign In</Link></li>
                  <li><Link href="/register">Create Account</Link></li>
                  <li><Link href="/login">Forgot Password</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/profile" className="cat-heading">Security</Link>
                <ul className="cat-links">
                  <li><Link href="/profile">Password Reset</Link></li>
                  <li><Link href="/profile">Two-Factor Auth</Link></li>
                  <li><Link href="/profile">Security Settings</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ SPECIAL PAGES ══════════════ */}
          <div className="section-block">
            <Link href="/" className="section-heading">Special Pages</Link>
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
                  <li><Link href="/Products">Advanced Search</Link></li>
                  <li><Link href="/Products">Popular Searches</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/blog" className="cat-heading">Other Pages</Link>
                <ul className="cat-links">
                  <li><Link href="/ThankYou">Thank You</Link></li>
                  <li><Link href="/blog">Blog</Link></li>
                  <li><Link href="/sitemap">Sitemap</Link></li>
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

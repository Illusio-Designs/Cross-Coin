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
            <Link href="/products" className="section-heading">Shop</Link>
            <p className="section-desc">Browse through our range of exclusive Crosscoin products. Shop for apparel, accessories and more from our latest collection.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/products" className="cat-heading">All Products</Link>
                <ul className="cat-links">
                  <li><Link href="/products">Featured Products</Link></li>
                  <li><Link href="/products">Latest Arrivals</Link></li>
                  <li><Link href="/products">Best Sellers</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/collections" className="cat-heading">Collections</Link>
                <ul className="cat-links">
                  <li><Link href="/collections">Browse All</Link></li>
                  <li><Link href="/products">Men's Collection</Link></li>
                  <li><Link href="/products">Women's Collection</Link></li>
                  <li><Link href="/products">Accessories</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/products" className="cat-heading">Shop by Category</Link>
                <ul className="cat-links">
                  <li><Link href="/products">Apparel</Link></li>
                  <li><Link href="/products">Innerwear</Link></li>
                  <li><Link href="/products">Accessories</Link></li>
                  <li><Link href="/products">Seasonal</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/products" className="cat-heading">Shop by Price</Link>
                <ul className="cat-links">
                  <li><Link href="/products">Under ₹500</Link></li>
                  <li><Link href="/products">₹500 - ₹1000</Link></li>
                  <li><Link href="/products">₹1000 - ₹2000</Link></li>
                  <li><Link href="/products">Above ₹2000</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/products" className="cat-heading">New Arrivals</Link>
                <ul className="cat-links">
                  <li><Link href="/products">This Week</Link></li>
                  <li><Link href="/products">This Month</Link></li>
                  <li><Link href="/products">Trending Now</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/collections" className="cat-heading">Special Offers</Link>
                <ul className="cat-links">
                  <li><Link href="/collections">Sale Items</Link></li>
                  <li><Link href="/collections">Clearance</Link></li>
                  <li><Link href="/collections">Bundle Deals</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ CONTENT ══════════════ */}
          <div className="section-block">
            <Link href="/journal" className="section-heading">Content</Link>
            <p className="section-desc">Explore our blog, guides and resources to learn more about fashion, style tips and product care.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/journal" className="cat-heading">Blog</Link>
                <ul className="cat-links">
                  <li><Link href="/journal">All Articles</Link></li>
                  <li><Link href="/journal">Lifestyle</Link></li>
                  <li><Link href="/journal">Fashion Tips</Link></li>
                  <li><Link href="/journal">Style Guide</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/about" className="cat-heading">Resources</Link>
                <ul className="cat-links">
                  <li><Link href="/about">Size Guide</Link></li>
                  <li><Link href="/policy/shipping-policy">Care Instructions</Link></li>
                  <li><Link href="/about">Fabric Guide</Link></li>
                  <li><Link href="/journal">Style Tips</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/journal" className="cat-heading">Popular Topics</Link>
                <ul className="cat-links">
                  <li><Link href="/journal">Winter Fashion</Link></li>
                  <li><Link href="/journal">Summer Collection</Link></li>
                  <li><Link href="/journal">Comfort Wear</Link></li>
                  <li><Link href="/journal">Sustainable Fashion</Link></li>
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
                  <li><Link href="/wishlist">Wishlist</Link></li>
                  <li><Link href="/profile">Saved Addresses</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/track-order" className="cat-heading">Orders</Link>
                <ul className="cat-links">
                  <li><Link href="/track-order">Track Order</Link></li>
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
                  <li><Link href="/track-order">Delivery Tracking</Link></li>
                </ul>
              </div>
            </div>
          </div>

          <hr className="section-divider" />

          {/* ══════════════ COMPANY INFO ══════════════ */}
          <div className="section-block">
            <Link href="/about" className="section-heading">Company Info</Link>
            <p className="section-desc">Learn more about Crosscoin, our policies and how we can help you.</p>
            <div className="category-grid">
              <div className="cat-col">
                <Link href="/about" className="cat-heading">About</Link>
                <ul className="cat-links">
                  <li><Link href="/about">About Us</Link></li>
                  <li><Link href="/about">Our Story</Link></li>
                  <li><Link href="/contact">Careers</Link></li>
                  <li><Link href="/contact">Press</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/contact" className="cat-heading">Contact</Link>
                <ul className="cat-links">
                  <li><Link href="/contact">Get in Touch</Link></li>
                  <li><Link href="/contact">Customer Support</Link></li>
                  <li><Link href="/contact">Feedback</Link></li>
                  <li><Link href="/contact">Report Issue</Link></li>
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
                <Link href="/contact" className="cat-heading">Help & Support</Link>
                <ul className="cat-links">
                  <li><Link href="/contact">FAQs</Link></li>
                  <li><Link href="/contact">Troubleshooting</Link></li>
                  <li><Link href="/contact">Grievance Redressal</Link></li>
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
                  <li><Link href="/products">Shop Now</Link></li>
                  <li><Link href="/collections">Browse Collections</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/search" className="cat-heading">Search</Link>
                <ul className="cat-links">
                  <li><Link href="/search">Search Results</Link></li>
                  <li><Link href="/products">Advanced Search</Link></li>
                  <li><Link href="/products">Popular Searches</Link></li>
                </ul>
              </div>

              <div className="cat-col">
                <Link href="/journal" className="cat-heading">Other Pages</Link>
                <ul className="cat-links">
                  <li><Link href="/thank-you">Thank You</Link></li>
                  <li><Link href="/journal">Blog</Link></li>
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

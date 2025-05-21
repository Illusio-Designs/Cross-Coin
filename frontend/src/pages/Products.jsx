"use client";
import React, { useState } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiFilter } from "react-icons/fi";

const Products = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortBy, setSortBy] = useState("featured");

  const categories = [
    "All",
    "Woollen Shocks",
    "Cotton Shocks",
    "Silk Shocks",
    "Winter Special",
    "Summer Special",
    "Net Shocks",
    "Rubber Shocks"
  ];

  const products = [
    {
      id: 1,
      name: "Premium Wool Socks",
      price: 29.99,
      category: "Woollen Shocks",
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80",
      rating: 4.5,
      reviews: 128
    },
    {
      id: 2,
      name: "Cotton Comfort Socks",
      price: 19.99,
      category: "Cotton Shocks",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
      rating: 4.2,
      reviews: 95
    },
    {
      id: 3,
      name: "Silk Luxury Socks",
      price: 39.99,
      category: "Silk Shocks",
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80",
      rating: 4.8,
      reviews: 64
    },
    {
      id: 4,
      name: "Winter Thermal Socks",
      price: 34.99,
      category: "Winter Special",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
      rating: 4.6,
      reviews: 112
    },
    {
      id: 5,
      name: "Summer Breathable Socks",
      price: 24.99,
      category: "Summer Special",
      image: "https://images.unsplash.com/photo-1512436991641-6745cdb1723f?auto=format&fit=crop&w=600&q=80",
      rating: 4.3,
      reviews: 87
    },
    {
      id: 6,
      name: "Net Pattern Socks",
      price: 22.99,
      category: "Net Shocks",
      image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80",
      rating: 4.4,
      reviews: 73
    }
  ];

  const filteredProducts = selectedCategory === "All" 
    ? products 
    : products.filter(product => product.category === selectedCategory);

  return (
    <>
      <Header />
      <div className="products-page">
        <div className="products-header">
          <h1>Our Products</h1>
          <div className="products-controls">
            <button 
              className="filter-toggle"
              onClick={() => setShowFilters(!showFilters)}
            >
              <FiFilter /> Filters
            </button>
            <select 
              className="sort-select"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="rating">Top Rated</option>
            </select>
          </div>
        </div>

        <div className="products-container">
          {showFilters && (
            <div className="filters-sidebar">
              <h3>Categories</h3>
              <div className="category-list">
                {categories.map((category) => (
                  <button
                    key={category}
                    className={`category-btn ${selectedCategory === category ? 'active' : ''}`}
                    onClick={() => setSelectedCategory(category)}
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <img src={product.image} alt={product.name} />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <div className="product-rating">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span
                        key={i}
                        className={`star ${i < Math.floor(product.rating) ? 'filled' : ''}`}
                      >
                        ★
                      </span>
                    ))}
                    <span className="reviews">({product.reviews})</span>
                  </div>
                  <p className="product-price">${product.price}</p>
                  <button className="add-to-cart">Add to Cart</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Products; 
"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiFilter, FiChevronDown } from "react-icons/fi";
import Image from "next/image";
import card1 from "../assets/card1-right.webp";
import card2 from "../assets/card2-left.webp";
import card3 from "../assets/card3-right.webp";

const Products = () => {
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState([]);
  const [sortBy, setSortBy] = useState("featured");
  const [priceRange, setPriceRange] = useState([20, 250]);
  const [selectedColors, setSelectedColors] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [selectedGender, setSelectedGender] = useState([]);
  const [selectedMaterial, setSelectedMaterial] = useState([]);
  const [showCategory, setShowCategory] = useState(false);
  const [showMaterial, setShowMaterial] = useState(false);
  const [showPrice, setShowPrice] = useState(false);
  const [showColors, setShowColors] = useState(false);
  const [showSizes, setShowSizes] = useState(false);
  const [showGender, setShowGender] = useState(false);

  const categories = [
    'Ankle',
    'Long',
    'Short'
  ];

  const materials = [
    'Winter Wear',
    'Summer Wear',
    'Cotton',
    'Wools',
    'Silk',
    'Net',
    'Rubber'
  ];

  const colors = ['red', 'blue', 'green', 'yellow', 'black', 'gray'];
  const sizes = ['S', 'M', 'L', 'XL'];
  const genders = ['Men', 'Women', 'Kids'];



  const products = [
    {
      id: 1,
      name: "Premium Wool Socks",
      originalPrice: 39.99,
      price: 29.99,
      category: "Woollen Shocks",
      image: card1,
      rating: 4.5,
      reviews: 128
    },
    {
      id: 2,
      name: "Cotton Comfort Socks",
      originalPrice: 29.99,
      price: 19.99,
      category: "Cotton Shocks",
      image: card2,
      rating: 4.2,
      reviews: 95
    },
    {
      id: 3,
      name: "Silk Luxury Socks",
      originalPrice: 39.99,
      price: 39.99,
      category: "Silk Shocks",
      image: card3,
      rating: 4.8,
      reviews: 64
    },
    {
      id: 4,
      name: "Winter Thermal Socks",
      originalPrice: 34.99,
      price: 34.99,
      category: "Winter Special",
      image: card1,
      rating: 4.6,
      reviews: 112
    },
    {
      id: 5,
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      image: card2,
      rating: 4.3,
      reviews: 87
    },
    {
      id: 6,
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      image: card3,
      rating: 4.4,
      reviews: 73
    },
    {
      id: 7,
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      image: card1,
      rating: 4.3,
      reviews: 87
    },
    {
      id: 8,
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      image: card2,
      rating: 4.4,
      reviews: 73
    },
    {
      id: 9,
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      image: card3,
      rating: 4.3,
      reviews: 87
    },
    {
      id: 10,
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      image: card1,
      rating: 4.4,
      reviews: 73
    },
    {
      id: 11,
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      image: card2,
      rating: 4.3,
      reviews: 87
    },
    {
      id: 12,
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      image: card3,
      rating: 4.4,
      reviews: 73
    },
    {
      id: 13,
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      image: card1,
      rating: 4.3,
      reviews: 87
    },
    {
      id: 14,
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      image: card2,
      rating: 4.4,
      reviews: 73
    },
    {
      id: 15,
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      image: card3,
      rating: 4.3,
      reviews: 87
    },
    {
      id: 16,
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      image: card1,
      rating: 4.4,
      reviews: 73
    }
  ];

  const formatTwoDigits = (num) => num.toString().padStart(2, '0');

  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set your target date here (e.g., 7 days from now)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 7);

    const updateTimer = () => {
      const now = new Date();
      const diff = targetDate - now;
      if (diff > 0) {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds });
      } else {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      }
    };
    updateTimer();
    const timerInterval = setInterval(updateTimer, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  const { days, hours, minutes, seconds } = timeLeft;

  const handleFilterChange = (filterType, value) => {
    switch (filterType) {
      case 'price':
        setPriceRange(value);
        break;
      case 'color':
        setSelectedColors(prev => prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]);
        break;
      case 'size':
        setSelectedSizes(prev => prev.includes(value) ? prev.filter(s => s !== value) : [...prev, value]);
        break;
      case 'gender':
        setSelectedGender(prev => prev.includes(value) ? prev.filter(g => g !== value) : [...prev, value]);
        break;
      case 'material':
        setSelectedMaterial(prev => prev.includes(value) ? prev.filter(m => m !== value) : [...prev, value]);
        break;
      case 'category':
        setSelectedCategory(prev => prev.includes(value) ? prev.filter(c => c !== value) : [...prev, value]);
        break;
      default:
        break;
    }
  };

  const filteredProducts = products.filter(product => {
    const inPriceRange = product.price >= priceRange[0] && product.price <= priceRange[1];
    const matchesColor = selectedColors.length === 0 || selectedColors.includes(product.color);
    const matchesSize = selectedSizes.length === 0 || selectedSizes.includes(product.size);
    const matchesGender = selectedGender.length === 0 || selectedGender.includes(product.gender);
    const matchesMaterial = selectedMaterial.length === 0 || selectedMaterial.includes(product.material);
    const matchesCategory = selectedCategory.length === 0 || selectedCategory.includes(product.category);
    return inPriceRange && matchesColor && matchesSize && matchesGender && matchesMaterial && matchesCategory;
  });

  return (
    <>
      <Header />
      <div className="products-page">
        <div className="products-hero">
        <div className="summer-collections-section">
        <div className="summer-collections-content">
          <h2><span className="summer-highlight">SUMMER</span> COLLECTIONS</h2>
          <button className="summer-shop-btn">SHOP NOW &rarr;</button>
        </div>
        <div className="summer-countdown">
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(days)}</div>
              <div className="summer-countdown-label">Days</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(hours)}</div>
              <div className="summer-countdown-label">Hours</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(minutes)}</div>
              <div className="summer-countdown-label">Minutes</div>
            </div>
            <span>:</span>
            <div className="summer-countdown-block">
              <div className="summer-countdown-digit">{formatTwoDigits(seconds)}</div>
              <div className="summer-countdown-label">Seconds</div>
            </div>
          </div>
        </div>
        </div>
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
              <div className="filter-section">
                <h3 onClick={() => setShowCategory(!showCategory)} className={`clickable-heading ${showCategory ? 'open' : ''}`}>
                  Product Category <FiChevronDown className={`arrow-icon ${showCategory ? 'open' : ''}`} />
                </h3>
                {showCategory && (
                  <div className="category-list">
                    {categories.map((category) => (
                      <label key={category} className="checkbox-label">
                        <div className="checkbox-group">
                        <input
                          type="checkbox"
                          checked={selectedCategory.includes(category)}
                          onChange={() => handleFilterChange('category', category)}
                        />
                        <p>{category}</p> 
                        </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowMaterial(!showMaterial)} className={`clickable-heading ${showMaterial ? 'open' : ''}`}>
                  Material <FiChevronDown className={`arrow-icon ${showMaterial ? 'open' : ''}`} />
                </h3>
                {showMaterial && (
                  <div className="material-list">
                    {materials.map((material) => (
                      <label key={material} className="checkbox-label">
                        <div className="checkbox-group">
                        <input
                          type="checkbox"
                          checked={selectedMaterial.includes(material)}
                          onChange={() => handleFilterChange('material', material)}
                        />
                        <p>{material}</p> 
                         </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowPrice(!showPrice)} className={`clickable-heading ${showPrice ? 'open' : ''}`}>
                  By Price <FiChevronDown className={`arrow-icon ${showPrice ? 'open' : ''}`} />
                </h3>
                {showPrice && (
                  <div className="price-range">
                    <input
                      type="range"
                      min="20"
                      max="250"
                      value={priceRange[0]}
                      onChange={(e) => handleFilterChange('price', [e.target.value, priceRange[1]])}
                    />
                    <input
                      type="range"
                      min="20"
                      max="250"
                      value={priceRange[1]}
                      onChange={(e) => handleFilterChange('price', [priceRange[0], e.target.value])}
                    />
                    <div className="price-inputs">
                      <span>${priceRange[0]}</span> - <span>${priceRange[1]}</span>
                    </div>
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowColors(!showColors)} className={`clickable-heading ${showColors ? 'open' : ''}`}>
                  Colors <FiChevronDown className={`arrow-icon ${showColors ? 'open' : ''}`} />
                </h3>
                {showColors && (
                  <div className="color-options">
                    {colors.map(color => (
                      <button
                        key={color}
                        className={`color-btn ${selectedColors.includes(color) ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={() => handleFilterChange('color', color)}
                      />
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowSizes(!showSizes)} className={`clickable-heading ${showSizes ? 'open' : ''}`}>
                  Size <FiChevronDown className={`arrow-icon ${showSizes ? 'open' : ''}`} />
                </h3>
                {showSizes && (
                  <div className="size-options">
                    {sizes.map(size => (
                      <label key={size} className="checkbox-label">
                        <div className="checkbox-group">
                        <input
                          type="checkbox"
                          checked={selectedSizes.includes(size)}
                          onChange={() => handleFilterChange('size', size)}
                        />
                        <p>{size} </p>
                        </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="filter-section">
                <h3 onClick={() => setShowGender(!showGender)} className={`clickable-heading ${showGender ? 'open' : ''}`}>
                  Gender <FiChevronDown className={`arrow-icon ${showGender ? 'open' : ''}`} />
                </h3>
                {showGender && (
                  <div className="gender-options">
                    {genders.map(gender => (
                      <label key={gender} className="checkbox-label">
                        <div className="checkbox-group">
                        <input
                          type="checkbox"
                          checked={selectedGender.includes(gender)}
                          onChange={() => handleFilterChange('gender', gender)}
                        />
                        <p>{gender} </p>
                        </div>
                        <span>[20]</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="products-grid">
            {filteredProducts.map((product) => (
              <div key={product.id} className="product-card">
                <div className="product-image">
                  <Image 
                    src={product.image} 
                    alt={product.name} 
                    width={300}
                    height={300}
                    style={{ objectFit: 'cover' }}
                  />
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <div className="product-meta">
                    <span className="product-price">
                      <span className="original-price">${product.originalPrice}</span> ${product.price}
                    </span>
                    <button className="add-to-cart">Add</button>
                  </div>
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
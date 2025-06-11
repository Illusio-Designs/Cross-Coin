"use client";
import React, { useState, useEffect } from "react";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { FiFilter, FiChevronDown } from "react-icons/fi";
import { useRouter } from "next/navigation";
import { useCart } from '../context/CartContext';
import ProductCard, { products, filterOptions } from "../components/ProductCard";

const Products = () => {
  const router = useRouter();
  const { addToCart } = useCart();
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

  const formatTwoDigits = (num) => num.toString().padStart(2, '0');

  const [current, setCurrent] = useState(0);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    // Set your target date here (e.g., 7 days from now)
    const startTime = new Date();
    const targetDate = new Date(startTime);
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

  const handleProductClick = (product) => {
    const productName = encodeURIComponent(product.name);
    router.push(`/ProductDetails?name=${productName}`);
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    // Add default color and size for quick add
    const defaultColor = product.colors?.[0] || 'black';
    const defaultSize = product.sizes?.[0] || 'M';
    addToCart(product, defaultColor, defaultSize, 1);
  };

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
                    {filterOptions.categories.map((category) => (
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
                    {filterOptions.materials.map((material) => (
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
                    {filterOptions.colors.map(color => (
                      <button
                        key={color}
                        className={`color-btn ${selectedColors.includes(color) ? 'active' : ''}`}
                        style={{ backgroundColor: color }}
                        onClick={(e) => handleFilterChange('color', color)}
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
                    {filterOptions.sizes.map(size => (
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
                    {filterOptions.genders.map(gender => (
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
              <ProductCard
                key={product.id}
                product={product}
                onProductClick={handleProductClick}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default Products; 
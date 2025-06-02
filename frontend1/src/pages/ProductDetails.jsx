import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import card1 from "../assets/card1-right.webp";
import card2 from "../assets/card3-right.webp";
import card3 from "../assets/card2-left.webp";
import card4 from "../assets/card3-right.webp";
import card5 from "../assets/card1-right.webp";
import { useCart } from '../context/CartContext';
import { useRouter } from "next/navigation";

export default function ProductDetails() {
  const searchParams = useSearchParams();
  const productName = searchParams.get('name');
  const { addToCart } = useCart();
  const router = useRouter();
  
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedColor, setSelectedColor] = useState("");
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const [product, setProduct] = useState(null);
  const [showAddedToCart, setShowAddedToCart] = useState(false);

  // Mock product data - in a real app, this would come from an API
  const products = [
    {
      name: "Premium Wool Socks",
      originalPrice: 39.99,
      price: 29.99,
      category: "Woollen Shocks",
      images: [card1, card2, card3, card1, card2],
      rating: 4.5,
      reviews: 128,
      description: "Premium quality wool socks for ultimate comfort and warmth. Perfect for cold weather.",
      colors: ["brown", "navy", "black"],
      sizes: ["S", "M", "L", "XL"],
      material: "Wool",
      gender: "Unisex"
    },
    {
      name: "Cotton Comfort Socks",
      originalPrice: 29.99,
      price: 19.99,
      category: "Cotton Shocks",
      images: [card2, card3, card1, card2, card3],
      rating: 4.2,
      reviews: 95,
      description: "Soft and breathable cotton socks for everyday comfort. Ideal for daily wear.",
      colors: ["white", "gray", "black"],
      sizes: ["S", "M", "L", "XL"],
      material: "Cotton",
      gender: "Unisex"
    },
    {
      name: "Silk Luxury Socks",
      originalPrice: 39.99,
      price: 39.99,
      category: "Silk Shocks",
      images: [card3, card1, card2, card3, card1],
      rating: 4.8,
      reviews: 64,
      description: "Luxurious silk socks for special occasions. Elegant and comfortable.",
      colors: ["black", "navy", "burgundy"],
      sizes: ["S", "M", "L", "XL"],
      material: "Silk",
      gender: "Unisex"
    },
    {
      name: "Winter Thermal Socks",
      originalPrice: 34.99,
      price: 34.99,
      category: "Winter Special",
      images: [card1, card2, card3, card1, card2],
      rating: 4.6,
      reviews: 112,
      description: "Extra warm thermal socks for extreme cold weather. Stay cozy all winter long.",
      colors: ["gray", "black", "navy"],
      sizes: ["S", "M", "L", "XL"],
      material: "Thermal",
      gender: "Unisex"
    },
    {
      name: "Summer Breathable Socks",
      originalPrice: 24.99,
      price: 24.99,
      category: "Summer Special",
      images: [card2, card3, card1, card2, card3],
      rating: 4.3,
      reviews: 87,
      description: "Lightweight and breathable socks perfect for summer. Stay cool and comfortable.",
      colors: ["white", "light gray", "beige"],
      sizes: ["S", "M", "L", "XL"],
      material: "Cotton Blend",
      gender: "Unisex"
    },
    {
      name: "Net Pattern Socks",
      originalPrice: 22.99,
      price: 22.99,
      category: "Net Shocks",
      images: [card3, card1, card2, card3, card1],
      rating: 4.4,
      reviews: 73,
      description: "Stylish net pattern socks for a unique look. Fashion meets comfort.",
      colors: ["black", "white", "red"],
      sizes: ["S", "M", "L", "XL"],
      material: "Net",
      gender: "Unisex"
    }
  ];

  useEffect(() => {
    if (productName) {
      const foundProduct = products.find(p => p.name === decodeURIComponent(productName));
      if (foundProduct) {
        setProduct(foundProduct);
        setSelectedColor(foundProduct.colors[0]);
        setSelectedSize(foundProduct.sizes[0]);
      }
    }
  }, [productName]);

  if (!product) {
    return (
      <div className="loading-container">
        <Header />
        <div className="loading">Loading...</div>
        <Footer />
      </div>
    );
  }

  // Mock reviews
  const reviews = [
    {
      name: "Samantha D.",
      verified: true,
      rating: 5,
      text: "I absolutely love this Shocks! The design is unique and the fabric feels so comfortable. As a fellow designer, I appreciate the attention to detail. It's become my favorite go-to shocks.",
      date: "August 14, 2023",
    },
    {
      name: "Ethan R.",
      verified: true,
      rating: 4.5,
      text: "I absolutely love this Shocks! The design is unique and the fabric feels so comfortable. As a fellow designer, I appreciate the attention to detail. It's become my favorite go-to shocks.",
      date: "August 14, 2023",
    },
    {
      name: "Olivia P.",
      verified: true,
      rating: 4.5,
      text: "I absolutely love this Shocks! The design is unique and the fabric feels so comfortable. As a fellow designer, I appreciate the attention to detail. It's become my favorite go-to shocks.",
      date: "August 14, 2023",
    },
  ];

  function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    return (
      <span className="review-stars">
        {Array(fullStars)
          .fill()
          .map((_, i) => (
            <span key={i}>★</span>
          ))}
        {halfStar && <span>☆</span>}
        {Array(5 - fullStars - (halfStar ? 1 : 0))
          .fill()
          .map((_, i) => (
            <span key={i + fullStars + 1}>☆</span>
          ))}
      </span>
    );
  }

  const handleAddToCart = () => {
    if (!selectedColor || !selectedSize) {
      alert('Please select both color and size');
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
    setShowAddedToCart(true);
    setTimeout(() => setShowAddedToCart(false), 2000);
  };

  const handleBuyNow = () => {
    if (!selectedColor || !selectedSize) {
      alert('Please select both color and size');
      return;
    }
    addToCart(product, selectedColor, selectedSize, quantity);
    router.push('/checkout');
  };

  return (
    <div className="product-details-container">
      <Header />
      <div className="product-details">
        <div className="product-images">
          <Image
            className="main-image"
            src={product.images[selectedThumbnail]}
            alt={product.name}
            width={500}
            height={500}
            style={{ objectFit: 'cover' }}
          />
          <div className="thumbnail-images">
            {product.images.map((src, idx) => (
              <Image
                key={idx}
                src={src}
                alt={`${product.name} thumbnail ${idx + 1}`}
                className={selectedThumbnail === idx ? "active" : ""}
                onClick={() => setSelectedThumbnail(idx)}
                width={100}
                height={100}
                style={{ objectFit: 'cover' }}
              />
            ))}
          </div>
        </div>
        <div className="product-info">
          <h1>{product.name}</h1>
          <div className="product-rating-row">
            <span className="stars">★ ★ ★ ☆ ☆</span>
            <span className="rating-value">{product.rating}</span>
            <span className="review-count">{product.reviews}</span>
            <span className="sku-label">| SKU: <span className="sku-value">E7F8G9H0</span></span>
          </div>
          <hr className="product-divider" />
          <div className="product-desc-short">
            <span>{product.description}</span>
          </div>
          <div className="product-price-row">
            <span className="current-price">${product.price}</span>
            <span className="original-price">${product.originalPrice}</span>
          </div>
          <div className="product-options">
            <div className="colors">
              <span className="option-label">Select Colors</span>
              <div className="color-options">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    className={`color-option${selectedColor === color ? " selected" : ""}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  >
                    {selectedColor === color && (
                      <span className="color-check">✔</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="sizes">
              <span className="option-label">Choose Size</span>
              <div className="size-options">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className={`size-option${selectedSize === size ? " selected" : ""}`}
                    onClick={() => setSelectedSize(size)}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="product-special-offer">
            <span className="special-offer-label">Special Offer :</span>
            <span className="special-offer-timer">
              <span className="timer-box">81</span>
              <span className="timer-box">06</span>
              <span className="timer-box">50</span>
              <span>:</span>
              <span className="timer-box">02</span>
            </span>
            <span className="special-offer-note">Remains until the end of the offer.</span>
          </div>
          <div className="product-action-box">
            <div className="quantity-and-buttons">
              <div className="quantity-box">
                <button onClick={() => setQuantity(q => Math.max(1, q - 1))} className="quantity-btn">-</button>
                <span className="quantity-value">{quantity}</span>
                <button onClick={() => setQuantity(q => q + 1)} className="quantity-btn">+</button>
              </div>
              <button className="add-to-cart" onClick={handleAddToCart}>
                {showAddedToCart ? 'Added to Cart!' : 'Add to cart'}
              </button>
              <button className="buy-now" onClick={handleBuyNow}>
                Buy Now
              </button>
            </div>
          </div>
          <div className="product-info-extra">
            <div className="payment-info">
              <span className="info-icon">
                {/* Simple black/white SVG icon for payment */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
              </span>
              <span>
                <strong>Payment.</strong> Payment upon receipt of goods, Payment by card in the department, Google Pay, Online card, -5% discount in case of payment
              </span>
            </div>
            <div className="warranty-info">
              <span className="info-icon">
                {/* Simple black/white SVG icon for warranty */}
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#222" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
              </span>
              <span>
                <strong>Warranty.</strong> The Consumer Protection Act does not provide for the return of this product of proper quality.
              </span>
            </div>
          </div>
        </div>
      </div>
      {/* Tabs for Description and Review */}
      <div className="product-tabs-section">
      <div className="product-tabs-container">
        <div className="product-tabs">
          <button
            className={`tab${activeTab === "description" ? " active" : ""}`}
          onClick={() => setActiveTab("description")}
        >
          Description
        </button>
        <button
          className={`tab${activeTab === "review" ? " active" : ""}`}
          onClick={() => setActiveTab("review")}
        >
          Review
        </button>
      </div>
      {/* Tab Content */}
      {activeTab === "description" ? (
        <div className="product-description">
          <p>Lorem ipsum dolor sit amet consectetur adipiscing elit. Error in vero sapiente odio, error dolore vero temporibus consequatur, nobis veniam odit dignissimos consequatur quae in perferendis doloribudebitis corporis, eaque dicta, repellat amet, illum adipisci vel perferendis dolor! Quis vel consequuntur repellat distinctio rem. Corrupti ratione alias odio,error dolore temporibus consequatur, nobis veniam odit laborum dignissimos consequatur quae vero in perferendis provident quis.</p>
          <h3>Packaging & Delivery</h3>
          <p>Lorem ipsum dolor sit amet consectetur adipisicing elit. Error in vero perferendis dolor! Quis vel consequuntur repellat distinctio rem. Corrupti ratione alias odio, error dolore temporibus consequatur, nobis veniam odit laborum dignissimosconsequatur quae vero in perferendis provident quis.</p>
        </div>
      ) : (
        <div className="product-reviews">
          {reviews.map((review, idx) => (
            <div className="review-card" key={idx}>
              <div className="review-header">
                {renderStars(review.rating)}
                <span className="review-user">
                  <h3>{review.name}</h3>
                  {review.verified && <span className="review-verified">●</span>}
                </span>
              </div>
              <div className="review-body">
                <p>"{review.text}"</p>
              </div>
              <div className="review-date">Posted on {review.date}</div>
            </div>
          ))}
          <button className="load-more-reviews">Load More Reviews</button>
        </div>
      )}
      </div>
      </div>
      <Footer />
    </div>
  );
} 
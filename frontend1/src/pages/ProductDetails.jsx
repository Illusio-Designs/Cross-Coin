import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";
import Image from "next/image";
import card1 from "../assets/card1-right.webp";
import card2 from "../assets/card3-right.webp";
import card3 from "../assets/card2-left.webp";
import card4 from "../assets/card3-right.webp";
import card5 from "../assets/card1-right.webp";

export default function ProductDetails() {
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedColor, setSelectedColor] = useState("brown");
  const [selectedSize, setSelectedSize] = useState("Large");
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState("description");
  const thumbnails = [card1, card2, card3, card4, card5];
  const colors = [
    { name: "brown", hex: "#5a4a2f" },
    { name: "green", hex: "#3b5d53" },
    { name: "navy", hex: "#2d2e4a" },
  ];
  const sizes = [
    { name: "Small", disabled: false },
    { name: "Medium", disabled: false },
    { name: "Large", disabled: false },
    { name: "X-Large", disabled: true },
  ];

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

  return (
    <div className="product-details-container">
      <Header />
      <div className="product-details">
        <div className="product-images">
          <Image
            className="main-image"
            src={thumbnails[selectedThumbnail]}
            alt="Main Product Image"
          />
          <div className="thumbnail-images">
            {thumbnails.map((src, idx) => (
              <Image
                key={idx}
                src={src}
                alt={`Thumbnail ${idx + 1}`}
                className={selectedThumbnail === idx ? "active" : ""}
                onClick={() => setSelectedThumbnail(idx)}
              />
            ))}
          </div>
        </div>
        <div className="product-info">
          <h1>Unisex Cotton Men And Women Solid Ankle Length Socks</h1>
          <div className="product-rating-row">
            <span className="stars">★ ★ ★ ☆ ☆</span>
            <span className="rating-value">3.00</span>
            <span className="review-count">2</span>
            <span className="sku-label">| SKU: <span className="sku-value">E7F8G9H0</span></span>
          </div>
          <hr className="product-divider" />
          <div className="product-desc-short">
            <span>
              Vivamus adipiscing nisl ut dolor dignissim semper. Nulla luctus malesuada tincidunt. Class aptent taciti sociosqu ad litora torquent Vivamus adipiscing nisl ut dolor dignissim semper.
            </span>
          </div>
          <div className="product-price-row">
            <span className="current-price">$120</span>
            <span className="original-price">$150</span>
          </div>
          <div className="product-options">
            <div className="colors">
              <span className="option-label">Select Colors</span>
              <div className="color-options">
                {colors.map((color) => (
                  <button
                    key={color.name}
                    className={`color-option${selectedColor === color.name ? " selected" : ""}`}
                    style={{ backgroundColor: color.hex }}
                    onClick={() => setSelectedColor(color.name)}
                  >
                    {selectedColor === color.name && (
                      <span className="color-check">✔</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="sizes">
              <span className="option-label">Choose Size</span>
              <div className="size-options">
                {sizes.map((size) => (
                  <button
                    key={size.name}
                    className={`size-option${selectedSize === size.name ? " selected" : ""}${size.disabled ? " disabled" : ""}`}
                    onClick={() => !size.disabled && setSelectedSize(size.name)}
                    disabled={size.disabled}
                  >
                    {size.name}
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
              <button className="add-to-cart">
                 Add to cart
              </button>
              <button className="buy-now">
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
                  <span className="review-user-initial">{review.name.split(" ")[0]}</span> <b>{review.name}</b>
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
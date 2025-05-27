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
            <span className="special-offer-timer">81<span>:</span>06<span>:</span>50<span>:</span>02</span>
            <span className="special-offer-note">Remains until the end of the offer.</span>
          </div>
          <div className="product-quantity">
            <button onClick={() => setQuantity(q => Math.max(1, q - 1))}>-</button>
            <span>{quantity}</span>
            <button onClick={() => setQuantity(q => q + 1)}>+</button>
          </div>
          <div className="product-buttons">
            <button className="add-to-cart">Add to cart</button>
            <button className="buy-now">Buy Now</button>
          </div>
          <div className="product-info-extra">
            <div className="payment-info">
              <span className="info-icon">💳</span>
              <span className="info-label">Payment.</span> Payment upon receipt of goods, Payment by card in the department, Google Pay, Online card, <b>-5% discount in case of payment</b>
            </div>
            <div className="warranty-info">
              <span className="info-icon">🛡️</span>
              <span className="info-label">Warranty.</span> The Consumer Protection Act does not provide for the return of this product of proper quality.
            </div>
          </div>
        </div>
      </div>
      <div className="product-tabs">
        <button className="tab active">Description</button>
        <button className="tab">Review</button>
      </div>
      <div className="product-description">
        <h2>Description</h2>
        <p>Lorem ipsum dolor sit amet consectetur adipiscing elit...</p>
      </div>
      <div className="product-reviews">
        <h2>Reviews</h2>
        <p>No reviews yet.</p>
      </div>
      <Footer />
    </div>
  );
} 
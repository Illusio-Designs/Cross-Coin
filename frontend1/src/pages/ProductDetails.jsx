import { useState } from "react";
import Footer from "../components/Footer";
import Header from "../components/Header";

export default function ProductDetails() {
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [selectedColor, setSelectedColor] = useState("black");
  const [selectedSize, setSelectedSize] = useState("Large");
  const [quantity, setQuantity] = useState(1);
  const thumbnails = [
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80",
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80",
  ];
  const colors = ["black", "gray", "navy"];
  const sizes = ["Small", "Medium", "Large", "X-Large"];

  return (
    <div className="product-details-container">
      <Header />
      <div className="product-details">
        <div className="product-images">
          <img
            className="main-image"
            src={thumbnails[selectedThumbnail].replace("w=100", "w=600")}
            alt="Main Product Image"
          />
          <div className="thumbnail-images">
            {thumbnails.map((src, idx) => (
              <img
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
          <div className="product-rating">
            <span>3.00</span>
            <span>20 reviews</span>
            <span>SKU: E79GH90</span>
          </div>
          <div className="product-price">
            <span className="current-price">$120</span>
            <span className="original-price">$150</span>
          </div>
          <div className="product-options">
            <div className="colors">
              <span>Select Colors:</span>
              {colors.map((color) => (
                <button
                  key={color}
                  className={`color-option ${color} ${selectedColor === color ? "active" : ""}`}
                  onClick={() => setSelectedColor(color)}
                ></button>
              ))}
            </div>
            <div className="sizes">
              <span>Choose Size:</span>
              {sizes.map((size) => (
                <button
                  key={size}
                  className={`size-option${selectedSize === size ? " active" : ""}`}
                  onClick={() => setSelectedSize(size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          <div className="product-special-offer">
            <span className="special-offer-label">Special Offer :</span>
            <span className="special-offer-timer">81<span>:</span>06<span>:</span>50<span>:</span>02</span>
            <span className="special-offer-fav">&#9825;</span>
            <span className="special-offer-note">Favorites until the end of the offer.</span>
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
              <p><b>Payment:</b> Payment upon receipt of goods, Payment by card in the department, Google Pay, Online card, 5% discount in case of payment</p>
            </div>
            <div className="warranty-info">
              <p><b>Warranty:</b> The Consumer Protection Act does not provide for the return of this product of proper quality.</p>
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
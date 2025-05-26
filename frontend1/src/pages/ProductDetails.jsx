import Footer from "../components/Footer";
import Header from "../components/Header";

export default function ProductDetails() {
  return (
    <div className="product-details-container">
      <Header />
      <div className="product-details">
        <div className="product-images">
          <img className="main-image" src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80" alt="Main Product Image" />
          <div className="thumbnail-images">
            <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" alt="Thumbnail 1" />
            <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" alt="Thumbnail 2" />
            <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" alt="Thumbnail 3" />
            <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" alt="Thumbnail 4" />
            <img src="https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=100&q=80" alt="Thumbnail 5" />
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
              <button className="color-option black"></button>
              <button className="color-option gray"></button>
              <button className="color-option navy"></button>
            </div>
            <div className="sizes">
              <span>Choose Size:</span>
              <button className="size-option">Small</button>
              <button className="size-option">Medium</button>
              <button className="size-option active">Large</button>
              <button className="size-option">X-Large</button>
            </div>
          </div>
          <div className="product-buttons">
            <button className="add-to-cart">Add to cart</button>
            <button className="buy-now">Buy Now</button>
          </div>
          <div className="product-timer">
            <span>Special Offer: 81:06:50:02</span>
          </div>
          <div className="product-info-extra">
            <div className="payment-info">
              <p>Payment upon receipt of goods, Payment by card in the department, Google Pay, Online card, 5% discount in case of payment</p>
            </div>
            <div className="warranty-info">
              <p>Warranty: The Consumer Protection Act does not provide for the return of this product of proper quality.</p>
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
      </div>
      <Footer />
    </div>
  );
} 
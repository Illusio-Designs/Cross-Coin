import Footer from "../components/Footer";
import Header from "../components/Header";
import '../styles/pages/ProductDetails.css';

export default function ProductDetails() {
  return (
    <>
      <Header />
      <div className="product-details-container">
        <h1>Product Details</h1>
        {/* Product info, images, price, add to cart button, etc. */}
      </div>
      <Footer />
    </>
  );
} 
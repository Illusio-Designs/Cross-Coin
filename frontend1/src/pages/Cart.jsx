import Footer from "../components/Footer";
import Header from "../components/Header";
import '../styles/pages/Cart.css';

export default function Cart() {
  return (
    <>
      <Header />
      <div className="cart-container">
        <h1>Your Cart</h1>
        {/* Cart items, total, checkout button, etc. */}
      </div>
      <Footer />
    </>
  );
} 
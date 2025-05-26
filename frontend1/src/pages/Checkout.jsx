import Footer from "../components/Footer";
import Header from "../components/Header";

export default function Checkout() {
  return (
    <>
      <Header />
      <div className="checkout-container">
        <h1>Checkout</h1>
        {/* Order summary, payment form, etc. */}
      </div>
      <Footer />
    </>
  );
} 
import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import "../styles/pages/ThankYou.css"; // Import new stylesheet

export default function ThankYou() {
  const router = useRouter();
  const { order_number } = router.query;

  // Calculate estimated delivery date (e.g., 5 days from now)
  const getDeliveryDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 5);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleShopAgain = () => {
    router.push('/Products');
  };

  const handleTrackOrder = () => {
    router.push('/profile'); // Redirect to profile page
  };

  return (
    <>
      <Header />
      <div className="thankyou-container">
        <div className="thankyou-icon-container">
            <span className="thankyou-icon">✓</span>
        </div>
        <h1>Thank you for your order!</h1>
        {order_number && (
          <p className="order-confirmation">
            Your order <strong>#{order_number}</strong> has been placed.
          </p>
        )}
        <p className="thankyou-desc">
          An email confirmation has been sent to your registered email address.
        </p>
        <div className="delivery-info">
            Estimated delivery by <strong>{getDeliveryDate()}</strong>
        </div>
        <div className="thankyou-buttons">
          <button className="shop-again" onClick={handleShopAgain}>Continue Shopping</button>
          <button className="track-order" onClick={handleTrackOrder}>Track Your Order</button>
        </div>
      </div>
      <Footer />
    </>
  );
} 
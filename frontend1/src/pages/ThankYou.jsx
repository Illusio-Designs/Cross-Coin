import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";

export default function ThankYou() {
  const router = useRouter();

  const handleShopAgain = () => {
    router.push('/Products');
  };

  return (
    <>
      <Header />
      <div className="thankyou-container">
        <div className="thankyou-cart-icon">
          {/* Simple SVG cart icon */}
          <svg width="100%" height="100%" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="16" y="20" width="32" height="20" rx="4" fill="#E94B5A"/>
            <circle cx="24" cy="48" r="4" fill="#E94B5A"/>
            <circle cx="40" cy="48" r="4" fill="#E94B5A"/>
            <rect x="20" y="16" width="24" height="8" rx="4" fill="#F7C7CE"/>
          </svg>
        </div>
        <h1>Thanks for the order</h1>
        <p className="thankyou-desc">
          Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry.
        </p>
        <div className="thankyou-buttons">
          <button className="shop-again" onClick={handleShopAgain}>Shop Again</button>
          <button className="track-order">Track Order</button>
        </div>
      </div>
      <Footer />
    </>
  );
} 
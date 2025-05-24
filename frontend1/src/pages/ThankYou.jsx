import Footer from "../components/Footer";
import Header from "../components/Header";
import '../styles/pages/ThankYou.css';

export default function ThankYou() {
  return (
    <>
      <Header />
      <div className="thankyou-container">
        <h1>Thank You for Your Order!</h1>
        {/* Order confirmation, next steps, etc. */}
      </div>
      <Footer />
    </>
  );
} 
import Home from "./home.jsx";
import Products from "./Products.jsx";
import Link from "next/link";

export default function MainPage() {
  return (
    <>
      <Home />
      <nav style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', margin: '2rem 0' }}>
        <Link href="/Products">Products</Link>
        <Link href="/ProductDetails">Product Details</Link>
        <Link href="/Cart">Cart</Link>
        <Link href="/Shipping">Shipping</Link>
        <Link href="/Checkout">Checkout</Link>
        <Link href="/ThankYou">Thank You</Link>
        <Link href="/login">Login</Link>
        <Link href="/register">Register</Link>
        <Link href="/policy">Policy</Link>
      </nav>
      <Products />
    </>
  );
} 
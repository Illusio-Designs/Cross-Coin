import Home from "./Home.jsx";
import Products from "./Products.jsx";
import ProductDetails from "./ProductDetails.jsx";
import Cart from "./Cart.jsx";
import Checkout from "./Checkout.jsx";
import Shipping from "./Shipping.jsx";
import Login from "./login.jsx";
import Register from "./register.jsx";
import ThankYou from "./ThankYou.jsx";

export default function MainPage() {
  return (
    <>
      <Home />
      <Products />
      <ProductDetails />
      <Cart />
      <Checkout />
      <Shipping /> 
      <Login />
      <Register />
      <ThankYou />
    </>
  );
} 
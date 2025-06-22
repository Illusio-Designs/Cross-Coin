import { useRouter } from "next/router";
import Image from "next/image";
import { FiTrash2 } from "react-icons/fi";
import { FaBoxOpen } from "react-icons/fa";
import { useCart } from "../../context/CartContext";

export default function CartStep() {
  const router = useRouter();
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  
  return (
    <div className="cart-items-list-container">
        <h2>Shopping Cart</h2>
        <div className={`cart-items-list${cartItems.length === 0 ? ' empty' : ''}`}>
        {cartItems.length === 0 ? (
            <div className="empty-cart">
            <div className="empty-cart-icon"><FaBoxOpen /></div>
            <div className="empty-cart-text">YOUR CART IS CURRENTLY EMPTY.</div>
            <button className="checkout-btn" onClick={() => router.push('/Products')}>Shop Now</button>
            </div>
        ) : (
            cartItems.map((item) => (
            <div className="cart-item" key={item.id}>
                <Image src={item.image || '/placeholder.png'} alt={item.name} width={100} height={100} className="cart-item-img" />
                <div className="cart-item-details">
                <div className="cart-item-title">{item.name}</div>
                <div className="cart-item-meta">Size: {item.size || 'N/A'}</div>
                <div className="cart-item-meta">Color: {item.color || 'N/A'}</div>
                <div className="cart-item-price">₹{item.price}</div>
                </div>
                <div className="cart-item-qty">
                <button
                    className={`qty-btn ${item.quantity === 1 ? 'qty-btn-disabled' : ''}`}
                    onClick={() => updateQuantity(item.id, -1)}
                    disabled={item.quantity === 1}
                >-</button>
                <span>{item.quantity}</span>
                <button
                    className="qty-btn"
                    onClick={() => updateQuantity(item.id, 1)}
                >+</button>
                </div>
                <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}><FiTrash2 /></button>
            </div>
            ))
        )}
        </div>
    </div>
  );
} 
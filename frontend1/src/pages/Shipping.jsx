import Footer from "../components/Footer";
import Header from "../components/Header";
import { useRouter } from "next/router";
import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { createShippingAddress, getUserShippingAddresses, updateShippingAddress, deleteShippingAddress, setDefaultShippingAddress } from '../services/publicindex';

export default function Shipping() {
  const router = useRouter();
  const { cartItems } = useCart();
  const [addresses, setAddresses] = useState([]);
  const [loadingAddresses, setLoadingAddresses] = useState(true);
  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    state: '',
    postalCode: '',
    country: '',
    phoneNumber: '',
    isDefault: false
  });
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAddresses = async () => {
      setLoadingAddresses(true);
      try {
        const data = await getUserShippingAddresses();
        setAddresses(data);
      } catch (err) {
        setError(err.message || "Failed to load addresses");
      }
      setLoadingAddresses(false);
    };
    fetchAddresses();
  }, []);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setAddressForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      if (editingId) {
        await updateShippingAddress(editingId, addressForm);
      } else {
        await createShippingAddress(addressForm);
      }
      setAddressForm({ address: '', city: '', state: '', postalCode: '', country: '', phoneNumber: '', isDefault: false });
      setEditingId(null);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      setError(err.message || "Failed to save address");
    }
  };

  const handleEdit = (address) => {
    setEditingId(address.id);
    setAddressForm({
      address: address.address,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      phoneNumber: address.phoneNumber,
      isDefault: address.isDefault
    });
  };

  const handleDelete = async (id) => {
    try {
      await deleteShippingAddress(id);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      setError(err.message || "Failed to delete address");
    }
  };

  const handleSetDefault = async (id) => {
    try {
      await setDefaultShippingAddress(id);
      const data = await getUserShippingAddresses();
      setAddresses(data);
    } catch (err) {
      setError(err.message || "Failed to set default address");
    }
  };

  // Calculate order summary
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const discount = Math.round(subtotal * 0.2);
  const total = subtotal - discount;

  return (
    <>
      <Header />
      <div className="shipping-container">
        <div className="shipping-main">
          <div className="shipping-section">
            <div className="contact-info-section">
              <div className="contact-info-header">
                <h3>Contact Information</h3>
                <span className="login-link">Already have an account? <a href="#">Login</a></span>
              </div>
              <input className="contact-input" placeholder="Email Address/Mobile Number" />
            </div>
            <div className="shipping-form-container">
              <h3>Shipping Address</h3>
              <form onSubmit={handleSubmit} className="shipping-form">
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Address *</label>
                    <input 
                      type="text" 
                      name="address"
                      value={addressForm.address}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>City *</label>
                    <input 
                      type="text" 
                      name="city"
                      value={addressForm.city}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>State *</label>
                    <input 
                      type="text" 
                      name="state"
                      value={addressForm.state}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Postal Code *</label>
                    <input 
                      type="text" 
                      name="postalCode"
                      value={addressForm.postalCode}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
                <div className="form-row-2col">
                  <div className="form-group">
                    <label>Country *</label>
                    <input 
                      type="text" 
                      name="country"
                      value={addressForm.country}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number *</label>
                    <input 
                      type="text" 
                      name="phoneNumber"
                      value={addressForm.phoneNumber}
                      onChange={handleInputChange}
                      required 
                    />
                  </div>
                </div>
                <button type="submit" className="save-address-btn">Save Address</button>
              </form>
            </div>
            <div className="delivery-methods-section">
              <h4>Delivery Methods</h4>
              <div className="delivery-methods">
                <label className="delivery-card selected">
                  <input type="radio" name="delivery" defaultChecked />
                  <div>
                    <div className="delivery-title">Standard Delivery</div>
                    <div className="delivery-desc">Delivery in 5-7 working days</div>
                  </div>
                  <div className="delivery-fee free">Free</div>
                </label>
                <label className="delivery-card">
                  <input type="radio" name="delivery" />
                  <div>
                    <div className="delivery-title">Fast Delivery</div>
                    <div className="delivery-desc">Delivery in 2-3 working days</div>
                  </div>
                  <div className="delivery-fee paid">$10</div>
                </label>
              </div>
            </div>
          </div>
          <div className="order-summary-section">
            <div className="order-summary-box">
              <div className="order-summary-title">Order Summary</div>
              <div className="order-summary-row">
                <span>Subtotal</span>
                <span>${subtotal}</span>
              </div>
              <div className="order-summary-row">
                <span>Discount (-20%)</span>
                <span className="discount">-${discount}</span>
              </div>
              <div className="order-summary-row">
                <span>Delivery Fee</span>
                <span>$0</span>
              </div>
              <div className="order-summary-total">
                <span>Total</span>
                <span>${total}</span>
              </div>
              <div className="promo-row">
                <input className="promo-input" placeholder="Add promo code" />
                <button className="promo-apply">Apply</button>
              </div>
              <button 
                className="checkout-btn"
                onClick={handleSubmit}
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
} 
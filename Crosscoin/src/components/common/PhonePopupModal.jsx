import { useState, useEffect } from 'react';
import axios from 'axios';

const STORAGE_KEY = 'cc_popup_dismissed';
const DELAY_MS = 5000; // show after 5s

export default function PhonePopupModal() {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [coupon, setCoupon] = useState(null);
  const [error, setError] = useState('');

  // Wait for client-side mount before checking localStorage
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (localStorage.getItem(STORAGE_KEY)) return;

    const timer = setTimeout(() => setVisible(true), DELAY_MS);
    return () => clearTimeout(timer);
  }, [mounted]);

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 10) {
      setError('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const API = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
      const { data } = await axios.post(`${API}/api/leads/phone`, { phone: digits });
      if (data.success) {
        setCoupon(data.coupon);
        localStorage.setItem(STORAGE_KEY, '1');
      } else {
        setError(data.message || 'Something went wrong');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="phone-popup-overlay" onClick={dismiss}>
      <div className="phone-popup-box" onClick={(e) => e.stopPropagation()}>
        <button className="phone-popup-close" onClick={dismiss} aria-label="Close">✕</button>

        {!coupon ? (
          <>
            <div className="phone-popup-emoji">🎉</div>
            <h2 className="phone-popup-title">Get 10% OFF</h2>
            <p className="phone-popup-subtitle">
              Enter your WhatsApp number and we'll send you an exclusive coupon — valid on <strong>prepaid orders only</strong>.
            </p>
            <form onSubmit={handleSubmit} className="phone-popup-form">
              <div className="phone-popup-input-wrap">
                <span className="phone-popup-prefix">+91</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                  className="phone-popup-input"
                  autoFocus
                />
              </div>
              {error && <p className="phone-popup-error">{error}</p>}
              <button type="submit" className="phone-popup-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send My Coupon'}
              </button>
            </form>
            <p className="phone-popup-note">No spam. Unsubscribe anytime.</p>
          </>
        ) : (
          <>
            <div className="phone-popup-emoji">✅</div>
            <h2 className="phone-popup-title">Coupon Sent!</h2>
            <p className="phone-popup-subtitle">
              Your exclusive 10% OFF coupon has been sent to your WhatsApp. Please check your messages and use it at checkout on prepaid orders.
            </p>
            <p className="phone-popup-note">Didn't receive it? Check your WhatsApp or spam folder.</p>
            <button className="phone-popup-btn" onClick={dismiss}>Start Shopping</button>
          </>
        )}
      </div>
    </div>
  );
}

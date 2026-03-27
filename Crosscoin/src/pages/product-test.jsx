import { useState } from 'react';
import {
  FomoContainer,
  StockCounter,
  ViewCounter,
  PurchaseCounter,
  TimerBadge,
  RatingBadge,
  DiscountBadge,
  UrgencyBanner,
  TrustBadge,
} from '../components/common/FomoElements';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import MagicCheckoutIntegration from '../components/checkout/MagicCheckoutIntegration';
import InstagramGallery from '../components/common/InstagramGallery';

// ── Mini cart item row ──────────────────────────────────────────────────────
function CartItemRow({ item, onRemove, onQtyChange }) {
  const price = item.variation?.price || item.price || 0;
  const img = item.image?.image_url || item.image || null;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0', borderBottom: '1px solid #f0f0f0'
    }}>
      {img
        ? <img src={img} alt={item.name} width={56} height={56} style={{ objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} />
        : <div style={{ width: 56, height: 56, background: '#eee', borderRadius: 6, flexShrink: 0 }} />
      }
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ margin: 0, fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
        {item.size && <p style={{ margin: 0, fontSize: 12, color: '#888' }}>Size: {item.size}</p>}
        {item.color && <p style={{ margin: 0, fontSize: 12, color: '#888' }}>{item.color}</p>}
        <p style={{ margin: '4px 0 0', fontSize: 14, fontWeight: 500 }}>₹{parseFloat(price).toFixed(2)}</p>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button onClick={() => onQtyChange(item.id, -1)} disabled={item.quantity <= 1}
          style={{ width: 26, height: 26, border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 16 }}>−</button>
        <span style={{ minWidth: 20, textAlign: 'center', fontSize: 14 }}>{item.quantity}</span>
        <button onClick={() => onQtyChange(item.id, 1)}
          style={{ width: 26, height: 26, border: '1px solid #ddd', borderRadius: 4, background: '#fff', cursor: 'pointer', fontSize: 16 }}>+</button>
      </div>
      <button onClick={() => onRemove(item.id)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e53e3e', fontSize: 18, padding: '0 4px' }}>✕</button>
    </div>
  );
}

export default function ProductTestPage() {
  const expiresAt = new Date(Date.now() + 3 * 60 * 60 * 1000);
  const { cartItems, cartTotal, removeFromCart, updateQuantity, clearCart } = useCart();
  const { user } = useAuth();

  const [checkoutSuccess, setCheckoutSuccess] = useState(null);
  const [checkoutError, setCheckoutError] = useState(null);

  const handleSuccess = (data) => {
    setCheckoutSuccess(data);
    setCheckoutError(null);
    clearCart(); // clear cart after successful order
  };

  const handleError = (err) => {
    setCheckoutError(err?.message || 'Payment failed');
    setCheckoutSuccess(null);
  };

  const openWhatsApp = () => {
    const message = encodeURIComponent('Hi CrossCoin team, I need help with my order.');
    window.open(`https://wa.me/919712891700?text=${message}`, '_blank');
  };

  const openRewards = () => {
    window.open('/profile', '_blank');
  };

  return (
    <div style={{ maxWidth: 480, margin: '60px auto', padding: '0 16px' }}>
      <h2 style={{ marginBottom: 20 }}>FOMO Elements Preview</h2>
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          type="button"
          onClick={openWhatsApp}
          style={{
            border: 0,
            background: '#25D366',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          WhatsApp Support
        </button>
        <button
          type="button"
          onClick={openRewards}
          style={{
            border: 0,
            background: '#111',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            cursor: 'pointer',
            fontWeight: 600
          }}
        >
          Rewards
        </button>
      </div>
      <FomoContainer>
        <StockCounter stock={3} />
        <ViewCounter views={142} />
        <PurchaseCounter purchases={1280} />
        <TimerBadge expiresAt={expiresAt} />
        <RatingBadge rating={4.6} reviews={238} />
        <DiscountBadge originalPrice={999} salePrice={629} />
        <UrgencyBanner message="Limited time offer — ends soon!" type="warning" />
        <UrgencyBanner message="Free delivery on this order" type="success" />
        <TrustBadge text="Trusted by thousands of customers" icon="🛡️" />
      </FomoContainer>

      {/* ── Cart + Magic Checkout Test Section ── */}
      <div style={{ marginTop: 40, border: '1px solid #e2e8f0', borderRadius: 12, padding: 20, background: '#fafafa' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: 18 }}>🛒 Cart — Magic Checkout Test</h3>

        {cartItems.length === 0 ? (
          <p style={{ color: '#888', textAlign: 'center', padding: '20px 0' }}>
            Your cart is empty. Add products from the store to test checkout.
          </p>
        ) : (
          <>
            <div>
              {cartItems.map(item => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onRemove={removeFromCart}
                  onQtyChange={updateQuantity}
                />
              ))}
            </div>

            <div style={{ marginTop: 16, paddingTop: 12, borderTop: '2px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16, marginBottom: 16 }}>
                <span>Total</span>
                <span>₹{cartTotal.toFixed(2)}</span>
              </div>

              <MagicCheckoutIntegration
                cartItems={cartItems}
                user={user}
                onSuccess={handleSuccess}
                onError={handleError}
              />

              {checkoutSuccess && (
                <div style={{ marginTop: 12, padding: 12, background: '#f0fff4', border: '1px solid #9ae6b4', borderRadius: 8, color: '#276749', fontSize: 14 }}>
                  ✅ Order placed! Order #{checkoutSuccess.order_number || checkoutSuccess.razorpay_order_id}
                </div>
              )}
              {checkoutError && (
                <div style={{ marginTop: 12, padding: 12, background: '#fff5f5', border: '1px solid #feb2b2', borderRadius: 8, color: '#c53030', fontSize: 14 }}>
                  ❌ {checkoutError}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Instagram Gallery Test</h3>
        <InstagramGallery />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Lookbook Test</h3>
        <p style={{ margin: '0 0 10px', color: '#666' }}>
          Full page preview:
          {' '}
          <a href="/Lookbook" target="_blank" rel="noreferrer">/Lookbook</a>
        </p>
        <iframe
          title="Lookbook Preview"
          src="/Lookbook"
          style={{ width: '100%', height: 680, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Reels Test</h3>
        <p style={{ margin: '0 0 10px', color: '#666' }}>
          Full page preview:
          {' '}
          <a href="/Reels" target="_blank" rel="noreferrer">/Reels</a>
        </p>
        <iframe
          title="Reels Preview"
          src="/Reels"
          style={{ width: '100%', height: 680, border: '1px solid #e2e8f0', borderRadius: 10, background: '#000' }}
        />
      </div>

      <div style={{ marginTop: 40 }}>
        <h3 style={{ margin: '0 0 12px', fontSize: 18 }}>Instagram Page Test</h3>
        <p style={{ margin: '0 0 10px', color: '#666' }}>
          Full page preview:
          {' '}
          <a href="/Instagram" target="_blank" rel="noreferrer">/Instagram</a>
        </p>
        <iframe
          title="Instagram Page Preview"
          src="/Instagram"
          style={{ width: '100%', height: 680, border: '1px solid #e2e8f0', borderRadius: 10, background: '#fff' }}
        />
      </div>
    </div>
  );
}

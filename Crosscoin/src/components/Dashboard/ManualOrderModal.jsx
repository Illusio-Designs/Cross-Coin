import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Input, Select } from '../ui';
import { productService, orderService, brandService } from '../../services';
import { showSuccess, showError } from '../../utils/toastNotification';
import { debounce } from 'lodash';

const IC = {
  plus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  minus: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>,
  search: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
};

const STATES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Chandigarh','Puducherry','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu','Lakshadweep'];

export default function ManualOrderModal({ isOpen, onClose, onOrderCreated }) {
  // Customer
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerName, setCustomerName] = useState('');

  // Address
  const [address, setAddress] = useState({ full_name: '', address: '', city: '', state: '', pincode: '', phone: '' });

  // Products
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [cartItems, setCartItems] = useState([]); // { product, variation, quantity }

  // Payment
  const [paymentType, setPaymentType] = useState('cod');
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState('');

  // Brand
  const [brands, setBrands] = useState([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load brands once
  useEffect(() => {
    brandService.getAllBrands(true)
      .then(r => { if (r.success) setBrands(r.data || []); })
      .catch(() => {});
  }, []);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setCustomerPhone(''); setCustomerEmail(''); setCustomerName('');
      setAddress({ full_name: '', address: '', city: '', state: '', pincode: '', phone: '' });
      setProductSearch(''); setSearchResults([]); setCartItems([]);
      setPaymentType('cod'); setPaymentStatus('pending'); setDiscount(0); setNotes('');
      setSelectedBrandId('');
    }
  }, [isOpen]);

  // Auto-fill address phone from customer phone
  useEffect(() => {
    if (customerPhone && !address.phone) {
      setAddress(a => ({ ...a, phone: customerPhone }));
    }
  }, [customerPhone]);

  // Product search
  const doSearch = useCallback(debounce(async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await productService.getAllProducts(1, 20, q);
      const products = data.products || data.data || [];
      setSearchResults(products);
    } catch { setSearchResults([]); }
    finally { setSearching(false); }
  }, 400), []);

  useEffect(() => { doSearch(productSearch); }, [productSearch, doSearch]);

  const addProduct = (product, variation) => {
    const existing = cartItems.find(c => c.variation.id === variation.id);
    if (existing) {
      setCartItems(cartItems.map(c => c.variation.id === variation.id ? { ...c, quantity: c.quantity + 1 } : c));
    } else {
      setCartItems([...cartItems, { product, variation, quantity: 1 }]);
    }
    setProductSearch('');
    setSearchResults([]);
  };

  const updateQty = (varId, delta) => {
    setCartItems(cartItems.map(c => {
      if (c.variation.id !== varId) return c;
      const newQty = c.quantity + delta;
      return newQty < 1 ? c : { ...c, quantity: newQty };
    }));
  };

  const removeItem = (varId) => {
    setCartItems(cartItems.filter(c => c.variation.id !== varId));
  };

  // Totals
  const subtotal = cartItems.reduce((s, c) => s + parseFloat(c.variation.price) * c.quantity, 0);
  const total = Math.max(0, subtotal - Number(discount || 0));

  const handleSubmit = async () => {
    // Validation
    if (!customerPhone || customerPhone.replace(/\D/g, '').length < 10) {
      showError(null, 'Enter a valid 10-digit phone number'); return;
    }
    if (!address.address || !address.city || !address.state || !address.pincode) {
      showError(null, 'Fill in all address fields'); return;
    }
    if (!cartItems.length) {
      showError(null, 'Add at least one product'); return;
    }
    if (!selectedBrandId) {
      showError(null, 'Please select a brand for this order'); return;
    }

    setSubmitting(true);
    try {
      const result = await orderService.createManualOrder({
        customer_phone: customerPhone.replace(/\D/g, '').slice(-10),
        customer_email: customerEmail || undefined,
        customer_name: customerName || address.full_name || undefined,
        shipping_address: {
          full_name: address.full_name || customerName,
          address: address.address,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
          phone: address.phone || customerPhone,
        },
        items: cartItems.map(c => ({
          product_id: c.product.id,
          variation_id: c.variation.id,
          quantity: c.quantity,
        })),
        payment_type: paymentType,
        payment_status: paymentStatus,
        discount_amount: Number(discount) || 0,
        notes: notes || undefined,
        brand_id: selectedBrandId,
      });

      showSuccess(null, `Order ${result.order?.order_number || ''} created!`);
      onOrderCreated?.();
      onClose();
    } catch (err) {
      showError(null, err?.message || 'Failed to create order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create Manual Order">
      <div className="mo-body">
        {/* ── Brand Selection ── */}
        <div className="mo-section">
          <h3 className="mo-section-title">Brand *</h3>
          <div className="input-container">
            <label className="input-label">Select Brand</label>
            <Select
              value={selectedBrandId}
              onChange={setSelectedBrandId}
              options={[
                { value: '', label: '— Select Brand —' },
                ...brands.map(b => ({ value: String(b.id), label: b.display_name || b.name }))
              ]}
              placeholder="Select Brand"
            />
          </div>
        </div>

        {/* ── Customer Info ── */}
        <div className="mo-section">
          <h3 className="mo-section-title">Customer</h3>
          <div className="mo-row">
            <Input label="Phone *" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} placeholder="10-digit mobile" />
            <Input label="Email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} placeholder="email@example.com" />
            <Input label="Name" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Customer name" />
          </div>
        </div>

        {/* ── Shipping Address ── */}
        <div className="mo-section">
          <h3 className="mo-section-title">Shipping Address</h3>
          <div className="mo-row">
            <Input label="Full Name" value={address.full_name} onChange={e => setAddress({ ...address, full_name: e.target.value })} placeholder="Recipient name" />
            <Input label="Phone" value={address.phone} onChange={e => setAddress({ ...address, phone: e.target.value })} placeholder="Delivery phone" />
          </div>
          <Input label="Address *" value={address.address} onChange={e => setAddress({ ...address, address: e.target.value })} placeholder="Street address, landmark" />
          <div className="mo-row">
            <Input label="City *" value={address.city} onChange={e => setAddress({ ...address, city: e.target.value })} placeholder="City" />
            <Input label="State *" type="select" value={address.state} onChange={e => setAddress({ ...address, state: e.target.value })} options={[{ value: '', label: 'Select State' }, ...STATES.map(s => ({ value: s, label: s }))]} />
            <Input label="Pincode *" value={address.pincode} onChange={e => setAddress({ ...address, pincode: e.target.value })} placeholder="6-digit PIN" />
          </div>
        </div>

        {/* ── Products ── */}
        <div className="mo-section">
          <h3 className="mo-section-title">Products</h3>
          <div className="mo-search-wrap">
            <span className="mo-search-icon">{IC.search}</span>
            <input
              type="text" className="mo-search-input"
              placeholder="Search products by name..."
              value={productSearch} onChange={e => setProductSearch(e.target.value)}
            />
            {searching && <span className="mo-searching">Searching...</span>}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mo-search-results">
              {searchResults.map(p => {
                const variations = p.ProductVariations || p.variations || [];
                return variations.map(v => (
                  <button key={v.id} type="button" className="mo-search-item" onClick={() => addProduct(p, v)}>
                    <span className="mo-search-item-name">{p.name}</span>
                    <span className="mo-search-item-var">
                      {v.attributeValues?.map(a => a.value).join(' / ') || v.sku || `Var #${v.id}`}
                    </span>
                    <span className="mo-search-item-price">₹{parseFloat(v.price).toFixed(0)}</span>
                    <span className="mo-search-item-stock">Stock: {v.stock}</span>
                  </button>
                ));
              })}
            </div>
          )}

          {/* Cart Items */}
          {cartItems.length > 0 && (
            <div className="mo-cart">
              {cartItems.map(c => (
                <div key={c.variation.id} className="mo-cart-item">
                  <div className="mo-cart-info">
                    <span className="mo-cart-name">{c.product.name}</span>
                    <span className="mo-cart-var">
                      {c.variation.attributeValues?.map(a => a.value).join(' / ') || c.variation.sku || ''}
                    </span>
                    <span className="mo-cart-price">₹{parseFloat(c.variation.price).toFixed(0)} × {c.quantity}</span>
                  </div>
                  <div className="mo-cart-actions">
                    <button type="button" className="mo-qty-btn" onClick={() => updateQty(c.variation.id, -1)}>{IC.minus}</button>
                    <span className="mo-qty">{c.quantity}</span>
                    <button type="button" className="mo-qty-btn" onClick={() => updateQty(c.variation.id, 1)}>{IC.plus}</button>
                    <button type="button" className="mo-remove-btn" onClick={() => removeItem(c.variation.id)}>{IC.trash}</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Payment & Summary ── */}
        <div className="mo-section">
          <h3 className="mo-section-title">Payment</h3>
          <div className="mo-row">
            <div className="input-container">
              <label className="input-label">Payment Type *</label>
              <Select value={paymentType} onChange={setPaymentType} options={[
                { value: 'cod', label: 'Cash on Delivery' },
                { value: 'razorpay', label: 'Prepaid (Razorpay)' },
                { value: 'upi', label: 'UPI' },
              ]} />
            </div>
            <div className="input-container">
              <label className="input-label">Payment Status</label>
              <Select value={paymentStatus} onChange={setPaymentStatus} options={[
                { value: 'pending', label: 'Pending' },
                { value: 'paid', label: 'Paid' },
              ]} />
            </div>
            <Input label="Discount (₹)" type="number" value={discount} onChange={e => setDiscount(e.target.value)} placeholder="0" />
          </div>
          <Input label="Order Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Internal notes..." />
        </div>

        {/* ── Summary ── */}
        <div className="mo-summary">
          <div className="mo-summary-row"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div>
          {Number(discount) > 0 && <div className="mo-summary-row mo-discount"><span>Discount</span><span>-₹{Number(discount).toFixed(2)}</span></div>}
          <div className="mo-summary-row mo-total"><span>Total</span><span>₹{total.toFixed(2)}</span></div>
        </div>

        {/* ── Actions ── */}
        <div className="modal-footer">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={submitting || !cartItems.length}>
            {submitting ? 'Creating...' : 'Create Order'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

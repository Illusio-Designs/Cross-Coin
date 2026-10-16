import Head from 'next/head';
import { useRef, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { I, mintStyle, toast } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { useCart, cartSubtotal, changeQty, removeItem, clearCart } from '../../components/test/store';

const FREE_SHIP = 799;

export default function TestCart() {
  const router = useRouter();
  const cart = useCart();
  const [step, setStep] = useState(1);         // 1 review · 2 delivery+payment · 'done'
  const [coupon, setCoupon] = useState(false);
  const [pay, setPay] = useState('cod');
  const [orderNo, setOrderNo] = useState('');
  const formRef = useRef();
  const promoRef = useRef();

  const sub = cartSubtotal(cart);
  const disc = coupon ? Math.round(sub * 0.10) : 0;
  const afterDisc = Math.max(0, sub - disc);
  const ship = sub === 0 ? 0 : (pay === 'prepaid' ? 0 : (afterDisc >= FREE_SHIP ? 0 : 49));
  const cod = pay === 'cod' ? 30 : 0;
  const total = afterDisc + ship + cod;
  const need = Math.max(0, FREE_SHIP - afterDisc);

  const applyPromo = () => {
    const v = (promoRef.current?.value || '').trim().toUpperCase();
    if (v === 'CROSS10') { setCoupon(true); toast('CROSS10 applied — 10% off'); } else toast('Invalid code');
  };
  const place = () => {
    if (!formRef.current?.reportValidity()) return;
    setOrderNo('#CC-' + String(Math.floor(10000 + Math.random() * 89999)));
    setStep('done'); clearCart(); toast('Order placed ✓');
  };

  return (
    <TestLayout>
      <Head><title>Cart — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="wrap">
        {step === 'done' ? (
          <div className="costep" style={{ margin: '40px 0 60px' }}>
            <div className="cosuccess">
              <div className="seal">{I.check(40)}</div>
              <h3 style={{ fontSize: 24 }}>Order placed!</h3>
              <p className="muted" style={{ margin: '8px 0 2px' }}>Order <b className="mono">{orderNo}</b> is confirmed.</p>
              <p className="muted mono" style={{ fontSize: 12 }}>{pay === 'cod' ? 'Cash on Delivery · pay when it arrives' : 'Paid online · prepaid'}</p>
              <button className="btn btn--crimson btn--lg" style={{ marginTop: 20 }} onClick={() => router.push('/test')}>Continue shopping</button>
            </div>
          </div>
        ) : step === 1 ? (
          <>
            <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', paddingTop: 28 }}>Your cart</h2>
            <div className="cartpage">
              <div>
                {cart.length === 0 ? (
                  <div style={{ padding: '50px 0', textAlign: 'center', color: 'var(--ink-faint)' }}>
                    <p className="mono" style={{ fontSize: 13 }}>Your cart is empty.</p>
                    <button className="btn btn--crimson" style={{ marginTop: 12 }} onClick={() => router.push('/test/shop')}>Start shopping</button>
                  </div>
                ) : cart.map((i) => (
                  <div className="citem" key={i.key}>
                    <div className="th"><span className="mint" style={mintStyle(i.color)} /></div>
                    <div>
                      <h3>{i.name}</h3>
                      <div className="meta">{i.brand} · {i.color} · Size {i.size}{i.packq > 1 ? ` · ${i.pack}` : ''}</div>
                      <button className="rm" onClick={() => { removeItem(i.key); toast('Removed'); }}>Remove</button>
                    </div>
                    <div className="right">
                      <div className="qty"><button onClick={() => changeQty(i.key, -1)}>−</button><span>{i.qty}</span><button onClick={() => changeQty(i.key, 1)}>+</button></div>
                      <div className="lp">{inr(i.unit * i.qty)}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="summary" style={{ opacity: cart.length ? 1 : 0.5, pointerEvents: cart.length ? 'auto' : 'none' }}>
                <h3>Order summary</h3>
                <div className="mono" style={{ fontSize: 11.5, color: 'var(--ink-faint)', marginBottom: 6 }}>
                  {sub === 0 ? 'Add items to unlock free shipping' : (need > 0 ? `Add ${inr(need)} more for FREE shipping` : 'You’ve unlocked FREE shipping ✓')}
                </div>
                <div className="freebar"><span style={{ width: `${Math.min(100, (afterDisc / FREE_SHIP) * 100)}%` }} /></div>
                <div className="promo"><input ref={promoRef} placeholder="PROMO CODE" defaultValue="CROSS10" /><button className="btn" onClick={applyPromo}>Apply</button></div>
                <div className="srow"><span>Subtotal</span><span>{inr(sub)}</span></div>
                {coupon && disc > 0 && <div className="srow"><span>Discount (CROSS10)</span><span style={{ color: 'var(--crimson)' }}>−{inr(disc)}</span></div>}
                <div className="srow"><span>Shipping</span><span>{ship === 0 ? (sub ? 'FREE' : '—') : inr(ship)}</span></div>
                <div className="srow total"><span>Total</span><span>{inr(total)}</span></div>
                <button className="btn btn--crimson btn--block btn--lg" style={{ marginTop: 16 }} disabled={!cart.length} onClick={() => setStep(2)}>Checkout securely</button>
                <div className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)', textAlign: 'center', marginTop: 10 }}>🔒 256-bit secure · COD available</div>
              </div>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', paddingTop: 28 }}>Checkout</h2>
            <div className="stepper">
              <div className="st done"><span className="n">✓</span>Details</div><div className="bar" />
              <div className="st on"><span className="n">2</span>Payment</div>
            </div>
            <div className="cowrap">
              <div>
                <form ref={formRef} className="costep" id="coForm">
                  <h3>Shipping details</h3>
                  <div className="hint">Where should we send your order?</div>
                  <div className="frow">
                    <div className="ffield"><label>Full name</label><input name="name" required placeholder="Aarav Sharma" /></div>
                    <div className="ffield"><label>Phone</label><input name="phone" required inputMode="tel" placeholder="+91 98765 43210" /></div>
                  </div>
                  <div className="ffield"><label>Email</label><input name="email" type="email" required placeholder="you@email.com" /></div>
                  <div className="ffield"><label>Address</label><input name="addr" required placeholder="Flat / house, street, area" /></div>
                  <div className="frow">
                    <div className="ffield"><label>City</label><input name="city" required placeholder="Mumbai" /></div>
                    <div className="ffield"><label>Pincode</label><input name="pin" required inputMode="numeric" placeholder="400001" /></div>
                  </div>

                  <h3 style={{ marginTop: 10 }}>Payment method</h3>
                  <div className="hint">Choose how you&apos;d like to pay. COD available across India.</div>
                  <div className="pay">
                    <label className={`payopt${pay === 'cod' ? ' on' : ''}`} onClick={() => setPay('cod')}>
                      <span className="radio" /><span className="pi">{I.card(20)}</span>
                      <span><b>Cash on Delivery</b><span className="d">Pay in cash when it arrives</span></span><span className="tag">POPULAR</span>
                    </label>
                    <label className={`payopt${pay === 'prepaid' ? ' on' : ''}`} onClick={() => setPay('prepaid')}>
                      <span className="radio" /><span className="pi">{I.shield(20)}</span>
                      <span><b>Pay online (UPI / Card)</b><span className="d">GPay, PhonePe, cards &amp; net-banking</span></span>
                    </label>
                  </div>

                  <div className="corow">
                    <button className="coback" type="button" onClick={() => setStep(1)}>{I.arrow(15)} Back to cart</button>
                    <button className="btn btn--crimson btn--lg" type="button" style={{ marginLeft: 'auto' }} onClick={place}>Place order · {inr(total)}</button>
                  </div>
                </form>
              </div>

              <div className="summary cosummary">
                <h3>Order summary</h3>
                <div style={{ marginBottom: 12 }}>
                  {cart.map((i) => (
                    <div className="miniitem" key={i.key}>
                      <div className="th"><span className="mint" style={mintStyle(i.color)} /></div>
                      <div><div className="nm">{i.name} ×{i.qty}</div><div className="mm">{i.color} · {i.size}{i.packq > 1 ? ` · ${i.pack}` : ''}</div></div>
                      <div className="lp">{inr(i.unit * i.qty)}</div>
                    </div>
                  ))}
                </div>
                <div className="srow"><span>Subtotal</span><span>{inr(sub)}</span></div>
                {coupon && disc > 0 && <div className="srow"><span>Discount (CROSS10)</span><span style={{ color: 'var(--crimson)' }}>−{inr(disc)}</span></div>}
                <div className="srow"><span>Shipping</span><span>{ship === 0 ? 'FREE' : inr(ship)}</span></div>
                {cod > 0 && <div className="srow"><span>COD handling</span><span>{inr(cod)}</span></div>}
                <div className="srow total"><span>Total</span><span>{inr(total)}</span></div>
              </div>
            </div>
          </>
        )}
      </div>
    </TestLayout>
  );
}

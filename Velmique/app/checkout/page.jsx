'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Lock, CreditCard, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import PageHeader from '@/components/layout/PageHeader';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useStore();
  const router = useRouter();
  const [step, setStep] = useState('shipping');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'India',
    card: '', expiry: '', cvv: '', cardName: '',
  });

  const shipping = cartTotal >= 2500 ? 0 : 150;
  const total = cartTotal + shipping;
  const fmt = (n) => `₹${Math.round(n).toLocaleString('en-IN')}`;

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleOrder = () => {
    clearCart();
    router.push('/order-confirmation');
  };

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Secure Checkout"
        title={step === 'shipping' ? 'SHIPPING' : 'PAYMENT'}
        accent={step === 'shipping' ? 'DETAILS' : 'METHOD'}
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-10">
          <Link href="/cart" className="text-[var(--ink-muted)] text-[10px] font-body tracking-[0.3em] uppercase hover:text-[var(--gold-deep)]">Cart</Link>
          <ChevronRight size={12} className="text-[var(--ink-muted)]" />
          <button onClick={() => setStep('shipping')}
            className={`text-[10px] font-body tracking-[0.3em] uppercase ${step === 'shipping' ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>Shipping</button>
          <ChevronRight size={12} className="text-[var(--ink-muted)]" />
          <button onClick={() => step === 'payment' && setStep('payment')}
            className={`text-[10px] font-body tracking-[0.3em] uppercase ${step === 'payment' ? 'text-[var(--ink)]' : 'text-[var(--ink-muted)]'}`}>Payment</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="bg-white border border-[var(--border)] rounded-2xl p-7 md:p-9">
              {step === 'shipping' ? (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([name, label]) => (
                      <div key={name}>
                        <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</label>
                        <input name={name} value={form[name]} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                      </div>
                    ))}
                  </div>
                  {[['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'tel'], ['address', 'Street Address', 'text'], ['city', 'City', 'text']].map(([name, label, type]) => (
                    <div key={name}>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</label>
                      <input name={name} type={type} value={form[name]} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">State</label>
                      <input name="state" value={form.state} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">PIN Code</label>
                      <input name="zip" value={form.zip} onChange={handleChange} maxLength={6} placeholder="400050" className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                  </div>
                  <button onClick={() => setStep('payment')} className="pill-cta w-full justify-center !py-4 mt-3">
                    Continue to Payment <ArrowUpRight size={14} strokeWidth={1.6} />
                  </button>
                </div>
              ) : (
                <div className="space-y-5">
                  <div className="flex items-center gap-2 text-[var(--gold-deep)] text-xs font-body">
                    <Lock size={12} /> Secure payment — SSL encrypted
                  </div>
                  {[['cardName', 'Name on Card'], ['card', 'Card Number']].map(([name, label]) => (
                    <div key={name}>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</label>
                      <input name={name} value={form[name]} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Expiry (MM/YY)</label>
                      <input name="expiry" value={form.expiry} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">CVV</label>
                      <input name="cvv" value={form.cvv} onChange={handleChange} type="password" maxLength={4} className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                  </div>
                  <button onClick={handleOrder} className="pill-cta w-full justify-center !py-4 mt-3">
                    <CreditCard size={14} /> Place Order — {fmt(total)}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white border border-[var(--border)] rounded-2xl p-7 sticky top-28">
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Summary</p>
              <h2 className="font-display text-[var(--ink)] text-2xl uppercase tracking-tight mb-5">Your Order</h2>

              <div className="space-y-4 mb-6">
                {cart.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="relative">
                      <img src={item.image} alt={item.name} className="w-16 h-20 object-cover rounded-md" />
                      <span className="absolute -top-1.5 -right-1.5 bg-[var(--gold)] text-[var(--ink)] text-[10px] rounded-full w-5 h-5 flex items-center justify-center font-bold">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-serif italic text-[var(--ink)] text-sm leading-tight">{item.name}</p>
                      {item.size && <p className="text-[var(--ink-muted)] text-[10px] font-body mt-0.5">Size: {item.size}</p>}
                      <p className="text-[var(--gold-deep)] text-sm font-body mt-1">{fmt(item.price * item.quantity)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="h-px bg-[var(--border)] mb-4" />

              <div className="space-y-2 text-sm font-body">
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Subtotal</span><span>{fmt(cartTotal)}</span>
                </div>
                <div className="flex justify-between text-[var(--ink-soft)]">
                  <span>Shipping</span><span className={shipping === 0 ? 'text-[var(--gold-deep)]' : ''}>{shipping === 0 ? 'Free' : fmt(shipping)}</span>
                </div>
                <p className="text-[var(--ink-muted)] text-xs">Inclusive of 18% GST</p>
                <div className="h-px bg-[var(--border)] my-2" />
                <div className="flex justify-between items-baseline">
                  <span className="font-display text-[var(--ink)] text-lg uppercase">Total</span>
                  <span className="font-serif italic text-[var(--ink)] text-2xl">{fmt(total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

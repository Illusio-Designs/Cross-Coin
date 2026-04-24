'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronRight, Lock, CreditCard } from 'lucide-react';
import { useStore } from '@/lib/store';

export default function CheckoutPage() {
  const { cart, cartTotal, clearCart } = useStore();
  const router = useRouter();
  const [step, setStep] = useState('shipping');
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    address: '', city: '', state: '', zip: '', country: 'India',
    card: '', expiry: '', cvv: '', cardName: '',
  });

  const shipping = cartTotal >= 150 ? 0 : 15;
  const total = cartTotal + shipping;

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleOrder = () => {
    clearCart();
    router.push('/order-confirmation');
  };

  return (
    <div className="pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        {/* Steps */}
        <div className="flex items-center gap-2 mb-10">
          <Link href="/cart" className="text-[#f3ede0]/30 text-xs font-body tracking-wider uppercase hover:text-[#d4927f]">Cart</Link>
          <ChevronRight size={12} className="text-[#f3ede0]/20" />
          <button onClick={() => setStep('shipping')} className={`text-xs font-body tracking-wider uppercase ${step === 'shipping' ? 'text-[#d4927f]' : 'text-[#f3ede0]/50'}`}>Shipping</button>
          <ChevronRight size={12} className="text-[#f3ede0]/20" />
          <button onClick={() => step === 'payment' && setStep('payment')} className={`text-xs font-body tracking-wider uppercase ${step === 'payment' ? 'text-[#d4927f]' : 'text-[#f3ede0]/30'}`}>Payment</button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12">
          {/* Form */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-1">Step {step === 'shipping' ? '1' : '2'} of 2</p>
              <h1 className="font-serif text-3xl text-[#f3ede0]">{step === 'shipping' ? 'Shipping Details' : 'Payment'}</h1>
              <div className="gold-divider w-16 mt-3" />
            </div>

            {step === 'shipping' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[['firstName', 'First Name'], ['lastName', 'Last Name']].map(([name, label]) => (
                    <div key={name}>
                      <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">{label}</label>
                      <input name={name} value={form[name]} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                    </div>
                  ))}
                </div>
                {[['email', 'Email Address', 'email'], ['phone', 'Phone Number', 'tel'], ['address', 'Street Address', 'text'], ['city', 'City', 'text']].map(([name, label, type]) => (
                  <div key={name}>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">{label}</label>
                    <input name={name} type={type} value={form[name]} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">State</label>
                    <input name="state" value={form.state} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">ZIP Code</label>
                    <input name="zip" value={form.zip} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                </div>
                <button onClick={() => setStep('payment')} className="btn-gold w-full py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm mt-2">
                  Continue to Payment <ChevronRight size={14} />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#d4927f]/60 text-xs font-body mb-4">
                  <Lock size={12} /> Secure payment — SSL encrypted
                </div>
                {[['cardName', 'Name on Card'], ['card', 'Card Number']].map(([name, label]) => (
                  <div key={name}>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">{label}</label>
                    <input name={name} value={form[name]} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">Expiry (MM/YY)</label>
                    <input name="expiry" value={form.expiry} onChange={handleChange} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">CVV</label>
                    <input name="cvv" value={form.cvv} onChange={handleChange} type="password" maxLength={4} className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                </div>
                <button onClick={handleOrder} className="btn-gold w-full py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm mt-2">
                  <CreditCard size={14} /> Place Order — ${total.toFixed(2)}
                </button>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-2">
            <div className="bg-[#1d1915] border border-[#b8624f]/15 rounded-sm p-6 sticky top-28">
              <h2 className="font-serif text-lg text-[#f3ede0] mb-4">Order Summary</h2>
              <div className="space-y-3 mb-4">
                {cart.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="relative">
                      <img src={item.image} alt={item.name} className="w-14 h-16 object-cover rounded-sm" />
                      <span className="absolute -top-1.5 -right-1.5 bg-[#b8624f] text-black text-[9px] rounded-full w-4 h-4 flex items-center justify-center font-bold">{item.quantity}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[#f3ede0] text-xs font-body">{item.name}</p>
                      {item.size && <p className="text-[#f3ede0]/40 text-[10px] font-body">Size: {item.size}</p>}
                      <p className="text-[#d4927f] text-xs font-body mt-0.5">${(item.price * item.quantity).toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="gold-divider mb-4" />
              <div className="space-y-2 text-xs font-body">
                <div className="flex justify-between text-[#f3ede0]/50">
                  <span>Subtotal</span><span>${cartTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#f3ede0]/50">
                  <span>Shipping</span><span className={shipping === 0 ? 'text-[#d4927f]' : ''}>{shipping === 0 ? 'Free' : `₹${shipping}`}</span>
                </div>
                <div className="gold-divider" />
                <div className="flex justify-between font-serif text-base">
                  <span className="text-[#f3ede0]">Total</span>
                  <span className="gold-text">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

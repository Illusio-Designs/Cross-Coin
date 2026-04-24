'use client';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

const faqs = [
  {
    category: 'Orders & Shipping',
    items: [
      { q: 'How long does shipping take?', a: 'Standard shipping takes 5–7 business days. Express shipping (2–3 days) is available at checkout. Orders above ₹999 (India) or $150 (International) receive free shipping.' },
      { q: 'Do you ship internationally?', a: 'Yes, we ship to over 50 countries. International shipping typically takes 7–14 business days. Customs fees may apply depending on your country.' },
      { q: 'Can I track my order?', a: 'Absolutely. You will receive a tracking number via email once your order has been dispatched. You can track your order from your Account dashboard.' },
    ],
  },
  {
    category: 'Returns & Exchanges',
    items: [
      { q: 'What is your return policy?', a: 'We offer a 30-day return window on all full-priced items. Items must be unworn, unwashed, and in their original packaging with tags attached.' },
      { q: 'How do I initiate a return?', a: 'Visit your Account > Orders and select "Return Item" for the relevant order. We will email you a prepaid return label within 24 hours.' },
      { q: 'Can I exchange for a different size?', a: 'Yes, exchanges for different sizes are accepted within 30 days of purchase, subject to stock availability. Contact our team at hello@velmique.com to arrange.' },
    ],
  },
  {
    category: 'Products & Care',
    items: [
      { q: 'Are your products ethically made?', a: 'Yes. Every Velmique piece is crafted in partner ateliers that meet our strict standards for fair wages, safe working conditions, and sustainable practices.' },
      { q: 'How should I care for my Velmique pieces?', a: 'Care instructions are printed on the inner label of every garment. Silk and velvet pieces should be dry-cleaned or hand-washed in cold water. Never tumble dry luxury fabrics.' },
      { q: 'Are the colors accurate in photos?', a: 'We make every effort to represent colors accurately. However, screen calibration may cause slight variations. If you have concerns, contact us before purchasing.' },
    ],
  },
  {
    category: 'Account & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept all major credit and debit cards (Visa, Mastercard, Amex), PayPal, Apple Pay, Google Pay, and UPI for Indian customers.' },
      { q: 'Is my payment information secure?', a: 'Yes. All transactions are processed through SSL-encrypted, PCI-DSS compliant payment gateways. We never store your card details.' },
      { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page and enter your email. You will receive a reset link within a few minutes. Check your spam folder if it doesn\'t arrive.' },
    ],
  },
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState(null);

  return (
    <div className="pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        <div className="text-center mb-14">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Help Center</p>
          <h1 className="font-serif text-5xl text-[#f3ede0]">FAQ</h1>
          <div className="gold-divider w-24 mx-auto mt-4" />
          <p className="text-[#f3ede0]/40 text-sm font-body mt-4">
            Can't find your answer? <a href="/contact" className="text-[#d4927f] hover:underline">Contact us</a>
          </p>
        </div>

        <div className="space-y-10">
          {faqs.map(section => (
            <div key={section.category}>
              <h2 className="font-serif text-xl text-[#f3ede0] mb-4 pb-3 border-b border-[#b8624f]/15">
                {section.category}
              </h2>
              <div className="space-y-2">
                {section.items.map(item => {
                  const key = `${section.category}-${item.q}`;
                  const isOpen = openItem === key;
                  return (
                    <div key={item.q} className="border border-[#b8624f]/10 rounded-sm overflow-hidden">
                      <button
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#b8624f]/5 transition-colors"
                      >
                        <span className="text-[#f3ede0]/80 font-body text-sm pr-4">{item.q}</span>
                        {isOpen
                          ? <Minus size={14} className="text-[#d4927f] flex-shrink-0" />
                          : <Plus size={14} className="text-[#f3ede0]/40 flex-shrink-0" />
                        }
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 bg-[#1d1915]/50">
                          <p className="text-[#f3ede0]/50 font-body text-sm leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

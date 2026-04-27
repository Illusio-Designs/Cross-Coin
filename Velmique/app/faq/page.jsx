'use client';
import { useState } from 'react';
import { Plus, Minus } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

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
      { q: 'Are your products ethically made?', a: 'Yes. Every Velmique fragrance is composed in partner ateliers that meet our strict standards for fair wages, sustainable sourcing, and ethical practices.' },
      { q: 'How should I store my fragrance?', a: 'Store your bottle upright in a cool, dark place away from direct sunlight and heat. Avoid bathrooms — humidity degrades the composition. Properly stored, an extrait will perform for 5+ years.' },
      { q: 'How long does a bottle last?', a: 'A 50ml extrait typically lasts 6–12 months with daily use. Sillage and longevity vary with skin chemistry — most patrons report 8–12 hours of wear.' },
    ],
  },
  {
    category: 'Account & Payments',
    items: [
      { q: 'What payment methods do you accept?', a: 'We accept UPI, GPay, PhonePe, Paytm, Razorpay, all major credit/debit cards (Visa, Mastercard, RuPay, Amex) and NetBanking. International orders also support PayPal.' },
      { q: 'Is my payment information secure?', a: 'Yes. All transactions are processed through SSL-encrypted, PCI-DSS compliant payment gateways. We never store your card details.' },
      { q: 'How do I reset my password?', a: 'Click "Forgot Password" on the login page and enter your email. You will receive a reset link within a few minutes. Check your spam folder if it doesn\'t arrive.' },
    ],
  },
];

export default function FAQPage() {
  const [openItem, setOpenItem] = useState(null);

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Help Center"
        title="FREQUENTLY"
        accent="ASKED"
        intro="Quick answers to the questions our patrons ask the most. Can't find yours? Reach our concierge team."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="space-y-14">
          {faqs.map(section => (
            <div key={section.category}>
              <h2 className="font-display text-[var(--ink)] text-3xl md:text-4xl uppercase tracking-tight mb-6 pb-4 border-b border-[var(--border)]">
                {section.category}
              </h2>
              <div className="space-y-3">
                {section.items.map(item => {
                  const key = `${section.category}-${item.q}`;
                  const isOpen = openItem === key;
                  return (
                    <div key={item.q} className="border border-[var(--border)] rounded-md overflow-hidden bg-white">
                      <button
                        onClick={() => setOpenItem(isOpen ? null : key)}
                        className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-[var(--surface)] transition-colors"
                      >
                        <span className="text-[var(--ink)] font-body text-base pr-4">{item.q}</span>
                        {isOpen
                          ? <Minus size={16} className="text-[var(--gold-deep)] flex-shrink-0" />
                          : <Plus size={16} className="text-[var(--ink-muted)] flex-shrink-0" />}
                      </button>
                      {isOpen && (
                        <div className="px-6 pb-5 bg-[var(--surface)]/50">
                          <p className="text-[var(--ink-soft)] font-body text-sm leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-16 bg-[var(--surface-2)] rounded-2xl px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-2">Still curious?</p>
            <h3 className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase">Talk to our concierge.</h3>
          </div>
          <a href="/contact" className="pill-cta shrink-0">Contact Us</a>
        </div>
      </div>
    </div>
  );
}

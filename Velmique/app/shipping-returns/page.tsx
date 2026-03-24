import Link from 'next/link';
import { Truck, RotateCcw, Package, Shield } from 'lucide-react';

export default function ShippingReturnsPage() {
  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-4xl mx-auto px-6 py-10">
        <div className="text-center mb-14">
          <p className="text-[#C9A84C]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Policies</p>
          <h1 className="font-serif text-5xl text-cream">Shipping & Returns</h1>
          <div className="gold-divider w-24 mx-auto mt-4" />
        </div>

        {/* Quick icons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-14">
          {[
            { icon: Truck, label: 'Free Shipping', sub: 'Orders over $150' },
            { icon: RotateCcw, label: '30-Day Returns', sub: 'No questions asked' },
            { icon: Package, label: 'Secure Packaging', sub: 'Luxury gift boxes' },
            { icon: Shield, label: 'Fully Insured', sub: 'Every shipment' },
          ].map(item => (
            <div key={item.label} className="bg-[#1a1a1a] border border-[#C9A84C]/10 rounded-sm p-5 text-center">
              <item.icon size={22} className="text-[#C9A84C] mx-auto mb-2" />
              <p className="text-cream text-xs font-body tracking-wider uppercase">{item.label}</p>
              <p className="text-cream/40 text-xs font-body mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        <div className="space-y-12 font-body text-cream/60 text-sm leading-loose">
          <section>
            <h2 className="font-serif text-2xl text-cream mb-4">Shipping Information</h2>
            <div className="gold-divider w-12 mb-5" />
            <div className="space-y-4">
              <p>All orders are processed within 1–2 business days. You will receive an email confirmation with your tracking details once your order has been shipped.</p>
              <div className="bg-[#1a1a1a] border border-[#C9A84C]/10 rounded-sm overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[#C9A84C]/10">
                      <th className="text-left px-5 py-3 text-cream/40 tracking-wider uppercase font-body">Method</th>
                      <th className="text-left px-5 py-3 text-cream/40 tracking-wider uppercase font-body">Delivery Time</th>
                      <th className="text-left px-5 py-3 text-cream/40 tracking-wider uppercase font-body">Cost</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      ['Standard Shipping', '5–7 Business Days', 'Free over $150 / $15'],
                      ['Express Shipping', '2–3 Business Days', '$25'],
                      ['Overnight Shipping', 'Next Business Day', '$45'],
                      ['International Standard', '7–14 Business Days', 'Calculated at checkout'],
                    ].map(([m, t, c]) => (
                      <tr key={m} className="border-b border-[#C9A84C]/5 hover:bg-[#C9A84C]/3 transition-colors">
                        <td className="px-5 py-3 text-cream/70">{m}</td>
                        <td className="px-5 py-3 text-cream/50">{t}</td>
                        <td className="px-5 py-3 text-[#C9A84C]">{c}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-cream mb-4">Returns Policy</h2>
            <div className="gold-divider w-12 mb-5" />
            <p className="mb-4">We stand behind every piece we create. If for any reason you are not completely satisfied, we offer a full 30-day return policy on all full-priced items.</p>
            <ul className="space-y-2 ml-4">
              {[
                'Items must be returned in original condition — unworn, unwashed, with tags attached',
                'Returns must be initiated within 30 days of the delivery date',
                'Sale items are eligible for store credit only',
                'Custom or made-to-order pieces are final sale',
                'Original shipping charges are non-refundable',
              ].map(item => (
                <li key={item} className="flex items-start gap-2">
                  <span className="text-[#C9A84C] mt-0.5 text-xs">✦</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </section>

          <section>
            <h2 className="font-serif text-2xl text-cream mb-4">How to Return</h2>
            <div className="gold-divider w-12 mb-5" />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                { step: '01', title: 'Initiate Return', desc: 'Visit My Account > Orders and click "Return Item" on the relevant order.' },
                { step: '02', title: 'Pack Items', desc: 'Securely pack your item in its original packaging. Print the prepaid return label we email you.' },
                { step: '03', title: 'Drop Off', desc: 'Drop your package at any approved carrier location. Refunds are processed within 5–7 business days.' },
              ].map(s => (
                <div key={s.step} className="bg-[#1a1a1a] border border-[#C9A84C]/10 rounded-sm p-5">
                  <p className="gold-text font-serif text-2xl mb-2">{s.step}</p>
                  <h3 className="text-cream text-sm font-body tracking-wider uppercase mb-2">{s.title}</h3>
                  <p className="text-cream/50 text-xs">{s.desc}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <p className="text-cream/40">Still have questions? <Link href="/contact" className="text-[#C9A84C] hover:underline">Contact our team</Link> — we're happy to help.</p>
          </section>
        </div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import { Truck, RotateCcw, Package, Shield, ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';

export default function ShippingReturnsPage() {
  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Policies"
        title="SHIPPING &"
        accent="RETURNS"
        intro="Free shipping over ₹2,500. Fully insured Blue Dart / DTDC dispatch from our Bandra atelier, and a 14-day return window on every full-priced bottle."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {/* Quick value cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
          {[
            { icon: Truck, label: 'Free Pan-India', sub: 'Orders over ₹2,500' },
            { icon: RotateCcw, label: '14-Day Returns', sub: 'Sealed bottles only' },
            { icon: Package, label: 'Luxury Packaging', sub: 'Maison gift box' },
            { icon: Shield, label: 'Fully Insured', sub: 'Blue Dart · DTDC' },
          ].map(item => (
            <div key={item.label} className="bg-white border border-[var(--border)] rounded-2xl p-6 text-center">
              <item.icon size={22} className="text-[var(--gold-deep)] mx-auto mb-3" />
              <p className="text-[var(--ink)] text-xs font-body tracking-[0.2em] uppercase">{item.label}</p>
              <p className="text-[var(--ink-muted)] text-xs font-body mt-1">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Shipping table */}
        <section className="mb-14">
          <h2 className="font-display text-[var(--ink)] text-3xl md:text-4xl uppercase tracking-tight mb-6">Shipping Information</h2>
          <p className="text-[var(--ink-soft)] font-body text-base leading-relaxed mb-6 max-w-2xl">
            All orders are processed within 24 hours from our Bandra atelier. You&apos;ll receive a Blue Dart / DTDC tracking number via SMS and email once your fragrance is dispatched. We deliver to all states and union territories.
          </p>
          <div className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
            <table className="w-full text-sm font-body">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface)]">
                  <th className="text-left px-6 py-4 text-[var(--ink-muted)] tracking-[0.2em] uppercase text-xs">Method</th>
                  <th className="text-left px-6 py-4 text-[var(--ink-muted)] tracking-[0.2em] uppercase text-xs">Delivery</th>
                  <th className="text-left px-6 py-4 text-[var(--ink-muted)] tracking-[0.2em] uppercase text-xs">Cost</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Standard (Blue Dart / DTDC)', '4–6 Business Days', 'Free over ₹2,500 / ₹150'],
                  ['Express (Metro Cities)', '1–2 Business Days', '₹250'],
                  ['Same-Day (Mumbai)', 'Within 24 Hours', '₹500'],
                  ['International (DHL)', '7–14 Business Days', 'Calculated at checkout'],
                ].map(([m, t, c]) => (
                  <tr key={m} className="border-b border-[var(--border)] last:border-0">
                    <td className="px-6 py-4 text-[var(--ink)]">{m}</td>
                    <td className="px-6 py-4 text-[var(--ink-soft)]">{t}</td>
                    <td className="px-6 py-4 text-[var(--gold-deep)]">{c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-14">
          <h2 className="font-display text-[var(--ink)] text-3xl md:text-4xl uppercase tracking-tight mb-6">Returns Policy</h2>
          <p className="text-[var(--ink-soft)] font-body text-base leading-relaxed mb-6 max-w-2xl">
            We stand behind every fragrance we compose. If a scent doesn&apos;t sing on your skin, return the sealed bottle within 14 days for a full refund — or try our Discovery Kit (₹7,600) before committing to a full bottle.
          </p>
          <ul className="space-y-3 max-w-2xl">
            {[
              'Bottles must be returned sealed, in original packaging with the maison gift box',
              'Returns must be initiated within 14 days of delivery via your Velmique account',
              'Sale and limited-edition drop items are eligible for store credit only',
              'Custom engravings and made-to-order extraits are final sale',
              'Refunds reach your UPI / card / bank within 5–7 working days',
            ].map(item => (
              <li key={item} className="flex items-start gap-3 text-[var(--ink-soft)] font-body text-base">
                <span className="text-[var(--gold)] mt-1">✦</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="mb-14">
          <h2 className="font-display text-[var(--ink)] text-3xl md:text-4xl uppercase tracking-tight mb-6">How to Return</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { step: '01', title: 'Initiate Return', desc: 'Visit My Account > Orders and click "Return Item" on the relevant order.' },
              { step: '02', title: 'Pack Items', desc: 'Securely pack your bottle in its original packaging. Print the prepaid return label we email you.' },
              { step: '03', title: 'Drop Off', desc: 'Drop your package at any approved carrier location. Refunds are processed within 5–7 business days.' },
            ].map(s => (
              <div key={s.step} className="bg-white border border-[var(--border)] rounded-2xl p-7">
                <p className="font-display text-[var(--gold)] text-5xl leading-none mb-3">{s.step}</p>
                <h3 className="font-serif italic text-[var(--ink)] text-xl mb-2">{s.title}</h3>
                <p className="text-[var(--ink-soft)] text-sm font-body leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <div className="bg-[var(--surface-2)] rounded-2xl px-8 py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-2">Need a hand?</p>
            <h3 className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase">Our concierge can help.</h3>
          </div>
          <Link href="/contact" className="pill-cta shrink-0">Contact Us <ArrowUpRight size={14} strokeWidth={1.6} /></Link>
        </div>
      </div>
    </div>
  );
}

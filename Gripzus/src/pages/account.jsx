import { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import PageHero from '../components/common/PageHero';

const TABS = [
  { key: 'orders',    label: 'Orders' },
  { key: 'addresses', label: 'Addresses' },
  { key: 'details',   label: 'Details' },
];

const ORDERS = [
  { id: 'GZ-2026-01284', date: '12 Oct 2026', status: 'Delivered', total: 1098, items: 2 },
  { id: 'GZ-2026-01199', date: '02 Oct 2026', status: 'Shipped',   total: 599,  items: 1 },
  { id: 'GZ-2026-01015', date: '14 Sep 2026', status: 'Cancelled', total: 449,  items: 1 },
];

const ADDRESSES = [
  { id: 1, name: 'Anika Sharma', line: 'B-202, Pali Hill', city: 'Bandra West, Mumbai 400050', phone: '+91 98201 43210', isDefault: true },
];

export default function AccountPage() {
  const [tab, setTab] = useState('orders');

  return (
    <>
      <Head><title>My Account — Gripzus</title></Head>
      <main className="bg-paper">
        <PageHero
          chapter="08"
          eyebrow="Welcome back, Anika"
          title="Your"
          accent="account."
          intro="Orders, addresses and details — all in one place."
        />

        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-16">

          {/* Profile bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 border border-ink p-6 md:p-7 mb-8">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-ink text-paper flex items-center justify-center">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="8" r="4" /><path d="M4 20c0-4 3.5-7 8-7s8 3 8 7" strokeLinecap="round" /></svg>
              </div>
              <div>
                <h2 className="font-display uppercase text-ink text-xl md:text-2xl tracking-[-0.02em] leading-none" style={{ fontWeight: 700 }}>Anika Sharma</h2>
                <p className="mono-label mt-1.5">anika@example.com · +91 98201 43210</p>
              </div>
            </div>
            <button className="mono-label border border-rule hover:border-ink py-3 px-5 transition-colors text-center">Sign Out</button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-8 border-b border-rule">
            {TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-5 py-3 font-mono text-[11px] tracking-[0.15em] uppercase transition-colors border-b-2 -mb-px ${
                  tab === t.key ? 'border-saffron text-ink' : 'border-transparent text-ink-muted hover:text-ink'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'orders' && (
            <div className="border-t border-rule">
              {ORDERS.map((o) => (
                <div key={o.id} className="grid grid-cols-12 gap-4 md:gap-8 py-6 border-b border-rule items-center">
                  <div className="col-span-12 md:col-span-4">
                    <p className="mono-label mb-1">{o.date}</p>
                    <p className="font-display uppercase text-ink text-lg md:text-xl tracking-[-0.02em]" style={{ fontWeight: 700 }}>#{o.id}</p>
                  </div>
                  <p className="col-span-6 md:col-span-3 mono-label">{o.items} item{o.items === 1 ? '' : 's'}</p>
                  <p className="col-span-6 md:col-span-2 font-display font-bold text-ink text-lg">₹{o.total.toLocaleString('en-IN')}</p>
                  <div className="col-span-12 md:col-span-3 flex items-center justify-between md:justify-end gap-4">
                    <span className={`font-mono text-[10px] tracking-[0.2em] uppercase px-2.5 py-1 ${
                      o.status === 'Delivered' ? 'bg-ink text-paper' :
                      o.status === 'Cancelled' ? 'border border-rule text-ink-muted' :
                      'bg-saffron text-paper'
                    }`}>{o.status}</span>
                    <Link href="/track-order" className="mono-label text-saffron-deep hover:text-ink">Track →</Link>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'addresses' && (
            <div className="space-y-4">
              <button className="w-full border border-dashed border-rule hover:border-ink py-5 mono-label hover:text-ink transition-colors">
                + Add new address
              </button>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ADDRESSES.map((a) => (
                  <div key={a.id} className="border border-rule p-6">
                    <div className="flex items-start justify-between mb-3">
                      <p className="font-display uppercase text-ink text-lg tracking-[-0.02em]" style={{ fontWeight: 700 }}>{a.name}</p>
                      {a.isDefault && <span className="font-mono text-[9px] tracking-[0.2em] uppercase bg-ink text-paper px-2 py-0.5">Default</span>}
                    </div>
                    <p className="prose-body text-sm">{a.line}<br />{a.city}</p>
                    <p className="mono-label mt-2">{a.phone}</p>
                    <div className="flex gap-4 mt-4 pt-4 border-t border-rule">
                      <button className="mono-label hover:text-ink">Edit</button>
                      <button className="mono-label hover:text-saffron-deep">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'details' && (
            <div className="border border-rule p-7 md:p-8 max-w-2xl">
              <p className="eyebrow mb-6">Personal details</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[['Name', 'Anika Sharma'], ['Email', 'anika@example.com'], ['Phone', '+91 98201 43210']].map(([k, v]) => (
                  <div key={k}>
                    <p className="mono-label mb-1.5">{k}</p>
                    <p className="text-ink text-sm">{v}</p>
                  </div>
                ))}
              </div>
              <button className="cta mt-8">Edit profile</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

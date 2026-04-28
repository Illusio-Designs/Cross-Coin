'use client';
import Link from 'next/link';
import { useState } from 'react';
import { User, ShoppingBag, Heart, Package, LogOut, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import PageHeader from '@/components/layout/PageHeader';

const sampleOrders = [
  { id: 'VLM-2026-1284', date: '12 Apr 2026', total: 24600, status: 'Delivered',  items: 1 },
  { id: 'VLM-2026-1098', date: '03 Mar 2026', total: 38900, status: 'Delivered',  items: 2 },
  { id: 'VLM-2025-0917', date: '21 Dec 2025', total: 16600, status: 'Delivered',  items: 1 },
];

export default function AccountPage() {
  const { cart, wishlist } = useStore();
  const [profile, setProfile] = useState({
    name: 'Guest User',
    email: 'guest@velmique.in',
    phone: '+91 98201 43210',
    address: '14 Pali Hill, Bandra West',
    city: 'Mumbai',
    pin: '400050',
  });
  const [editing, setEditing] = useState(false);
  const update = (k) => (e) => setProfile((p) => ({ ...p, [k]: e.target.value }));
  const fmt = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Welcome Back"
        title="MY"
        accent="ACCOUNT"
        intro="Your orders, wishlist and personal details — all on one page."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {/* Profile card */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-7 mb-6 flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
            <User size={26} className="text-[var(--gold-deep)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif italic text-[var(--ink)] text-2xl">{profile.name}</h2>
            <p className="text-[var(--ink-soft)] text-sm font-body">{profile.email}</p>
            <p className="text-[var(--gold-deep)] text-[10px] font-body mt-1 tracking-[0.3em] uppercase">Velmique Inner Circle Member</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          {[
            { label: 'Orders',     value: sampleOrders.length.toString(), icon: ShoppingBag },
            { label: 'Wishlist',   value: wishlist.length.toString(),     icon: Heart },
            { label: 'Cart Items', value: cart.length.toString(),         icon: Package },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-[var(--border)] rounded-2xl p-6 text-center">
              <stat.icon size={20} className="text-[var(--gold-deep)] mx-auto mb-3" />
              <p className="font-display text-[var(--ink)] text-4xl leading-none">{stat.value}</p>
              <p className="text-[var(--ink-muted)] text-[10px] font-body mt-2 uppercase tracking-[0.3em]">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Recent Orders */}
          <section className="lg:col-span-7 bg-white border border-[var(--border)] rounded-2xl p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[var(--ink)] text-2xl uppercase tracking-tight">Recent Orders</h3>
              <Link href="/wishlist" className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body inline-flex items-center gap-1 hover:gap-2 transition-all">
                Wishlist <ArrowUpRight size={11} />
              </Link>
            </div>
            <div className="divide-y divide-[var(--border)]">
              {sampleOrders.map(o => (
                <div key={o.id} className="py-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-body text-[var(--ink)] text-sm font-medium">{o.id}</p>
                    <p className="text-[var(--ink-muted)] text-xs font-body mt-0.5">{o.date} · {o.items} item{o.items > 1 ? 's' : ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-serif italic text-[var(--ink)] text-base">{fmt(o.total)}</p>
                    <span className="inline-block mt-1 text-[9px] tracking-[0.25em] uppercase font-body text-[var(--gold-deep)] bg-[var(--surface-2)] rounded-full px-2.5 py-0.5">
                      {o.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Profile / Address form */}
          <section className="lg:col-span-5 bg-white border border-[var(--border)] rounded-2xl p-7">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-[var(--ink)] text-2xl uppercase tracking-tight">Details</h3>
              <button
                onClick={() => setEditing(e => !e)}
                className="text-[var(--gold-deep)] text-[10px] tracking-[0.3em] uppercase font-body hover:underline">
                {editing ? 'Save' : 'Edit'}
              </button>
            </div>

            <div className="space-y-4">
              {[
                ['Name', 'name'],
                ['Email', 'email'],
                ['Phone', 'phone'],
                ['Address', 'address'],
                ['City', 'city'],
                ['PIN', 'pin'],
              ].map(([label, key]) => (
                <div key={key}>
                  <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">{label}</p>
                  {editing ? (
                    <input
                      value={profile[key]}
                      onChange={update(key)}
                      className="w-full input-gold px-3 py-2 text-sm font-body rounded-md"
                    />
                  ) : (
                    <p className="text-[var(--ink)] font-body text-sm">{profile[key]}</p>
                  )}
                </div>
              ))}
            </div>
          </section>
        </div>

        <button className="mt-10 flex items-center gap-2 text-[var(--ink-muted)] hover:text-red-600 transition-colors text-[10px] tracking-[0.3em] uppercase font-body">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

'use client';
import Link from 'next/link';
import { User, ShoppingBag, Heart, Settings, LogOut, Package, ArrowUpRight } from 'lucide-react';
import { useStore } from '@/lib/store';
import PageHeader from '@/components/layout/PageHeader';

const menuItems = [
  { icon: Package, label: 'My Orders', href: '/account/orders', desc: 'Track and manage orders' },
  { icon: Heart, label: 'Wishlist', href: '/wishlist', desc: 'Your saved fragrances' },
  { icon: Settings, label: 'Profile', href: '/account/profile', desc: 'Edit your details' },
];

export default function AccountPage() {
  const { cart, wishlist } = useStore();

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Welcome Back"
        title="MY"
        accent="ACCOUNT"
        intro="Manage your orders, wishlist, and personal details — all in one place."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {/* Profile card */}
        <div className="bg-white border border-[var(--border)] rounded-2xl p-7 mb-6 flex items-center gap-5 flex-wrap">
          <div className="w-16 h-16 rounded-full bg-[var(--surface-2)] flex items-center justify-center">
            <User size={26} className="text-[var(--gold-deep)]" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif italic text-[var(--ink)] text-2xl">Guest User</h2>
            <p className="text-[var(--ink-soft)] text-sm font-body">guest@velmique.com</p>
            <p className="text-[var(--gold-deep)] text-[10px] font-body mt-1 tracking-[0.3em] uppercase">Velmique Inner Circle Member</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Orders', value: '12', icon: ShoppingBag },
            { label: 'Wishlist', value: wishlist.length.toString(), icon: Heart },
            { label: 'Cart Items', value: cart.length.toString(), icon: Package },
          ].map(stat => (
            <div key={stat.label} className="bg-white border border-[var(--border)] rounded-2xl p-6 text-center">
              <stat.icon size={20} className="text-[var(--gold-deep)] mx-auto mb-3" />
              <p className="font-display text-[var(--ink)] text-4xl leading-none">{stat.value}</p>
              <p className="text-[var(--ink-muted)] text-[10px] font-body mt-2 uppercase tracking-[0.3em]">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {menuItems.map(item => (
            <Link key={item.label} href={item.href}
              className="bg-white border border-[var(--border)] hover:border-[var(--gold)] rounded-2xl p-6 group transition-all">
              <div className="flex items-start justify-between mb-5">
                <item.icon size={22} className="text-[var(--gold-deep)] transition-colors" />
                <ArrowUpRight size={16} className="text-[var(--ink-muted)] group-hover:text-[var(--gold-deep)] group-hover:-translate-y-0.5 group-hover:translate-x-0.5 transition-all" />
              </div>
              <h3 className="font-serif italic text-[var(--ink)] text-xl mb-1">{item.label}</h3>
              <p className="text-[var(--ink-soft)] text-sm font-body">{item.desc}</p>
            </Link>
          ))}
        </div>

        <button className="mt-10 flex items-center gap-2 text-[var(--ink-muted)] hover:text-red-600 transition-colors text-[10px] tracking-[0.3em] uppercase font-body">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

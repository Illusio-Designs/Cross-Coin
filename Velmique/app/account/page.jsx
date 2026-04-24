'use client';
import Link from 'next/link';
import { User, ShoppingBag, Heart, Settings, LogOut, Package } from 'lucide-react';
import { useStore } from '@/lib/store';

const menuItems = [
  { icon: Package, label: 'My Orders', href: '/account/orders', desc: 'Track and manage orders' },
  { icon: Heart, label: 'Wishlist', href: '/wishlist', desc: 'Your saved pieces' },
  { icon: Settings, label: 'Profile', href: '/account/profile', desc: 'Edit your details' },
];

export default function AccountPage() {
  const { cart, wishlist } = useStore();

  return (
    <div className="pt-24 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        <div className="mb-10">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-2">Welcome Back</p>
          <h1 className="font-serif text-4xl text-[#f3ede0]">My Account</h1>
          <div className="gold-divider w-16 mt-4" />
        </div>

        {/* Profile card */}
        <div className="bg-[#1d1915] border border-[#b8624f]/15 rounded-sm p-6 mb-8 flex items-center gap-5">
          <div className="w-16 h-16 rounded-full bg-[#b8624f]/10 border border-[#b8624f]/30 flex items-center justify-center">
            <User size={26} className="text-[#d4927f]" />
          </div>
          <div>
            <h2 className="font-serif text-xl text-[#f3ede0]">Guest User</h2>
            <p className="text-[#f3ede0]/40 text-sm font-body">guest@velmique.com</p>
            <p className="text-[#d4927f] text-xs font-body mt-1 tracking-wider">Velmique Inner Circle Member</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Orders', value: '12', icon: ShoppingBag },
            { label: 'Wishlist', value: wishlist.length.toString(), icon: Heart },
            { label: 'Cart Items', value: cart.length.toString(), icon: Package },
          ].map(stat => (
            <div key={stat.label} className="bg-[#1d1915] border border-[#b8624f]/10 rounded-sm p-5 text-center">
              <stat.icon size={20} className="text-[#d4927f]/60 mx-auto mb-2" />
              <p className="font-serif text-2xl text-[#f3ede0]">{stat.value}</p>
              <p className="text-[#f3ede0]/40 text-xs font-body mt-1 uppercase tracking-wider">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Menu */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {menuItems.map(item => (
            <Link key={item.label} href={item.href}
              className="bg-[#1d1915] border border-[#b8624f]/10 hover:border-[#b8624f]/40 rounded-sm p-6 group transition-all hover:bg-[#b8624f]/5">
              <item.icon size={22} className="text-[#d4927f]/60 group-hover:text-[#d4927f] transition-colors mb-3" />
              <h3 className="font-serif text-lg text-[#f3ede0] group-hover:text-[#d4927f] transition-colors">{item.label}</h3>
              <p className="text-[#f3ede0]/30 text-xs font-body mt-1">{item.desc}</p>
            </Link>
          ))}
        </div>

        <button className="mt-8 flex items-center gap-2 text-[#f3ede0]/30 hover:text-red-400 transition-colors text-xs tracking-wider uppercase font-body">
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </div>
  );
}

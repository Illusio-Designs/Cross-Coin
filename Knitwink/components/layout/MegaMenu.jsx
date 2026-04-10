'use client';

import { useState } from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';



const MENUS = {
  men: {
    tabs: ['Shoes', 'Socks & Apparel', 'Sale'],
    panels: {
      Shoes: {
        cols: [
        { heading: 'Featured', links: [{ label: 'Dasher NZ Collection', bold: true }, { label: 'Terralux™ Collection', bold: true }, { label: 'Varsity Collection', bold: true }, { label: 'New Arrivals' }, { label: 'Bestsellers' }, { label: 'Style Quiz' }] },
        { heading: "Men's Shoes", links: [{ label: 'Shop All' }, { label: 'Sneakers' }, { label: 'Slip Ons' }, { label: 'Slippers' }, { label: 'All-Weather' }, { label: 'Sandals' }] },
        { heading: 'Customer Favorites', links: [{ label: 'Tree Runner NZ' }, { label: 'The Original Tree Runner' }, { label: 'Varsity' }, { label: 'Dasher NZ' }, { label: 'Cruiser' }] }],

        tiles: [
        { label: 'Dasher NZ Collection', bg: 'linear-gradient(145deg,#b0c4b8,#7a9e8a)', wide: true },
        { label: 'Shop Terralux™', bg: 'linear-gradient(145deg,#c8b8a0,#a09070)', wide: false },
        { label: "Men's New Arrivals", bg: 'linear-gradient(145deg,#b0b8cc,#8090b0)', wide: false }]

      },
      'Socks & Apparel': {
        cols: [
        { heading: 'Socks', links: [{ label: 'No Show' }, { label: 'Ankle' }, { label: 'Crew' }, { label: 'All Socks' }] },
        { heading: "Men's Apparel", links: [{ label: 'Tees' }, { label: 'Sweats' }, { label: 'Sale' }, { label: 'All Apparel' }] },
        { heading: 'Accessories', links: [{ label: 'Bags' }, { label: 'Insoles' }, { label: 'Gift Cards' }, { label: 'Laces' }] }],

        tiles: [{ label: "New in Men's Apparel", bg: 'linear-gradient(145deg,#d0c8b8,#a8a090)', wide: true }]
      },
      Sale: {
        cols: [
        { heading: 'Sale', links: [{ label: "All Men's Sale" }, { label: 'Sale Shoes' }, { label: 'Sale Apparel' }] },
        { heading: '', links: [] },
        { heading: '', links: [] }],

        tiles: [{ label: "Shop Men's Sale", bg: 'linear-gradient(145deg,#c8a898,#a07860)', wide: true }]
      }
    }
  },
  women: {
    tabs: ['Shoes', 'Socks & Apparel', 'Sale'],
    panels: {
      Shoes: {
        cols: [
        { heading: 'Featured', links: [{ label: 'Dasher NZ Collection', bold: true }, { label: 'Terralux™ Collection', bold: true }, { label: 'Varsity Collection', bold: true }, { label: 'New Arrivals' }, { label: 'Bestsellers' }, { label: 'Style Quiz' }] },
        { heading: "Women's Shoes", links: [{ label: 'Shop All' }, { label: 'Sneakers' }, { label: 'Flats' }, { label: 'Slip Ons' }, { label: 'Slippers' }, { label: 'All-Weather' }, { label: 'Sandals' }] },
        { heading: 'Popular Picks', links: [{ label: 'Tree Runner NZ' }, { label: 'The Original Tree Runner' }, { label: 'Tree Glider' }, { label: 'Tree Breezer' }, { label: 'Dasher NZ' }, { label: 'Varsity' }] }],

        tiles: [
        { label: 'Dasher NZ Collection', bg: 'linear-gradient(145deg,#c0b0c8,#9080b0)', wide: true },
        { label: 'Shop Terralux™', bg: 'linear-gradient(145deg,#d0c0b0,#b09078)', wide: false },
        { label: "Women's New Arrivals", bg: 'linear-gradient(145deg,#b0c8c0,#80a898)', wide: false }]

      },
      'Socks & Apparel': {
        cols: [
        { heading: 'Socks', links: [{ label: 'No Show' }, { label: 'Ankle Sock' }, { label: 'Crew Sock' }, { label: 'All Socks' }] },
        { heading: 'Apparel', links: [{ label: 'Tees' }, { label: 'Sweats' }, { label: 'Sale' }, { label: 'All Apparel' }] },
        { heading: 'Accessories', links: [{ label: 'Bags' }, { label: 'Insoles' }, { label: 'Gift Cards' }, { label: 'Laces' }] }],

        tiles: [{ label: "New in Women's Apparel", bg: 'linear-gradient(145deg,#d8c8d8,#b0a0c0)', wide: true }]
      },
      Sale: {
        cols: [
        { heading: 'Sale', links: [{ label: "All Women's Sale" }, { label: 'Sale Shoes' }, { label: 'Sale Apparel' }] },
        { heading: '', links: [] },
        { heading: '', links: [] }],

        tiles: [{ label: "Shop Women's Sale", bg: 'linear-gradient(145deg,#c8b0d0,#a080b0)', wide: true }]
      }
    }
  },
  sale: null
};

const SALE_MENU = {
  mens: [{ label: 'All Sale', href: '/collections/sale-mens' }, { label: 'Sale Shoes', href: '/collections/sale-mens-shoes' }, { label: 'Sale Apparel', href: '/collections/sale-mens-apparel' }],
  womens: [{ label: 'All Sale', href: '/collections/sale-womens' }, { label: 'Sale Shoes', href: '/collections/sale-womens-shoes' }, { label: 'Sale Apparel', href: '/collections/sale-womens-apparel' }]
};





export function MegaMenu({ activeMenu }) {
  const [activeTab, setActiveTab] = useState({ men: 'Shoes', women: 'Shoes', sale: '' });

  if (!activeMenu) return null;

  // Sale panel
  if (activeMenu === 'sale') {
    return (
      <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[-1] rounded-2xl bg-white px-7 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.13),0_0_0_0.5px_rgba(0,0,0,0.06)]">
        <div className="grid grid-cols-[140px_140px_1fr] gap-6">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-black">Men</p>
            <ul className="flex flex-col gap-2">
              {SALE_MENU.mens.map((l) => <li key={l.label}><Link href={l.href} className="text-sm text-gray-600 hover:text-brand-black transition-colors duration-150">{l.label}</Link></li>)}
            </ul>
          </div>
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-black">Women</p>
            <ul className="flex flex-col gap-2">
              {SALE_MENU.womens.map((l) => <li key={l.label}><Link href={l.href} className="text-sm text-gray-600 hover:text-brand-black transition-colors duration-150">{l.label}</Link></li>)}
            </ul>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[{ label: "Shop Men's Sale", bg: 'linear-gradient(145deg,#c8a898,#a07860)' }, { label: "Shop Women's Sale", bg: 'linear-gradient(145deg,#b0c8c0,#709898)' }].map((t) =>
            <div key={t.label} className="group relative cursor-pointer overflow-hidden rounded-xl" style={{ aspectRatio: '16/9' }}>
                <div className="absolute inset-0 transition-transform duration-500 group-hover:scale-105" style={{ background: t.bg }} />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                  <span className="text-[10px] font-medium uppercase tracking-widest text-white">{t.label}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>);

  }

  const menu = MENUS[activeMenu];
  if (!menu) return null;
  const currentTab = activeTab[activeMenu];
  const panel = menu.panels[currentTab];

  return (
    <div className="absolute left-0 right-0 top-[calc(100%+10px)] z-[-1] rounded-2xl bg-white px-7 py-6 shadow-[0_8px_40px_rgba(0,0,0,0.13),0_0_0_0.5px_rgba(0,0,0,0.06)]">
      {/* Tabs */}
      <div className="mb-5 flex gap-0 border-b border-gray-200">
        {menu.tabs.map((tab) =>
        <button
          key={tab}
          onClick={() => setActiveTab((p) => ({ ...p, [activeMenu]: tab }))}
          className={cn(
            '-mb-px mr-6 pb-3 text-[11px] font-normal uppercase tracking-widest transition-colors duration-150 border-b-2 focus-visible:outline-none',
            currentTab === tab ?
            'border-brand-black text-brand-black' :
            'border-transparent text-gray-600 hover:text-brand-black'
          )}>
          
            {tab}
          </button>
        )}
      </div>

      {/* Panel */}
      <div className="grid grid-cols-[155px_155px_155px_1fr] gap-6">
        {panel.cols.map((col, i) =>
        <div key={i}>
            {col.heading &&
          <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-brand-black">{col.heading}</p>
          }
            <ul className="flex flex-col gap-2">
              {col.links.map((link) =>
            <li key={link.label}>
                  <Link
                href={`/collections/${link.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={cn(
                  'text-sm transition-colors duration-150 hover:text-brand-black',
                  link.bold ? 'font-medium text-gray-800' : 'text-gray-600'
                )}>
                
                    {link.label}
                  </Link>
                </li>
            )}
            </ul>
          </div>
        )}

        {/* Tiles */}
        <div className="grid grid-cols-2 gap-2">
          {panel.tiles.map((tile) =>
          <div
            key={tile.label}
            className={cn(
              'group relative cursor-pointer overflow-hidden rounded-xl',
              tile.wide ? 'col-span-2' : ''
            )}
            style={{ aspectRatio: tile.wide ? '21/8' : '4/3' }}>
            
              <div
              className="absolute inset-0 transition-transform duration-500 group-hover:scale-105"
              style={{ background: tile.bg }} />
            
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent p-3">
                <span className="text-[10px] font-medium uppercase tracking-widest text-white">{tile.label}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>);

}
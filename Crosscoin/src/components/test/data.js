// Sample catalogue for the /test design preview (not from the live API).
export const COLOR_HEX = {
  Crimson: 'linear-gradient(150deg,#ce1e36,#99122a)',
  Indigo: 'linear-gradient(150deg,#2b1c63,#180d3e)',
  Forest: 'linear-gradient(150deg,#0f766e,#134e4a)',
  Sand: 'linear-gradient(150deg,#d9c7a0,#b79b63)',
  Ink: 'linear-gradient(150deg,#333,#111)',
};

export const PRODUCTS = [
  { id: 'rib', brand: 'SOXBAE', name: 'Ribbed Crew Socks', cat: 'Socks', now: 649, was: 899, off: 28, rating: '4.9', revs: 412, flag: 'BESTSELLER', colors: ['Crimson', 'Indigo', 'Ink'] },
  { id: 'bean', brand: 'KNITWINK', name: 'Merino Wool Beanie', cat: 'Knitwear', now: 899, was: 1299, off: 31, rating: '4.8', revs: 188, flag: 'NEW', colors: ['Indigo', 'Forest', 'Sand'] },
  { id: 'grip', brand: 'GRIPZUS', name: 'Anti-Slip Sport Socks', cat: 'Sport', now: 499, was: 699, off: 29, rating: '4.7', revs: 256, flag: null, colors: ['Crimson', 'Ink'] },
  { id: 'ank', brand: 'MORBIX', name: 'Statement Ankle Socks', cat: 'Socks', now: 549, was: 749, off: 27, rating: '4.8', revs: 321, flag: 'TRENDING', colors: ['Crimson', 'Indigo', 'Forest'] },
  { id: 'scarf', brand: 'VELMIQUE', name: 'Cashmere Blend Scarf', cat: 'Accessories', now: 1799, was: 2499, off: 28, rating: '5.0', revs: 64, flag: 'LUXE', colors: ['Sand', 'Indigo', 'Crimson'] },
  { id: 'liner', brand: 'SOXBAE', name: 'No-Show Liner Socks', cat: 'Socks', now: 599, was: 849, off: 29, rating: '4.6', revs: 503, flag: null, colors: ['Ink', 'Sand'] },
  { id: 'mit', brand: 'KNITWINK', name: 'Chunky Knit Mittens', cat: 'Knitwear', now: 699, was: 999, off: 30, rating: '4.9', revs: 97, flag: 'NEW', colors: ['Forest', 'Crimson', 'Indigo'] },
  { id: 'comp', brand: 'GRIPZUS', name: 'Compression Running Socks', cat: 'Sport', now: 749, was: 1049, off: 29, rating: '4.8', revs: 142, flag: null, colors: ['Indigo', 'Ink'] },
  { id: 'wool', brand: 'KNITWINK', name: 'Lambswool Crew Jumper', cat: 'Knitwear', now: 2299, was: 3199, off: 28, rating: '4.9', revs: 73, flag: 'NEW', colors: ['Sand', 'Forest', 'Indigo'] },
  { id: 'cap', brand: 'MORBIX', name: 'Terry Cushion Trainer Socks', cat: 'Sport', now: 629, was: 899, off: 30, rating: '4.7', revs: 210, flag: null, colors: ['Crimson', 'Ink', 'Forest'] },
  { id: 'glove', brand: 'VELMIQUE', name: 'Leather-Trim Gloves', cat: 'Accessories', now: 1499, was: 1999, off: 25, rating: '4.8', revs: 48, flag: 'LUXE', colors: ['Ink', 'Sand'] },
  { id: 'bamb', brand: 'SOXBAE', name: 'Bamboo Everyday Socks — 6 Pack', cat: 'Socks', now: 799, was: 1199, off: 33, rating: '4.9', revs: 640, flag: 'BESTSELLER', colors: ['Indigo', 'Crimson', 'Forest'] },
];

export const SIZES = ['S', 'M', 'L', 'XL'];

// Admin-set bundle tiers (pairs → price) — the "Buy More, Save More" ladder.
export const PACKS = [
  { q: 1, label: 'Single', d: 'Try it out', mult: 1, save: 0 },
  { q: 3, label: 'Pack of 3', d: 'Our favourite', mult: 2.7, save: 10, best: true },
  { q: 5, label: 'Pack of 5', d: 'Best value', mult: 4.25, save: 15 },
];

export const CATS = [
  { name: 'Socks', n: '42', color: 'c1' },
  { name: 'Knitwear', n: '18', color: 'c2' },
  { name: 'Sport', n: '12', color: 'c3' },
  { name: 'Accessories', n: '26', color: 'c4' },
];

export const FAQS = [
  ['When will my order arrive?', 'Orders placed before 2pm ship the same day. Metro cities typically receive in 2–3 days, rest of India 4–6 days. You’ll get WhatsApp + email tracking at every step.'],
  ['What is your return policy?', '7-day easy returns on unworn items with free pickup. Start a return from your account or the track-order page — refunds to the original payment method or as store credit, your choice.'],
  ['Do you offer cash on delivery?', 'Yes. COD is available across India on orders up to ₹5,000, alongside UPI, cards and net-banking.'],
  ['How do the pack discounts work?', 'Packs are priced per the whole bundle — the more you add, the lower the per-item price. The discount is applied automatically at checkout and stacks on top of any live coupon.'],
  ['Are the sizes true to fit?', 'Our socks are knit with a stretch band and fit true to the stated shoe size. For knitwear, check the size chart on each product — if in doubt, size up for a relaxed fit.'],
];

export const inr = (n) => '₹' + Math.round(Number(n) || 0).toLocaleString('en-IN');
export const productById = (id) => PRODUCTS.find((p) => p.id === id) || PRODUCTS[0];

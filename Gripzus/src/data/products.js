/* Shared product catalogue — used by the home, products listing, search
   and wishlist. Swap for an API later (structure-first). */

const C = {
  ink:    { name: 'Ink',    hex: '#141414' },
  oat:    { name: 'Oat',    hex: '#D9CDB1' },
  clay:   { name: 'Clay',   hex: '#A8442A' },
  sage:   { name: 'Sage',   hex: '#6E7A5E' },
  slate:  { name: 'Slate',  hex: '#5A6470' },
  cream:  { name: 'Cream',  hex: '#EDE7D9' },
};

export const PRODUCTS = [
  { id: '1', name: 'Performance Trail', slug: 'performance-trail', collection: 'Athletic', category: 'athletic', price: 599, salePrice: 449, badge: 'Bestseller',
    colors: [C.ink, C.oat, C.clay, C.slate],
    images: ['https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1604644401890-0bd678c83788?w=900&q=80&auto=format&fit=crop'] },
  { id: '2', name: 'Heritage Charcoal', slug: 'heritage-charcoal', collection: 'Dress', category: 'dress', price: 799, badge: 'New',
    colors: [C.ink, C.slate, C.cream],
    images: ['https://images.unsplash.com/photo-1589810635657-232948472d98?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1607793483011-d10bb1d8be0c?w=900&q=80&auto=format&fit=crop'] },
  { id: '3', name: 'Weekend Oat', slug: 'weekend-oat', collection: 'Casual', category: 'casual', price: 549,
    colors: [C.oat, C.cream, C.sage],
    images: ['https://images.unsplash.com/photo-1542219550-37153d387c27?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=900&q=80&auto=format&fit=crop'] },
  { id: '4', name: 'Merino Forest', slug: 'merino-forest', collection: 'Wool', category: 'wool', price: 899, salePrice: 649, badge: 'Limited',
    colors: [C.sage, C.ink, C.slate, C.clay, C.oat],
    images: ['https://images.unsplash.com/photo-1577538928305-3807c3993047?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1583500178690-f0d24cb16eaf?w=900&q=80&auto=format&fit=crop'] },
  { id: '5', name: 'Atelier Ribbed', slug: 'atelier-ribbed', collection: 'Dress', category: 'dress', price: 749,
    colors: [C.ink, C.slate],
    images: ['https://images.unsplash.com/photo-1607793483011-d10bb1d8be0c?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1589810635657-232948472d98?w=900&q=80&auto=format&fit=crop'] },
  { id: '6', name: 'Court Crew', slug: 'court-crew', collection: 'Athletic', category: 'athletic', price: 499,
    colors: [C.cream, C.ink, C.clay],
    images: ['https://images.unsplash.com/photo-1567010892083-3b2e2b6cd24c?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1586350977771-b3b0abd50c82?w=900&q=80&auto=format&fit=crop'] },
  { id: '7', name: 'Mountain Wool', slug: 'mountain-wool', collection: 'Wool', category: 'wool', price: 999, badge: 'New',
    colors: [C.slate, C.sage, C.oat],
    images: ['https://images.unsplash.com/photo-1583500178690-f0d24cb16eaf?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1577538928305-3807c3993047?w=900&q=80&auto=format&fit=crop'] },
  { id: '8', name: 'Studio Slip', slug: 'studio-slip', collection: 'Casual', category: 'casual', price: 449,
    colors: [C.cream, C.oat],
    images: ['https://images.unsplash.com/photo-1590247813693-5541d1c609fd?w=900&q=80&auto=format&fit=crop','https://images.unsplash.com/photo-1542219550-37153d387c27?w=900&q=80&auto=format&fit=crop'] },
];

export function getProduct(slug) {
  return PRODUCTS.find((p) => p.slug === slug) || null;
}

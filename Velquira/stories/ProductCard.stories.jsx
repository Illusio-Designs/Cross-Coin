import { ProductCard } from '@/components/collection/ProductCard';

export default {
  title: 'Collection/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

const baseProduct = {
  id: 'p_01',
  handle: 'gilded-band',
  name: 'Gilded Band',
  collectionName: 'Signature',
  price: 1290000,           // paise — ₹12,900
  compareAtPrice: 1450000,
  images: [
    { url: 'https://placehold.co/600x600/eee/333?text=Ring', alt: 'Gilded Band' },
    { url: 'https://placehold.co/600x600/ddd/333?text=Ring+2', alt: 'Gilded Band — side' },
  ],
  colors: [
    { name: 'Gold', hex: '#aa9466', imageIndex: 0 },
    { name: 'Rose Gold', hex: '#b76e79', imageIndex: 1 },
  ],
  variants: [
    { id: 'v_01', color: 'Gold', stock: 8, sku: 'GBD-GOLD' },
    { id: 'v_02', color: 'Rose Gold', stock: 0, sku: 'GBD-ROSE' },
  ],
  badge: 'Hot Selling',
  description: 'Hand-finished 18k vermeil over sterling silver.',
  features: ['18k vermeil', 'Hand-finished'],
};

export const InStock     = { args: { product: baseProduct } };
export const OnSale      = { args: { product: { ...baseProduct, compareAtPrice: 1990000 } } };
export const SingleColor = {
  args: { product: { ...baseProduct, colors: [{ name: 'Gold', hex: '#aa9466', imageIndex: 0 }] } },
};
export const OutOfStock  = {
  args: {
    product: {
      ...baseProduct,
      badge: 'Out of Stock',
      variants: baseProduct.variants.map(v => ({ ...v, stock: 0 })),
    },
  },
};
export const NewArrival  = { args: { product: { ...baseProduct, badge: 'New Arrival' } } };

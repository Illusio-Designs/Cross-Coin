import { ProductCard } from '@/components/collection/ProductCard';

export default {
  title: 'Collection/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
};

const baseProduct = {
  id: 'p_01',
  handle: 'crew-cotton-sock',
  name: 'Crew Cotton Sock',
  collectionName: 'Everyday',
  price: 49900,           // paise
  compareAtPrice: 59900,
  images: [
    { url: 'https://placehold.co/600x600/eee/333?text=Sock', alt: 'Crew Cotton Sock' },
    { url: 'https://placehold.co/600x600/ddd/333?text=Sock+2', alt: 'Crew Cotton Sock — back' },
  ],
  colors: [
    { name: 'Charcoal', hex: '#333', imageIndex: 0 },
    { name: 'Cream',    hex: '#f5f1e6', imageIndex: 1 },
  ],
  variants: [
    { id: 'v_01', color: 'Charcoal', stock: 12, sku: 'CCS-CHAR' },
    { id: 'v_02', color: 'Cream',    stock: 0,  sku: 'CCS-CREAM' },
  ],
  badge: 'Hot Selling',
  description: 'Soft combed cotton. Reinforced heel + toe.',
  features: ['Combed cotton', 'Reinforced heel'],
};

export const InStock     = { args: { product: baseProduct } };
export const OnSale      = { args: { product: { ...baseProduct, compareAtPrice: 79900 } } };
export const SinglePack  = {
  args: { product: { ...baseProduct, colors: [{ name: 'Charcoal', hex: '#333', imageIndex: 0 }] } },
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

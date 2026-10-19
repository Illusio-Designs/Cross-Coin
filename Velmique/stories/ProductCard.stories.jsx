import { StoreProvider } from '@/lib/store';
import ProductCard from '@/app/_components/ProductCard';

/**
 * Velmique's ProductCard reads from useStore() (cart + wishlist), so
 * every story is wrapped in <StoreProvider> via a decorator. Without
 * it, the component would throw "useStore must be used within
 * StoreProvider".
 */
export default {
  title: 'Shop/ProductCard',
  component: ProductCard,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  decorators: [
    (Story) => (
      <StoreProvider>
        <div className="m-root" style={{ width: 320 }}>
          <Story />
        </div>
      </StoreProvider>
    ),
  ],
};

const baseProduct = {
  id: 'p_01',
  slug: 'phantom-encens',
  name: 'Phantom Encens',
  collection: 'Signature',
  price: 7500,
  images: [
    'https://placehold.co/600x800/FBF7EC/8B6914?text=Velmique',
    'https://placehold.co/600x800/F5EFE0/8B6914?text=Velmique+2',
  ],
  inStock: true,
  rating: 4.8,
  reviews: 142,
  sizes: ['50ml'],
  defaultVariationId: 'v_01',
  badge: null,
};

export const Default = { args: { product: baseProduct } };

export const OnSale = {
  args: { product: { ...baseProduct, price: 5990, originalPrice: 7500 } },
};

export const OutOfStock = {
  args: { product: { ...baseProduct, inStock: false, badge: 'Sold Out' } },
};

export const NewArrival = {
  args: { product: { ...baseProduct, badge: 'New Arrival' } },
};

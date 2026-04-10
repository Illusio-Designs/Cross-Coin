import { create } from 'zustand';
import { persist } from 'zustand/middleware';










export const useWishlistStore = create()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) =>
      set((state) => ({
        items: state.items.find((i) => i.id === product.id) ?
        state.items :
        [...state.items, product]
      })),
      removeItem: (productId) =>
      set((state) => ({ items: state.items.filter((i) => i.id !== productId) })),
      hasItem: (productId) => get().items.some((i) => i.id === productId),
      toggle: (product) => {
        const has = get().hasItem(product.id);
        has ? get().removeItem(product.id) : get().addItem(product);
      }
    }),
    { name: 'allbirds-wishlist' }
  )
);
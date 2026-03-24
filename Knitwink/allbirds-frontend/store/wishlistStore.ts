import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Product } from '@/types'

interface WishlistStore {
  items: Product[]
  addItem: (product: Product) => void
  removeItem: (productId: string) => void
  hasItem: (productId: string) => boolean
  toggle: (product: Product) => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product) =>
        set((state) => ({
          items: state.items.find((i) => i.id === product.id)
            ? state.items
            : [...state.items, product],
        })),
      removeItem: (productId) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== productId) })),
      hasItem: (productId) => get().items.some((i) => i.id === productId),
      toggle: (product) => {
        const has = get().hasItem(product.id)
        has ? get().removeItem(product.id) : get().addItem(product)
      },
    }),
    { name: 'allbirds-wishlist' }
  )
)

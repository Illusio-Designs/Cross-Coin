import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistItem {
  id: string
  name: string
  price: number
  image: string
}

interface WishlistStore {
  items: WishlistItem[]
  addItem: (item: WishlistItem) => void
  removeItem: (id: string) => void
  isInWishlist: (id: string) => boolean
  toggleItem: (item: WishlistItem) => void
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],

      addItem: (item) => {
        const items = get().items
        if (!items.find((i) => i.id === item.id)) {
          set({ items: [...items, item] })
        }
      },

      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) })
      },

      isInWishlist: (id) => {
        return get().items.some((item) => item.id === id)
      },

      toggleItem: (item) => {
        if (get().isInWishlist(item.id)) {
          get().removeItem(item.id)
        } else {
          get().addItem(item)
        }
      },
    }),
    {
      name: 'jewellery-wishlist-storage',
    }
  )
)

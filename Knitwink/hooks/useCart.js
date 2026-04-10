'use client';

import { useCartStore } from '@/store/cartStore';


export function useCart() {
  const store = useCartStore();

  return {
    items: store.items,
    drawerOpen: store.drawerOpen,
    subtotal: store.items.reduce((sum, i) => sum + i.price * i.quantity, 0),
    itemCount: store.items.reduce((sum, i) => sum + i.quantity, 0),
    addItem: (item) => {
      store.addItem(item);
      store.openDrawer();
    },
    removeItem: store.removeItem,
    updateQty: store.updateQty,
    clearCart: store.clearCart,
    openDrawer: store.openDrawer,
    closeDrawer: store.closeDrawer
  };
}
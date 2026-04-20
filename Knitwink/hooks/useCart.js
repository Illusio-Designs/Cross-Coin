'use client';

import { useCartContext } from '@/context/CartContext';

export function useCart() {
  const {
    cartItems,
    cartCount,
    cartTotal,
    isDrawerOpen,
    setIsDrawerOpen,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCartContext();

  return {
    // Data
    items: cartItems,
    itemCount: cartCount,
    subtotal: cartTotal,

    // Drawer
    drawerOpen: isDrawerOpen,
    openDrawer: () => setIsDrawerOpen(true),
    closeDrawer: () => setIsDrawerOpen(false),

    // addItem — called from ProductCard/ProductInfo with local item shape:
    // { id, productId, variantId, name, color, size, price, quantity, imageUrl, handle }
    addItem: (item) => {
      const varId = item.variantId === 'free-size' ? null : (item.variantId || item.variationId || null);
      addToCart(
        {
          id: item.productId || item.id,
          name: item.name,
          price: item.price,
          compareAtPrice: item.compareAtPrice || 0,
          images: item.imageUrl ? [{ url: item.imageUrl }] : [],
        },
        item.color || null,
        item.size || 'Free Size',
        item.quantity || 1,
        varId,
        item.imageUrl || null
      );
    },

    // Direct API-aware mutations
    removeItem: removeFromCart,
    updateQty: updateQuantity,
    clearCart,
  };
}

'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  size?: string;
  color?: string;
  quantity: number;
  slug: string;
}

interface WishlistItem {
  id: string;
  name: string;
  price: number;
  image: string;
  slug: string;
}

interface StoreContextType {
  cart: CartItem[];
  wishlist: WishlistItem[];
  cartOpen: boolean;
  searchOpen: boolean;
  addToCart: (item: Omit<CartItem, 'quantity'>) => void;
  removeFromCart: (id: string, size?: string) => void;
  updateQuantity: (id: string, qty: number, size?: string) => void;
  toggleWishlist: (item: WishlistItem) => void;
  isWishlisted: (id: string) => boolean;
  setCartOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
  cartTotal: number;
  cartCount: number;
  clearCart: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const addToCart = useCallback((item: Omit<CartItem, 'quantity'>) => {
    setCart(prev => {
      const key = `${item.id}-${item.size}-${item.color}`;
      const existing = prev.find(c => `${c.id}-${c.size}-${c.color}` === key);
      if (existing) {
        return prev.map(c => `${c.id}-${c.size}-${c.color}` === key ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { ...item, quantity: 1 }];
    });
    setCartOpen(true);
  }, []);

  const removeFromCart = useCallback((id: string, size?: string) => {
    setCart(prev => prev.filter(c => !(c.id === id && c.size === size)));
  }, []);

  const updateQuantity = useCallback((id: string, qty: number, size?: string) => {
    if (qty <= 0) { removeFromCart(id, size); return; }
    setCart(prev => prev.map(c => c.id === id && c.size === size ? { ...c, quantity: qty } : c));
  }, [removeFromCart]);

  const toggleWishlist = useCallback((item: WishlistItem) => {
    setWishlist(prev => {
      const exists = prev.find(w => w.id === item.id);
      return exists ? prev.filter(w => w.id !== item.id) : [...prev, item];
    });
  }, []);

  const isWishlisted = useCallback((id: string) => wishlist.some(w => w.id === id), [wishlist]);

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const clearCart = () => setCart([]);

  return (
    <StoreContext.Provider value={{
      cart, wishlist, cartOpen, searchOpen,
      addToCart, removeFromCart, updateQuantity,
      toggleWishlist, isWishlisted,
      setCartOpen, setSearchOpen,
      cartTotal, cartCount, clearCart,
    }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

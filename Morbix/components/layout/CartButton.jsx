'use client';

import { useCart } from '@/context/CartContext';
import Icon from '@/components/Icon';

export default function CartButton() {
  const { count, openCart } = useCart();
  return (
    <button type="button" className="pill cart" onClick={openCart} aria-label={`Cart ${count} ${count === 1 ? 'item' : 'items'}`}>
      <Icon name="ShoppingBag" size={16} /> Cart <span className="badge">{count}</span>
    </button>
  );
}

'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import Icon from '@/components/Icon';

export default function CartButton() {
  const { count } = useCart();
  return (
    <Link href="/cart" className="pill cart">
      <Icon name="ShoppingBag" size={16} /> Cart <span className="badge">{count}</span>
    </Link>
  );
}

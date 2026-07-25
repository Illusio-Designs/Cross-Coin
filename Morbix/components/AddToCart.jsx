'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import Icon from '@/components/Icon';
import { toast } from '@/lib/toast';

/** Add-to-cart button. `size="full"` for the detail page, `icon` for cards. */
export default function AddToCart({ product, size = 'M', display = 'full', qty = 1 }) {
  const { add } = useCart();
  const [added, setAdded] = useState(false);

  const onAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const color = Array.isArray(product.colorNames) ? product.colorNames[0] : null;
    const variationId = Array.isArray(product.variants) ? product.variants[0]?.id : null;
    add({ ...product, color: color || null }, size, qty, variationId ?? null);
    toast.cart(`${product.name} added to cart`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  };

  if (display === 'icon') {
    return (
      <button className="pcard-add" onClick={onAdd} aria-label={`Add ${product.name} to cart`}>
        <Icon name={added ? 'ShieldCheck' : 'ShoppingBag'} size={16} />
      </button>
    );
  }

  if (display === 'bar') {
    return (
      <button className={`pcard-add-btn${added ? ' added' : ''}`} onClick={onAdd}>
        {added ? <>Added <Icon name="ShieldCheck" size={15} /></> : <>Add to cart <Icon name="ShoppingBag" size={15} /></>}
      </button>
    );
  }

  return (
    <button className="btn btn-primary" style={{ width: '100%' }} onClick={onAdd}>
      {added ? <>Added <Icon name="ShieldCheck" size={16} /></> : <>Add to cart <Icon name="ShoppingBag" size={16} /></>}
    </button>
  );
}

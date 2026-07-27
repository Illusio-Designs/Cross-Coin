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
    // Mirror the product-detail add: carry colour, the product image and the
    // first variant's price/SKU so the cart line shows the same details.
    const color = Array.isArray(product.colorNames) ? product.colorNames[0] : null;
    const variant = Array.isArray(product.variants) ? product.variants[0] : null;
    const image = product.image || (Array.isArray(product.images) ? product.images[0] : null) || null;
    add(
      {
        ...product,
        color: color || null,
        image,
        price: variant?.price ?? product.price,
        oldPrice: variant?.oldPrice ?? product.oldPrice ?? null,
        sku: variant?.sku || product.sku || null,
      },
      size,
      qty,
      variant?.id ?? null
    );
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

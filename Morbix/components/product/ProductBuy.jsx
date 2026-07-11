'use client';

import { useState } from 'react';
import { useCart } from '@/context/CartContext';
import Icon from '@/components/Icon';

export default function ProductBuy({ product }) {
  const { add } = useCart();
  const [size, setSize] = useState(product.sizes?.[1] || product.sizes?.[0] || 'M');
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const onAdd = () => {
    add(product, size, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <div className="buy">
      {product.colors?.length > 0 && (
        <div className="opt">
          <span className="opt-label">Color</span>
          <div className="swatches">
            {product.colors.map((c, i) => (
              <button key={i} className={`swatch${i === color ? ' active' : ''}`} style={{ background: c }}
                onClick={() => setColor(i)} aria-label={`Color ${i + 1}`} />
            ))}
          </div>
        </div>
      )}

      <div className="opt">
        <span className="opt-label">Size</span>
        <div className="size-row">
          {product.sizes.map((s) => (
            <button key={s} className={`size-btn${s === size ? ' active' : ''}`} onClick={() => setSize(s)}>{s}</button>
          ))}
        </div>
      </div>

      <div className="buy-row">
        <div className="qty">
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
          <span>{qty}</span>
          <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
        </div>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={onAdd}>
          {added ? <>Added to cart <Icon name="ShieldCheck" size={16} /></> : <>Add to cart <Icon name="ShoppingBag" size={16} /></>}
        </button>
      </div>
    </div>
  );
}

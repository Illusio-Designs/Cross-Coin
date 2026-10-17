'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useStore } from '@/lib/store';

const inr = (n) => '₹' + Number(n || 0).toLocaleString('en-IN');

export default function PdpBuy({ product }) {
  const { addToCart, setCartOpen } = useStore();
  const router = useRouter();

  // Build selectable options from real variations. Each variation has a size +
  // price + image; fall back to a single synthetic option for simple products.
  const options = useMemo(() => {
    const vs = (product.variations || []).filter(Boolean);
    if (!vs.length) {
      return [{ id: product.defaultVariationId || product.id, label: product.sizes?.[0] || 'One Size', price: product.price, image: product.images?.[0] || '' }];
    }
    return vs.map((v) => ({
      id: v.id,
      label: v.size || v.sku || 'Default',
      price: v.price,
      image: v.images?.[0]?.url || product.images?.[0] || '',
    }));
  }, [product]);

  const [sel, setSel] = useState(0);
  const [qty, setQty] = useState(1);
  const opt = options[sel] || options[0];

  const line = () => ({
    id: `${product.id}:${opt.id}`,
    productId: product.id,
    name: product.name,
    price: opt.price,
    size: opt.label,
    image: opt.image,
    quantity: qty,
  });

  const add = () => { addToCart(line()); };
  const buy = () => { addToCart(line()); setCartOpen(false); router.push('/checkout'); };

  return (
    <>
      {options.length > 1 && (
        <div className="m-opt">
          <div className="m-opt__h">Select Size</div>
          <div className="m-sizes">
            {options.map((o, i) => (
              <button key={o.id} type="button" className={`m-size ${i === sel ? 'on' : ''}`} onClick={() => setSel(i)}>
                <b>{o.label}</b><span>{inr(o.price)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="m-buybar">
        <div className="m-qty">
          <button type="button" aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))}>−</button>
          <span>{qty}</span>
          <button type="button" aria-label="Increase quantity" onClick={() => setQty((q) => q + 1)}>+</button>
        </div>
        <button type="button" className="m-btn m-btn--fill m-addbtn" onClick={add}>
          Add to cart · {inr(opt.price * qty)}
        </button>
      </div>
      <button type="button" className="m-btn m-buynow" onClick={buy}>Buy now</button>
    </>
  );
}

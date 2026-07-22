'use client';

import { useState } from 'react';
import Icon from '@/components/Icon';
import ShimmerImg from '@/components/ui/ShimmerImg';
import { useCart } from '@/context/CartContext';

// The buy panel and the image gallery share one `color` selection, so picking a
// swatch swaps the gallery to that variation's photos. Both live here (a single
// client component) instead of two siblings that couldn't share state.
export default function ProductShowcase({ product }) {
  const { add } = useCart();
  const [color, setColor] = useState(0);
  const [size, setSize] = useState(product.sizes?.[1] || product.sizes?.[0] || 'M');
  const [qty, setQty] = useState(1);
  const [active, setActive] = useState(0);
  const [added, setAdded] = useState(false);

  // Images for the currently-selected colour (falls back to all product images).
  const perColor = product.colorImages?.[color];
  const gallery = (Array.isArray(perColor) && perColor.length ? perColor : product.images) || [];
  const shown = gallery.length ? gallery : (product.image ? [product.image] : []);
  const mainSrc = shown[Math.min(active, shown.length - 1)] || product.image || null;

  const pickColor = (i) => { setColor(i); setActive(0); };
  const onAdd = () => { add(product, size, qty); setAdded(true); setTimeout(() => setAdded(false), 1600); };

  return (
    <div className="pdp">
      <div className="pdp-gallery">
        <div className="pdp-main">
          {mainSrc
            ? <ShimmerImg src={mainSrc} alt={product.name} />
            : <span aria-hidden style={{ color: '#c3ccd2' }}><Icon name="Footprints" size={72} /></span>}
          {product.badge === 'new' && <span className="pcard-badge new" style={{ top: 16, left: 16 }}>New</span>}
        </div>

        {shown.length > 1 && (
          <div className="pdp-thumbs">
            {shown.slice(0, 8).map((src, i) => (
              <button
                key={src + i}
                type="button"
                className={`pdp-thumb${i === active ? ' active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`View image ${i + 1}`}
              >
                <ShimmerImg src={src} alt={`${product.name} view ${i + 1}`} loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="pdp-info">
        <span className="eyebrow">{product.category}</span>
        <h1>{product.name}</h1>
        <div className="pdp-meta">
          <span className="rating"><Icon name="Star" size={14} /> {product.rating}</span>
          <a href="#reviews" className="muted">{product.reviews} reviews</a>
          <span className="in-stock"><Icon name="ShieldCheck" size={13} /> In stock</span>
        </div>
        <div className="pdp-price">
          ₹{product.price.toFixed(0)}
          {product.oldPrice && <span className="old">₹{product.oldPrice.toFixed(0)}</span>}
        </div>
        <p className="pdp-desc">{product.description}</p>

        <div className="buy">
          {product.colors?.length > 0 && (
            <div className="opt">
              <span className="opt-label">Color</span>
              <div className="swatches">
                {product.colors.map((c, i) => (
                  <button key={i} type="button" className={`swatch${i === color ? ' active' : ''}`}
                    style={{ background: c }} onClick={() => pickColor(i)} aria-label={`Color ${i + 1}`} />
                ))}
              </div>
            </div>
          )}

          {product.sizes?.length > 0 && (
            <div className="opt">
              <span className="opt-label">Size</span>
              <div className="size-row">
                {product.sizes.map((s) => (
                  <button key={s} type="button" className={`size-btn${s === size ? ' active' : ''}`}
                    onClick={() => setSize(s)}>{s}</button>
                ))}
              </div>
            </div>
          )}

          <div className="buy-row">
            <div className="qty">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
              <span>{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
            </div>
            <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onAdd}>
              {added ? <>Added to cart <Icon name="ShieldCheck" size={16} /></> : <>Add to cart <Icon name="ShoppingBag" size={16} /></>}
            </button>
          </div>
        </div>

        <div className="pdp-trust">
          <div><Icon name="Truck" size={16} /> Free shipping over ₹999</div>
          <div><Icon name="RefreshCw" size={16} /> 14-day returns</div>
          <div><Icon name="ShieldCheck" size={16} /> Authentic</div>
        </div>
      </div>
    </div>
  );
}

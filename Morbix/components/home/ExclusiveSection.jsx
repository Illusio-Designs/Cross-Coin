'use client';

import { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import { useCart } from '@/context/CartContext';
import { toast } from '@/lib/toast';

// "Hand-Picked for You" — a featured-product spotlight (same idea as the other
// brands' Exclusive section). Pick a product on the right rail, browse its
// images on the left, choose a colour and add it straight to the cart.
export default function ExclusiveSection({ products = [] }) {
  const list = Array.isArray(products) ? products.slice(0, 6) : [];
  const { add } = useCart();
  const [active, setActive] = useState(0);
  const [thumb, setThumb] = useState(0);
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const product = list[active];

  const gallery = useMemo(() => {
    if (!product) return [];
    const perColor = product.colorImages?.[color];
    const g = (Array.isArray(perColor) && perColor.length ? perColor : product.images) || [];
    return g.length ? g : (product.image ? [product.image] : []);
  }, [product, color]);

  // Auto-advance the spotlight image through the gallery, one by one, every 3s.
  useEffect(() => {
    if (gallery.length <= 1) return;
    const t = setInterval(() => setThumb((i) => (i + 1) % gallery.length), 3000);
    return () => clearInterval(t);
  }, [gallery.length, active, color]);

  if (!product) return null;

  const colorNames = product.colorNames || [];
  const selectedColorName = colorNames[color] || '';
  const mainSrc = gallery[Math.min(thumb, gallery.length - 1)] || product.image || null;
  const off = product.oldPrice ? Math.round((1 - product.price / product.oldPrice) * 100) : 0;

  const pick = (i) => { setActive(i); setThumb(0); setColor(0); setQty(1); };
  const pickColor = (i) => { setColor(i); setThumb(0); };

  const onAdd = () => {
    const variant = product.variants?.find((v) => v.color === selectedColorName) || product.variants?.[0];
    add(
      {
        ...product,
        image: gallery[0] || product.image || null,
        color: selectedColorName || null,
        price: variant?.price ?? product.price,
        oldPrice: variant?.oldPrice ?? product.oldPrice ?? null,
        sku: variant?.sku || product.sku || null,
      },
      product.sizes?.[1] || product.sizes?.[0] || 'M',
      qty,
      variant?.id ?? null
    );
    toast.cart(`${product.name} added to cart`);
    setAdded(true);
    setTimeout(() => setAdded(false), 1600);
  };

  return (
    <section className="section exclusive">
      <div className="container">
        <div className="excl-panel">
          <div className="excl-panel-head">
            <span className="excl-ribbon"><Icon name="Sparkles" size={13} /> Spotlight</span>
            <h2>The Morbix Edit</h2>
            <p>One standout pair, chosen this week — worth a closer look.</p>
          </div>

        <div className="excl-grid">
          {/* Gallery */}
          <div className="excl-gallery">
            {gallery.length > 1 && (
              <div className="excl-thumbs" data-lenis-prevent>
                {gallery.map((src, i) => (
                  <button key={src + i} type="button" className={`excl-thumb${i === thumb ? ' active' : ''}`}
                    onClick={() => setThumb(i)} aria-label={`View image ${i + 1}`}>
                    <img src={src} alt="" loading="lazy" />
                  </button>
                ))}
              </div>
            )}
            <div className="excl-main">
              {mainSrc
                ? <img src={mainSrc} alt={product.name} />
                : <span aria-hidden style={{ color: '#c3ccd2' }}><Icon name="Footprints" size={64} /></span>}
              {product.badge && <span className={`pcard-badge b-${product.badgeKey || 'default'}`} style={{ position: 'absolute', top: 14, left: 14 }}>{product.badge}</span>}
            </div>
          </div>

          {/* Info */}
          <div className="excl-info">
            <span className="excl-cat">{product.category}</span>
            <h3>{product.name}</h3>
            <div className="excl-price">
              ₹{Number(product.price).toFixed(0)}
              {product.oldPrice ? <span className="old">₹{Number(product.oldPrice).toFixed(0)}</span> : null}
              {off > 0 && <span className="excl-off">{off}% OFF</span>}
            </div>

            {product.colors?.length > 0 && (
              <div className="excl-opt">
                <span className="excl-opt-label">Color{selectedColorName ? ` — ${selectedColorName}` : ''}</span>
                <div className="swatches">
                  {product.colors.map((c, i) => (
                    <button key={i} type="button" className={`swatch${i === color ? ' active' : ''}`}
                      style={{ background: c }} onClick={() => pickColor(i)}
                      aria-label={colorNames[i] || `Color ${i + 1}`} title={colorNames[i] || ''} />
                  ))}
                </div>
              </div>
            )}

            {product.description && <p className="excl-desc">{product.description}</p>}

            <div className="excl-actions">
              <div className="qty">
                <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">−</button>
                <span>{qty}</span>
                <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
              </div>
              <button type="button" className="btn btn-primary" style={{ flex: 1 }} onClick={onAdd}>
                {added ? <>Added <Icon name="ShieldCheck" size={16} /></> : <>Add to cart <Icon name="ShoppingBag" size={16} /></>}
              </button>
              <Link href={`/products/${product.slug}`} className="btn btn-ghost">View</Link>
            </div>
          </div>

          {/* Product switcher */}
          {list.length > 1 && (
            <div className="excl-switch" data-lenis-prevent>
              {list.map((p, i) => (
                <button key={p.id} type="button" className={`excl-switch-thumb${i === active ? ' active' : ''}`}
                  onClick={() => pick(i)} aria-label={p.name} title={p.name}>
                  {p.image ? <img src={p.image} alt="" loading="lazy" /> : <Icon name="Footprints" size={20} />}
                </button>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    </section>
  );
}

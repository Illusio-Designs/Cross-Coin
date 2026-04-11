'use client';

import { useState, useMemo } from 'react';
import { useIntersectionObserver } from '@/hooks/useIntersectionObserver';
import { useCart } from '@/hooks/useCart';
import { StickyATCBar } from './StickyATCBar';
import { formatPrice, cn } from '@/lib/utils';
import { Minus, Plus, ShoppingBag, Zap, Eye, TrendingUp } from 'lucide-react';

function seedNum(id, min, max) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = Math.imul(31, h) + id.charCodeAt(i) | 0;
  return min + Math.abs(h) % (max - min + 1);
}

export function ProductInfo({ product, onColorChange }) {
  const [activeColor, setActiveColor] = useState(
    product.colors[0] ?? { name: 'Default', hex: '#f2f0eb', imageIndex: 0 }
  );
  const [qty, setQty] = useState(1);
  const [addedFeedback, setAddedFeedback] = useState(false);
  const { addItem } = useCart();
  const { ref: atcRef, isVisible: atcVisible } = useIntersectionObserver({ threshold: 0.5 });

  const stockLeft = useMemo(() => seedNum(product.id, 2, 6), [product.id]);
  const viewing   = useMemo(() => seedNum(product.id + 'v', 80, 220), [product.id]);
  const sold      = useMemo(() => seedNum(product.id + 's', 800, 3200), [product.id]);

  const handleColorSelect = (color) => {
    setActiveColor(color);
    onColorChange?.(color);
  };

  const handleAddToCart = () => {
    const variant = product.variants[0];
    addItem({
      id: variant?.id ?? product.id,
      productId: product.id,
      variantId: variant?.id ?? 'free-size',
      name: product.name,
      color: activeColor.name,
      size: 'Free Size',
      price: product.price,
      quantity: qty,
      imageUrl: product.images[0]?.url ?? '',
      handle: product.handle,
    });
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => { window.location.href = '/checkout'; }, 300);
  };

  return (
    <>
      <div className="flex flex-col gap-5">

        {/* Title + SKU */}
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-gray-400">{product.collectionName}</p>
          <h1 className="mt-1 text-2xl font-semibold leading-snug text-brand-black lg:text-3xl">{product.name}</h1>
          {product.sku && <p className="mt-1 text-xs text-gray-400">SKU: {product.sku}</p>}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-3">
          <span className="text-2xl font-bold text-brand-black">{formatPrice(product.price)}</span>
          {product.compareAtPrice && (
            <>
              <span className="text-base text-gray-400 line-through">{formatPrice(product.compareAtPrice)}</span>
              <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-500">
                {Math.round((1 - product.price / product.compareAtPrice) * 100)}% OFF
              </span>
            </>
          )}
        </div>

        {/* Social proof */}
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-600">
          <span className="flex items-center gap-1.5 font-medium text-red-500">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Only {stockLeft} left
          </span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1"><Eye size={12} /> {viewing} viewing</span>
          <span className="text-gray-300">|</span>
          <span className="flex items-center gap-1">
            <TrendingUp size={12} />
            {sold >= 1000 ? `${(sold / 1000).toFixed(1)}k` : sold} sold
          </span>
        </div>

        {/* Color selector — pack-aware */}
        {product.colors.length > 0 && product.colors[0].name && (
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">
              Color — <span className="normal-case font-normal text-brand-black">{activeColor.name}</span>
            </p>
            <div role="radiogroup" aria-label="Select color" className="flex flex-wrap gap-2">
              {product.colors.map((color) =>
                color.packColors ? (
                  // Pack: multiple dots + "Pack of N" label
                  <button
                    key={color.name}
                    role="radio"
                    aria-label={color.name}
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'flex flex-col items-center gap-1 rounded-xl border-2 px-2 py-1.5 transition-all duration-150 focus-visible:outline-none',
                      activeColor.name === color.name
                        ? 'border-brand-black bg-gray-50'
                        : 'border-gray-200 hover:border-gray-400'
                    )}
                  >
                    <div className="flex gap-1">
                      {color.packColors.map((pc) => (
                        <span key={pc.name} className="h-5 w-5 rounded-full border border-gray-200" style={{ backgroundColor: pc.hex }} />
                      ))}
                    </div>
                    <span className="text-[9px] font-semibold text-gray-500">Pack of {color.packColors.length}</span>
                  </button>
                ) : (
                  // Single color dot
                  <button
                    key={color.name}
                    role="radio"
                    aria-label={color.name}
                    aria-checked={activeColor.name === color.name}
                    onClick={() => handleColorSelect(color)}
                    title={color.name}
                    className={cn(
                      'h-7 w-7 rounded-full border-2 transition-all duration-150 focus-visible:outline-none',
                      activeColor.name === color.name
                        ? 'border-brand-black ring-2 ring-brand-black ring-offset-2'
                        : 'border-gray-200 hover:border-gray-400'
                    )}
                    style={{ backgroundColor: color.hex }}
                  />
                )
              )}
            </div>
          </div>
        )}

        {/* Size — Free Size */}
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-widest text-gray-500">Size</p>
          <button disabled className="cursor-default rounded-full border-2 border-brand-black bg-brand-black px-6 py-2 text-sm font-medium text-white">
            Free Size
          </button>
        </div>

        {/* Quantity + CTAs in one row */}
        <div className="flex items-center gap-3" ref={atcRef}>
          <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-2">
            <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease" className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-gray-100">
              <Minus size={13} />
            </button>
            <span className="w-5 text-center text-sm font-medium">{qty}</span>
            <button onClick={() => setQty((q) => q + 1)} aria-label="Increase" className="flex h-7 w-7 items-center justify-center rounded-full transition hover:bg-gray-100">
              <Plus size={13} />
            </button>
          </div>

          <button
            onClick={handleAddToCart}
            className={cn(
              'flex flex-1 items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold uppercase tracking-wider transition-colors duration-150',
              addedFeedback
                ? 'bg-green-600 text-white'
                : 'border-2 border-brand-black bg-white text-brand-black hover:bg-brand-black hover:text-white'
            )}
          >
            <ShoppingBag size={15} />
            {addedFeedback ? 'Added!' : 'Add to Bag'}
          </button>

          <button
            onClick={handleBuyNow}
            className="flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-black py-3 text-sm font-semibold uppercase tracking-wider text-white transition-colors hover:bg-gray-800"
          >
            <Zap size={15} />
            Buy Now
          </button>
        </div>
      </div>

      <StickyATCBar
        visible={!atcVisible}
        productName={product.name}
        color={activeColor.name}
        price={product.price}
        selectedSize="Free Size"
        onAddToCart={handleAddToCart}
      />
    </>
  );
}

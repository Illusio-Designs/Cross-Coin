'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ArrowUpRight, X } from 'lucide-react';
import { useStore } from '@/lib/store';
import { getProductBySlug } from '@/lib/api/products';
import PageHeader from '@/components/layout/PageHeader';

export default function WishlistPage() {
  const { wishlist, wishlistLoading, toggleWishlist, addToCart, updateWishlistItem } = useStore();

  // Cache: wishlist item id → full product (with variations)
  const [products, setProducts] = useState({});

  // Fetch the full product for each wishlist item once so we can render
  // size/colour selectors. Already-fetched ones are skipped.
  useEffect(() => {
    let alive = true;
    const missing = wishlist.filter(w => w.slug && !products[w.id]);
    if (!missing.length) return;

    Promise.all(
      missing.map(w => getProductBySlug(w.slug).then(p => [w.id, p]).catch(() => [w.id, null]))
    ).then(pairs => {
      if (!alive) return;
      setProducts(prev => {
        const next = { ...prev };
        for (const [id, p] of pairs) if (p) next[id] = p;
        return next;
      });
    });

    return () => { alive = false; };
  }, [wishlist]); // eslint-disable-line react-hooks/exhaustive-deps

  // Build variation lookup: pick the variation that matches the chosen size/colour
  const findVariation = (product, { size, color }) => {
    if (!product?.variations?.length) return null;
    return product.variations.find(v =>
      (!size  || v.sizes.includes(size)) &&
      (!color || v.colors.includes(color))
    ) || product.variations.find(v => v.id === product.defaultVariationId) || product.variations[0];
  };

  const onPickSize = (item, size) => {
    const product = products[item.id];
    const variation = findVariation(product, { size, color: item.color });
    updateWishlistItem(item.id, {
      size,
      variationId: variation?.id || item.variationId,
      price: variation?.price ?? item.price,
      image: variation?.images?.[0]?.url || item.image,
    });
  };

  const onPickColor = (item, color) => {
    const product = products[item.id];
    const variation = findVariation(product, { size: item.size, color });
    updateWishlistItem(item.id, {
      color,
      variationId: variation?.id || item.variationId,
      price: variation?.price ?? item.price,
      image: variation?.images?.[0]?.url || item.image,
    });
  };

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Saved Items"
        title="YOUR"
        accent="WISHLIST"
        intro="Fragrances you've saved to revisit. Move them to your bag whenever the moment is right."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        {wishlistLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="aspect-[3/4] bg-[#EAE0C7] animate-pulse" />
                <div className="p-5 space-y-2">
                  <div className="h-3 w-1/3 rounded bg-[#EAE0C7] animate-pulse" />
                  <div className="h-4 w-3/4 rounded bg-[#EAE0C7] animate-pulse" />
                  <div className="h-9 w-full rounded-full bg-[#EAE0C7] animate-pulse mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-5 bg-white border border-[var(--border)] rounded-2xl">
            <Heart size={52} className="text-[var(--ink-muted)]" />
            <p className="font-display text-3xl text-[var(--ink)] uppercase tracking-tight">Your wishlist is empty</p>
            <p className="text-[var(--ink-soft)] text-sm font-body">Save fragrances you love to revisit them later.</p>
            <Link href="/shop" className="pill-cta mt-2">
              Browse the Shop <ArrowUpRight size={14} strokeWidth={1.6} />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {wishlist.map((item, index) => {
              const product = products[item.id];
              const sizes  = product?.sizes?.filter(s => s && s !== 'One Size') || [];
              const colors = product?.colors || [];
              const hasOptions = sizes.length > 0 || colors.length > 0;

              // Pick the safest image source. The wishlist API's `image` is
              // unreliable (returns a non-existent /assets/demo-product path
              // when no ProductImage row is flagged is_primary), so we prefer
              // the freshly-fetched product gallery and fall back hard.
              const primaryImg = product?.images?.find(Boolean);
              const itemImgOk  = item.image && !item.image.includes('/assets/demo-product');
              const safeSrc    = primaryImg || (itemImgOk ? item.image : '/perfumehero.png');

              return (
                <motion.div
                  key={item.id}
                  className="group bg-white border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col"
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.6, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
                >
                  {/* ── Image — natural aspect, full picture visible ───────── */}
                  <Link href={`/product/${item.slug}`} className="relative block bg-[#EAE0C7] aspect-[4/5]">
                    <img
                      src={safeSrc}
                      alt={item.name}
                      onError={(e) => {
                        if (e.currentTarget.src.indexOf('/perfumehero.png') === -1) {
                          e.currentTarget.src = '/perfumehero.png';
                        }
                      }}
                      className="block w-full h-full object-cover transition-transform duration-[1100ms] ease-out group-hover:scale-[1.03]"
                    />

                    {/* Remove (X) — top-right */}
                    <button
                      onClick={(e) => { e.preventDefault(); toggleWishlist(item); }}
                      className="absolute top-3 right-3 z-20 w-8 h-8 flex items-center justify-center bg-[#C9A84C] text-[#1A1612] hover:bg-[#b8983e] transition-colors rounded-full"
                      aria-label="Remove from wishlist"
                    >
                      <X size={12} />
                    </button>

                    {/* Torn-paper bottom edge */}
                    <div
                      className="absolute bottom-0 left-0 right-0 h-3 bg-white pointer-events-none"
                      style={{
                        clipPath: 'polygon(0 40%, 4% 85%, 9% 50%, 15% 90%, 22% 55%, 30% 92%, 38% 48%, 46% 88%, 54% 55%, 62% 92%, 70% 48%, 78% 88%, 86% 55%, 93% 92%, 100% 55%, 100% 100%, 0 100%)',
                      }}
                    />
                  </Link>

                  {/* ── Body ────────────────────────────────────────────────── */}
                  <div className="p-3.5 flex-1 flex flex-col gap-2.5">

                    {/* Title row + price */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {product?.collection && (
                          <p className="text-[#8A7E6C] text-[8px] tracking-[0.3em] uppercase font-body mb-1 truncate">
                            {product.collection}
                          </p>
                        )}
                        <Link href={`/product/${item.slug}`}>
                          <h3 className="font-serif text-[#1A1612] text-sm md:text-base leading-tight hover:italic hover:text-[#8B6914] transition-all line-clamp-2">
                            {item.name}
                          </h3>
                        </Link>
                      </div>
                      <span className="font-serif text-[#1A1612] text-base italic shrink-0">
                        ₹{Number(item.price).toLocaleString('en-IN')}
                      </span>
                    </div>

                    {/* Variation selectors — fed by the fetched product. Only
                        rendered when the product has real options to choose. */}
                    {hasOptions && (
                      <div className="space-y-2">
                        {colors.length > 0 && (
                          <div>
                            <p className="text-[8px] tracking-[0.25em] uppercase text-[#8A7E6C] font-body mb-1 truncate">
                              Colour: <span className="text-[#1A1612]">{item.color || '—'}</span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {colors.map(c => (
                                <button
                                  key={c}
                                  onClick={() => onPickColor(item, c)}
                                  className={`px-2 h-6 text-[9px] font-body border rounded-full transition-all ${
                                    item.color === c
                                      ? 'border-[#1A1612] bg-[#1A1612] text-white'
                                      : 'border-[#E0D4B8] text-[#4A3F33] hover:border-[#C9A84C]'
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {sizes.length > 0 && (
                          <div>
                            <p className="text-[8px] tracking-[0.25em] uppercase text-[#8A7E6C] font-body mb-1 truncate">
                              Size: <span className="text-[#1A1612]">{item.size || '—'}</span>
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {sizes.map(s => (
                                <button
                                  key={s}
                                  onClick={() => onPickSize(item, s)}
                                  className={`px-2 h-6 text-[9px] font-body border rounded-full transition-all ${
                                    item.size === s
                                      ? 'border-[#1A1612] bg-[#1A1612] text-white'
                                      : 'border-[#E0D4B8] text-[#4A3F33] hover:border-[#C9A84C]'
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Add to Bag */}
                    <button
                      onClick={() =>
                        addToCart({
                          id: `${item.id}:${item.variationId || 'default'}`,
                          productId:   item.id,
                          variationId: item.variationId || null,
                          name: item.name,
                          price: item.price,
                          image: item.image,
                          slug: item.slug,
                          size: item.size,
                          color: item.color,
                        })
                      }
                      className="mt-auto pill-cta justify-center w-full !py-2 !text-[9px]"
                    >
                      Add to Bag
                      <ArrowUpRight size={11} strokeWidth={1.6} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

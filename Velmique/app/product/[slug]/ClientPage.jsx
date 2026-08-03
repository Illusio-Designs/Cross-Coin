'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ShoppingBag, Heart, ChevronRight, Star, Minus, Plus, Zap,
  Truck, RotateCcw, ShieldCheck, Sparkles, Check, X, AlertTriangle,
} from 'lucide-react';
import { useStore } from '@/lib/store';
import SeoWrapper from '@/components/SeoWrapper';
import { getProductBySlug } from '@/lib/api/products';
import { checkServiceability } from '@/lib/api/serviceability';
import ProductReviews from '@/components/reviews/ProductReviews';
import { fbTrack } from '@/utils/pixel';

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ProductPage({ initialProduct = null, initialReviewsPayload = null }) {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug;
  const { addToCart, toggleWishlist, isWishlisted, setCartOpen } = useStore();

  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(!initialProduct);

  const [selectedSize,  setSelectedSize]  = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [activeImg,     setActiveImg]     = useState(0);
  const [qty,           setQty]           = useState(1);
  const [added,         setAdded]         = useState(false);

  // Delivery / pincode serviceability check.
  const [pincode, setPincode] = useState('');
  const [serviceability, setServiceability] = useState(null);
  const [checkingPin, setCheckingPin] = useState(false);
  const handlePincodeCheck = async () => {
    if (!/^\d{6}$/.test(pincode)) { setServiceability({ error: 'Enter a valid 6-digit pincode.' }); return; }
    setCheckingPin(true);
    setServiceability(null);
    try { setServiceability(await checkServiceability(pincode)); }
    catch { setServiceability({ error: 'Unable to check. Please try again.' }); }
    finally { setCheckingPin(false); }
  };
  const eta = (() => {
    const days = (serviceability?.serviceable && serviceability?.estimated_delivery_days) || 5;
    const d = new Date();
    d.setDate(d.getDate() + days);
    const day = d.getDate();
    const suffix = day === 1 || day === 21 || day === 31 ? 'st' : day === 2 || day === 22 ? 'nd' : day === 3 || day === 23 ? 'rd' : 'th';
    return { day, suffix, month: d.toLocaleString('en-IN', { month: 'long' }) };
  })();

  // Fetch live product
  useEffect(() => {
    let alive = true;
    if (!slug) return;
    setLoading(true);
    setActiveImg(0);
    getProductBySlug(slug).then(p => {
      if (!alive) return;
      if (p) {
        setProduct(p);
        const def = (p.variations || []).find(v => v.id === p.defaultVariationId) || p.variations?.[0];
        if (def) {
          setSelectedSize(def.size || '');
          setSelectedColor(def.colors?.[0] || '');
        }
      }
      setLoading(false);
    });
    return () => { alive = false; };
  }, [slug]);

  const activeVariation = useMemo(() => {
    if (!product || !product.variations?.length) return null;
    const vs = product.variations;
    const exact = vs.find(v =>
      (!selectedSize  || v.sizes.includes(selectedSize)) &&
      (!selectedColor || v.colors.includes(selectedColor))
    );
    return exact || vs.find(v => v.id === product.defaultVariationId) || vs[0];
  }, [product, selectedSize, selectedColor]);

  useEffect(() => { setActiveImg(0); }, [activeVariation?.id]);

  const gallery = useMemo(() => {
    if (!product) return [];
    const variantImgs = (activeVariation?.images || []).map(i => i.url);
    if (variantImgs.length) return variantImgs;
    return product.images || [];
  }, [product, activeVariation]);

  // Auto-rotate through gallery images every 3 seconds.
  useEffect(() => {
    if (gallery.length <= 1) return;
    const id = setInterval(() => {
      setActiveImg(prev => (prev + 1) % gallery.length);
    }, 3000);
    return () => clearInterval(id);
  }, [gallery.length]);

  const displayPrice    = activeVariation?.price ?? product?.price ?? 0;
  const displayCompare  = activeVariation?.comparePrice ?? product?.originalPrice;
  const displayInStock  = activeVariation ? activeVariation.inStock : !!product?.inStock;
  const displayStock    = activeVariation?.stock ?? null;

  // Meta funnel: ViewContent (browser pixel + server CAPI, deduped by eventID).
  // Fires client-side once per product, once it's in state.
  useEffect(() => {
    if (!product?.id) return;
    fbTrack('ViewContent', {
      content_ids: [String(product.id)],
      content_type: 'product',
      content_name: product.name || undefined,
      value: Number(displayPrice ?? product.price ?? 0),
      currency: 'INR',
      contents: [{ id: String(product.id), quantity: 1 }],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  if (loading && !product) return <ProductPageSkeleton />;

  if (!product) return (
    <div className="bg-[var(--bg)] pt-32 pb-20 text-center min-h-screen">
      <p className="font-display text-3xl text-[var(--ink-muted)] uppercase tracking-tight">Product not found</p>
      <Link href="/shop" className="pill-cta mt-8">← Back to Shop</Link>
    </div>
  );

  const wishlisted = isWishlisted(product.id);

  const buildLineItem = () => ({
    id: `${product.id}:${activeVariation?.id || 'default'}`,
    productId:   product.id,
    variationId: activeVariation?.id || null,
    name:  product.name,
    price: displayPrice,
    image: gallery[0] || product.images[0],
    size:  selectedSize,
    color: selectedColor,
    slug:  product.slug,
    quantity: qty,
  });

  const handleAddToCart = () => {
    if (!displayInStock) return;
    addToCart(buildLineItem());
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleBuyNow = () => {
    if (!displayInStock) return;
    addToCart(buildLineItem());
    setCartOpen(true);
  };

  // Variation-aware spec rows for the Details section.
  // Known keys get a curated label / order; any other attribute the admin
  // configures (e.g. fragrance notes, concentration, occasion…) is still
  // rendered with an auto-formatted label so nothing is silently dropped.
  const KNOWN_ATTR_LABELS = {
    activity:   'Best for',
    occasion:   'Occasion',
    season:     'Season',
    length:     'Length',
    style:      'Style',
    gender:     'Gender',
    fit:        'Fit',
    pattern:    'Pattern',
    fabric:     'Fabric',
    care:       'Care',
    concentration:    'Concentration',
    fragrance_family: 'Fragrance Family',
    longevity:  'Longevity',
    sillage:    'Sillage',
    notes:      'Notes',
    top_notes:  'Top Notes',
    heart_notes:'Heart Notes',
    base_notes: 'Base Notes',
    volume:     'Volume',
    origin:     'Origin',
  };
  const prettifyKey = (k) =>
    KNOWN_ATTR_LABELS[k] ||
    k.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const variationDetails = activeVariation ? (() => {
    const rows = [];
    if (activeVariation.sku)  rows.push(['SKU',     activeVariation.sku]);
    if (selectedSize)         rows.push(['Size',    selectedSize]);
    if (selectedColor)        rows.push(['Colour',  selectedColor]);
    if (activeVariation.material) rows.push(['Material', activeVariation.material]);
    if (activeVariation.pack)     rows.push(['Pack',     activeVariation.pack]);

    // Render every remaining variation attribute generically, so newly-
    // added admin attributes appear without code changes.
    const skip = new Set(['size', 'color', 'colour', 'material', 'pack']);
    Object.entries(activeVariation.attributes || {}).forEach(([key, vals]) => {
      if (skip.has(key.toLowerCase())) return;
      const arr = Array.isArray(vals) ? vals : [vals];
      const value = arr.filter(v => v != null && v !== '').join(', ');
      if (!value) return;
      rows.push([prettifyKey(key), value]);
    });

    if (product.weight) {
      rows.push(['Weight', `${product.weight}${product.weightUnit || 'g'}`]);
    }
    const d = product.dimensions;
    if (d && (d.length || d.width || d.height)) {
      rows.push(['Dimensions',
        `${d.length || '—'} × ${d.width || '—'} × ${d.height || '—'} ${product.dimensionUnit || 'cm'}`]);
    }
    return rows;
  })() : [];

  return (
    <SeoWrapper pageName={slug || 'product-details'} seoData={product?.seo || null}>
    <div className="bg-[var(--bg)] min-h-screen">
      {/* Breadcrumb */}
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-6 flex items-center gap-2 text-xs font-body text-[var(--ink-muted)]">
        <Link href="/" className="hover:text-[var(--gold-deep)] transition-colors">Home</Link>
        <ChevronRight size={10} />
        <Link href="/shop" className="hover:text-[var(--gold-deep)] transition-colors">Shop</Link>
        <ChevronRight size={10} />
        <span className="text-[var(--ink)] truncate max-w-[40ch]">{product.name}</span>
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">

          {/* ═══════════════ STICKY IMAGE COLUMN ═══════════════ */}
          <aside className="lg:col-span-7 lg:sticky lg:top-24 self-start">
            <div className="flex gap-4">
              {gallery.length > 1 && (
                <div className="hidden md:flex flex-col gap-3 w-20 max-h-[80vh] overflow-y-auto">
                  {gallery.map((img, i) => (
                    <button key={`${img}-${i}`} onClick={() => setActiveImg(i)}
                      className={`shrink-0 aspect-square overflow-hidden rounded-xl border-2 transition-all ${activeImg === i ? 'border-[var(--gold)]' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-hidden rounded-2xl bg-[var(--surface-2)] relative">
                <img
                  key={gallery[activeImg]}
                  src={gallery[activeImg]}
                  alt={product.name}
                  className="w-full h-auto object-contain transition-opacity duration-500"
                />
                {product.badge && (
                  <span className="absolute top-5 left-5 text-[10px] tracking-[0.3em] uppercase px-4 py-1.5 font-body rounded-full bg-white text-[var(--ink)] z-10">
                    {product.badge}
                  </span>
                )}
                {!displayInStock && (
                  <div className="absolute inset-0 bg-[var(--bg)]/70 backdrop-blur-[1px] flex items-center justify-center">
                    <span className="text-[var(--ink)] text-[10px] tracking-[0.4em] uppercase border border-[var(--border)] bg-white px-5 py-1.5 rounded-full">Sold Out</span>
                  </div>
                )}
              </div>
            </div>

            {/* Mobile thumbnail row (hidden on desktop) */}
            {gallery.length > 1 && (
              <div className="md:hidden mt-3 flex gap-2 overflow-x-auto pb-2">
                {gallery.map((img, i) => (
                  <button key={`m-${img}-${i}`} onClick={() => setActiveImg(i)}
                    className={`shrink-0 w-16 aspect-square overflow-hidden rounded-lg border-2 transition-all ${activeImg === i ? 'border-[var(--gold)]' : 'border-transparent opacity-60'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </aside>

          {/* ═══════════════ SCROLLABLE INFO COLUMN ═══════════════ */}
          <section className="lg:col-span-5 flex flex-col gap-8">

            {/* Header — collection eyebrow / title with wishlist / rating / price */}
            <header>
              {product.collection && (
                <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">
                  {product.collection}
                </p>
              )}

              {/* Title row — wishlist sits beside the title */}
              <div className="flex items-start justify-between gap-4">
                <h1 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight flex-1"
                  style={{ fontSize: 'clamp(2rem, 4.2vw, 3.4rem)' }}>
                  {product.name}
                </h1>
                <button
                  onClick={() => toggleWishlist({
                    id: product.id,
                    name: product.name,
                    price: displayPrice,
                    image: gallery[0] || product.images[0],
                    slug: product.slug,
                    variationId: activeVariation?.id || null,
                    size: selectedSize || '',
                    color: selectedColor || '',
                  })}
                  aria-label={wishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className={`shrink-0 w-12 h-12 flex items-center justify-center border rounded-full transition-all ${
                    wishlisted
                      ? 'border-[var(--gold)] bg-[var(--gold)]/10 text-[var(--gold-deep)]'
                      : 'border-[var(--border)] bg-white text-[var(--ink-soft)] hover:border-[var(--gold)]'
                  }`}>
                  <Heart size={16} fill={wishlisted ? 'currentColor' : 'none'} />
                </button>
              </div>

              {(product.rating > 0 || product.reviews > 0) && (
                <div className="flex items-center gap-2 mt-4">
                  <div className="flex">
                    {[1,2,3,4,5].map(s => (
                      <Star key={s} size={13} className={s <= Math.round(product.rating) ? 'fill-[var(--gold)] text-[var(--gold)]' : 'text-[var(--border)]'} />
                    ))}
                  </div>
                  <span className="text-[var(--ink-soft)] text-sm font-body">
                    {product.rating ? product.rating.toFixed(1) : '—'} <span className="text-[var(--ink-muted)]">({product.reviews} review{product.reviews === 1 ? '' : 's'})</span>
                  </span>
                </div>
              )}

              <div className="flex items-baseline gap-3 mt-5 flex-wrap">
                <span className="font-serif italic text-[var(--ink)] text-3xl md:text-4xl">{fmt(displayPrice)}</span>
                {displayCompare && displayCompare > displayPrice && (
                  <>
                    <span className="text-[var(--ink-muted)] text-base line-through font-body">{fmt(displayCompare)}</span>
                    <span className="text-[var(--gold-deep)] text-xs font-body tracking-wider uppercase">
                      Save {fmt(displayCompare - displayPrice)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-[var(--ink-muted)] text-xs font-body mt-2">Inclusive of 18% GST · Free shipping over ₹2,500</p>
              <p className="flex items-center gap-1.5 text-[var(--ink-soft)] text-xs font-body mt-2">
                <Truck size={13} className="text-[var(--gold-deep)]" /> Delivered by {eta.day}{eta.suffix} {eta.month}
              </p>
              {Number.isFinite(Number(displayStock)) && Number(displayStock) > 0 && Number(displayStock) <= 5 && (
                <p className="inline-flex items-center gap-1.5 mt-3 rounded-full bg-[var(--surface-2)] px-3 py-1 text-xs font-body font-medium text-[var(--gold-deep)]">
                  <AlertTriangle size={12} /> Only {Number(displayStock)} left
                </p>
              )}
            </header>

            <div className="h-px bg-[var(--border)]" />

            {/* Delivery / pincode serviceability */}
            <div className="rounded-2xl border border-[var(--border)] bg-white p-4">
              <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">Delivery Details</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter Pincode"
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                  aria-label="Pincode"
                  className="min-w-0 flex-1 rounded-full border border-[var(--border)] bg-white px-4 h-11 text-sm font-body text-[var(--ink)] outline-none focus:border-[var(--gold)]"
                />
                <button
                  type="button"
                  onClick={handlePincodeCheck}
                  disabled={checkingPin}
                  className="pill-cta pill-cta-dark shrink-0 !px-6 justify-center disabled:opacity-60"
                >
                  {checkingPin ? '…' : 'Check'}
                </button>
              </div>
              {serviceability && (
                <div className={`mt-3 flex flex-wrap items-center gap-1.5 text-xs font-body font-medium ${serviceability.error ? 'text-red-600' : serviceability.serviceable ? 'text-green-700' : 'text-red-600'}`}>
                  {serviceability.error ? (
                    <span>{serviceability.error}</span>
                  ) : serviceability.serviceable ? (
                    <><Check size={14} /> Delivery to <span className="font-semibold">{pincode}</span>{serviceability.cod_available && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">COD available</span>}</>
                  ) : (
                    <><X size={14} /> Not deliverable to <span className="font-semibold">{pincode}</span></>
                  )}
                </div>
              )}
            </div>

            {/* Colour swatches */}
            {product.colors?.length > 0 && (
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">
                  Colour: <span className="text-[var(--ink)]">{selectedColor || 'Select a colour'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.colors.map(c => (
                    <button key={c} onClick={() => setSelectedColor(c)}
                      className={`px-4 h-10 text-xs font-body border rounded-full transition-all ${
                        selectedColor === c
                          ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                          : 'border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)]'
                      }`}>{c}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes */}
            {product.sizes?.length > 0 && product.sizes[0] !== 'One Size' && (
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-3">
                  Size: <span className="text-[var(--ink)]">{selectedSize || 'Select a size'}</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  {product.sizes.map(s => (
                    <button key={s} onClick={() => setSelectedSize(s)}
                      className={`px-5 h-11 text-xs font-body border rounded-full transition-all ${
                        selectedSize === s
                          ? 'border-[var(--ink)] bg-[var(--ink)] text-white'
                          : 'border-[var(--border)] text-[var(--ink-soft)] hover:border-[var(--gold)]'
                      }`}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + Add to Bag + Buy Now — all in one row */}
            <div className="flex flex-wrap items-stretch gap-3">
              <div className="flex items-center border border-[var(--border)] rounded-full bg-white shrink-0">
                <button onClick={() => setQty(Math.max(1, qty - 1))}
                  className="px-4 py-3 text-[var(--ink-soft)] hover:text-[var(--gold-deep)] transition-colors">
                  <Minus size={14} />
                </button>
                <span className="px-5 text-[var(--ink)] font-body text-sm">{qty}</span>
                <button onClick={() => setQty(qty + 1)}
                  className="px-4 py-3 text-[var(--ink-soft)] hover:text-[var(--gold-deep)] transition-colors">
                  <Plus size={14} />
                </button>
              </div>

              <button onClick={handleAddToCart} disabled={!displayInStock}
                className={`pill-cta flex-1 min-w-[150px] justify-center !py-4 !px-5 ${added ? '!bg-green-700' : ''} ${!displayInStock ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <ShoppingBag size={14} />
                {!displayInStock ? 'Sold Out' : added ? 'Added ✓' : 'Add to Bag'}
              </button>

              <button onClick={handleBuyNow} disabled={!displayInStock}
                className={`pill-cta pill-cta-dark flex-1 min-w-[150px] justify-center !py-4 !px-5 ${!displayInStock ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <Zap size={14} />
                Buy Now
              </button>
            </div>

            <div className="h-px bg-[var(--border)] mt-2" />

            {/* ── Description ─────────────────────────────────── */}
            <div>
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Description</p>
              <h2 className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase tracking-tight mb-4">About this fragrance</h2>
              <p className="text-[var(--ink-soft)] text-[15px] font-body leading-[1.8] whitespace-pre-line text-justify hyphens-auto">
                {product.description || 'No description available for this product.'}
              </p>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* ── Details ────────────────────────────────────── */}
            <div>
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Details</p>
              <h2 className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase tracking-tight mb-5">
                {selectedSize || selectedColor
                  ? <>The <em className="not-italic gold-text">{[selectedSize, selectedColor].filter(Boolean).join(' · ')}</em> spec</>
                  : 'Specifications'}
              </h2>

              {variationDetails.length > 0 ? (
                <dl className="bg-white border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
                  {variationDetails.map(([label, value]) => (
                    <div key={label} className="grid grid-cols-3 gap-4 px-5 py-3.5">
                      <dt className="text-[10px] tracking-[0.25em] uppercase text-[var(--ink-muted)] font-body self-center">
                        {label}
                      </dt>
                      <dd className="col-span-2 text-[var(--ink)] text-sm font-body self-center">
                        {value}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-[var(--ink-muted)] text-sm font-body">No additional details available.</p>
              )}
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* ── Trust strip — 4 promise boxes ──────────────── */}
            <div>
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Our Promise</p>
              <h2 className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase tracking-tight mb-5">
                Why <em className="not-italic gold-text">Velmique</em>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { icon: Truck,       label: 'Free Shipping',   sub: 'Orders over ₹2,500' },
                  { icon: RotateCcw,   label: '14-Day Returns',  sub: 'Sealed bottles only' },
                  { icon: ShieldCheck, label: '100% Authentic',  sub: 'Bandra atelier' },
                  { icon: Sparkles,    label: 'GST Included',    sub: 'No surprises' },
                ].map(t => (
                  <div key={t.label} className="flex items-start gap-3 bg-white border border-[var(--border)] rounded-xl p-4">
                    <t.icon size={18} className="text-[var(--gold-deep)] mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[var(--ink)] text-xs font-body font-medium">{t.label}</p>
                      <p className="text-[var(--ink-muted)] text-[10px] font-body mt-0.5">{t.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="h-px bg-[var(--border)]" />

            {/* ── Reviews ────────────────────────────────────── */}
            <div>
              <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-3">Reviews</p>
              <h2 className="font-display text-[var(--ink)] text-2xl md:text-3xl uppercase tracking-tight mb-5">
                What customers say
              </h2>
              <ProductReviews productId={product.id} productName={product.name} initialReviewsPayload={initialReviewsPayload} />
            </div>
          </section>
        </div>

      </div>
    </div>
    </SeoWrapper>
  );
}

function ProductPageSkeleton() {
  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 py-6 flex items-center gap-2">
        <div className="h-3 w-16 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="h-3 w-20 rounded bg-[var(--surface-2)] animate-pulse" />
        <div className="h-3 w-32 rounded bg-[var(--surface-2)] animate-pulse" />
      </div>

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16">
          <div className="lg:col-span-7 flex gap-4">
            <div className="hidden md:flex flex-col gap-3 w-20">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="aspect-square rounded-xl bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
            <div className="flex-1 aspect-[4/5] rounded-2xl bg-[var(--surface-2)] animate-pulse" />
          </div>

          <div className="lg:col-span-5 flex flex-col gap-6">
            <div className="space-y-3">
              <div className="h-3 w-24 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-12 w-3/4 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-4 w-32 rounded bg-[var(--surface-2)] animate-pulse mt-3" />
              <div className="h-9 w-40 rounded bg-[var(--surface-2)] animate-pulse mt-2" />
            </div>
            <div className="h-px bg-[var(--border)]" />
            <div className="space-y-2">
              <div className="h-3 w-full rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-3 w-11/12 rounded bg-[var(--surface-2)] animate-pulse" />
              <div className="h-3 w-9/12 rounded bg-[var(--surface-2)] animate-pulse" />
            </div>
            <div className="flex gap-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-11 w-20 rounded-full bg-[var(--surface-2)] animate-pulse" />
              ))}
            </div>
            <div className="flex gap-3">
              <div className="h-12 flex-1 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="h-12 w-12 rounded-full bg-[var(--surface-2)] animate-pulse" />
              <div className="h-12 w-12 rounded-full bg-[var(--surface-2)] animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

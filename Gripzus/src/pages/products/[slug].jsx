import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../../components/products/ProductCard';
import ProductTestimonials from '../../components/products/ProductTestimonials';
import SeoWrapper from '../../components/SeoWrapper';
import { getProductBySlug, getProductsByCategory, getPublicProducts } from '../../services/products';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { fbTrack } from '../../utils/pixel';
import { checkServiceability } from '../../services/serviceability';

export default function ProductDetail() {
  const router = useRouter();
  const slug = router.query.slug;

  const { addItem, openCart } = useCart();
  const { has, toggle } = useWishlist();

  const [product, setProduct] = useState(null);
  const [related, setRelated] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [activeImg, setActiveImg] = useState(0);
  const [size, setSize]   = useState('');
  const [color, setColor] = useState('');
  const [qty, setQty]     = useState(1);
  const [added, setAdded] = useState(false);
  const [paused, setPaused] = useState(false);

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

  // Sticky bottom bar — shown once the Add-to-Bag / Buy-Now block scrolls away.
  const actionsRef = useRef(null);
  const [showBar, setShowBar] = useState(false);

  // Fetch the product by slug.
  useEffect(() => {
    if (!slug) return;
    let alive = true;
    setLoading(true);
    setNotFound(false);
    getProductBySlug(slug)
      .then((p) => {
        if (!alive) return;
        if (!p) { setNotFound(true); return; }
        setProduct(p);
        setActiveImg(0);
        setSize(p.sizes?.[0] || '');
        // Preselect the colour from ?color= (set by the per-colour cards); fall
        // back to the first colour when it's absent or doesn't match.
        const wanted = Array.isArray(p.colors)
          ? p.colors.find((c) => c.name === router.query.color)
          : null;
        setColor(wanted?.name || p.colors?.[0]?.name || '');
        // Meta funnel: ViewContent (browser pixel + server CAPI, deduped by eventID).
        fbTrack('ViewContent', {
          content_ids: [String(p.id)],
          content_type: 'product',
          content_name: p.name || undefined,
          value: Number(p.price ?? 0),
          currency: 'INR',
          contents: [{ id: String(p.id), quantity: 1 }],
        });
      })
      .catch(() => { if (alive) setNotFound(true); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [slug]);

  // Related products — same collection, fallback to catalogue.
  useEffect(() => {
    if (!product) return;
    let alive = true;
    getProductsByCategory(product.collection)
      .then((list) => {
        const pool = list.filter((p) => p.slug !== product.slug);
        if (pool.length) return pool;
        return getPublicProducts({ limit: 8 }).then((all) => all.filter((p) => p.slug !== product.slug));
      })
      .then((list) => { if (alive) setRelated(list.slice(0, 4)); })
      .catch(() => {});
    return () => { alive = false; };
  }, [product]);

  /* Auto-advance the gallery one image at a time every 3s.
     Pauses while the shopper hovers the main image. */
  useEffect(() => {
    const count = product?.images?.length || 0;
    if (count < 2 || paused) return;
    const id = setTimeout(() => {
      setActiveImg((i) => (i + 1) % count);
    }, 3000);
    return () => clearTimeout(id);
  }, [product, paused, activeImg]);

  // Watch the action block — when it leaves the viewport, reveal the bar.
  useEffect(() => {
    const el = actionsRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowBar(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [product]);

  /* ── Loading / not-found ─────────────────────────────────── */
  if (loading) {
    return (
      <main className="bg-paper">
        <div className="wrap py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14">
            <div className="md:col-span-7 aspect-square rounded-lg bg-paper-deep animate-pulse" />
            <div className="md:col-span-5 space-y-4 pt-4">
              <div className="h-3 w-1/3 rounded bg-paper-deep animate-pulse" />
              <div className="h-10 w-3/4 rounded bg-paper-deep animate-pulse" />
              <div className="h-8 w-1/3 rounded bg-paper-deep animate-pulse" />
              <div className="h-24 w-full rounded bg-paper-deep animate-pulse" />
              <div className="h-12 w-full rounded bg-paper-deep animate-pulse" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (notFound || !product) {
    return (
      <main className="bg-paper">
        <div className="wrap section-y text-center">
          <p className="h-display text-3xl text-ink mb-3">Pair not found</p>
          <p className="prose-body text-sm mb-6">This product may have sold out or moved.</p>
          <Link href="/products" className="btn-outline inline-flex">Back to the catalogue</Link>
        </div>
      </main>
    );
  }

  const price    = product.price;
  const compare  = product.compareAtPrice;
  const wished   = has(product.id);
  const images   = product.images?.length ? product.images : ['/assets/Gripzus.JPG.jpeg'];
  const activeColor = product.colors?.find((c) => c.name === color);
  const colorLabel  = activeColor?.packColors ? `Pack of ${activeColor.packColors.length}` : (color || '—');

  const handleAdd = () => {
    addItem({
      id: product.id, name: product.name, slug: product.slug,
      image: images[0], price, collection: product.collection,
      size, color, qty,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const handleBuyNow = () => {
    addItem({
      id: product.id, name: product.name, slug: product.slug,
      image: images[0], price, collection: product.collection,
      size, color, qty,
    }, { openDrawer: false });
    openCart();
  };

  return (
    <SeoWrapper pageName={slug || 'product-details'} seoData={product?.seo || null}>
      <main className="bg-paper">

        {/* Breadcrumb */}
        <div className="wrap pt-8">
          <p className="eyebrow">
            <Link href="/" className="hover:text-ink">Home</Link>
            <span className="mx-2 text-line">/</span>
            <Link href="/products" className="hover:text-ink">Catalogue</Link>
            <span className="mx-2 text-line">/</span>
            <span className="text-ink">{product.name}</span>
          </p>
        </div>

        {/* ── Top split — sticky editorial image left, details right ── */}
        <section className="wrap py-5 md:py-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 lg:gap-12">

            {/* Gallery — sticky while the info column scrolls */}
            <div className="md:col-span-7 md:sticky md:top-24 md:self-start">
              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:gap-4">

                {/* Thumbnail rail — natural height so the whole image shows */}
                {images.length > 1 && (
                  <div className="flex items-start gap-3 overflow-x-auto p-1.5 sm:max-h-[42rem] sm:flex-col sm:overflow-x-visible sm:overflow-y-auto">
                    {images.slice(0, 8).map((img, i) => (
                      <button
                        key={i}
                        onClick={() => setActiveImg(i)}
                        aria-label={`View image ${i + 1}`}
                        className={`w-[4.75rem] shrink-0 overflow-hidden rounded-md bg-paper-warm transition-all duration-300 ${
                          activeImg === i
                            ? 'ring-1 ring-ink ring-offset-2 ring-offset-paper'
                            : 'opacity-45 hover:opacity-100'
                        }`}
                      >
                        <img src={img} alt="" className="block h-auto w-full" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image — natural height, auto-advances every 3s, pauses on hover */}
                <div
                  className="gz-pdp-main relative flex-1 overflow-hidden rounded-lg bg-paper-warm"
                  onMouseEnter={() => setPaused(true)}
                  onMouseLeave={() => setPaused(false)}
                >
                  <img
                    key={activeImg}
                    src={images[activeImg]}
                    alt={product.name}
                    className="gz-pdp-img block h-auto w-full"
                  />

                  {/* Image counter */}
                  {images.length > 1 && (
                    <span className="absolute bottom-4 right-4 rounded-full bg-black/80 px-3 py-1 text-[10px] tracking-[0.16em] text-paper backdrop-blur-sm">
                      {String(activeImg + 1).padStart(2, '0')} / {String(images.length).padStart(2, '0')}
                    </span>
                  )}

                  <style jsx>{`
                    .gz-pdp-img {
                      animation: gz-pdp-fade 0.6s ease;
                    }
                    @keyframes gz-pdp-fade {
                      from { opacity: 0; }
                      to   { opacity: 1; }
                    }
                  `}</style>
                </div>
              </div>
            </div>

            {/* Info — airy, generous spacing */}
            <div className="md:col-span-5 md:py-2">
              <span className="eyebrow text-ink-muted mb-4 block">{product.collection}</span>

              <h1 className="h-display text-3xl md:text-4xl leading-tight mb-6">{product.name}</h1>

              <div className="flex items-baseline gap-3 mb-6">
                <span className="h-display text-ink text-4xl">₹{price.toLocaleString('en-IN')}</span>
                {compare && compare > price && (
                  <span className="text-ink-muted text-base line-through">₹{compare.toLocaleString('en-IN')}</span>
                )}
              </div>

              {/* Free shipping + delivery ETA */}
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-ink-soft mb-3">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                <span className="text-ink"><span className="font-semibold">Free shipping</span> over ₹499</span>
                <span>· Delivered by {eta.day}{eta.suffix} {eta.month}</span>
              </div>

              {/* Honest low-stock — only when total stock is genuinely low */}
              {Number.isFinite(Number(product.stock)) && Number(product.stock) > 0 && Number(product.stock) <= 5 && (
                <div className="inline-flex items-center gap-1.5 mb-5 rounded-full bg-paper-warm px-3 py-1 text-xs font-semibold text-ink">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Only {Number(product.stock)} left
                </div>
              )}

              {/* Colour */}
              {product.colors?.length > 0 && (
                <div className="mb-6">
                  <p className="eyebrow mb-3">Colour — <span className="text-ink">{colorLabel}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {product.colors.map((c) =>
                      c.packColors ? (
                        // Multi-colour pack — all colours shown together in one box
                        <button
                          key={c.name}
                          onClick={() => setColor(c.name)}
                          title={c.name}
                          aria-label={`Pack of ${c.packColors.length}`}
                          className={`flex h-8 items-center gap-1 border px-2 transition-all ${
                            color === c.name ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'border-line hover:border-ink'
                          }`}
                        >
                          {c.packColors.map((pc) => (
                            <span
                              key={pc.name}
                              title={pc.name}
                              className="h-4 w-4 border border-line"
                              style={{ backgroundColor: pc.hex }}
                            />
                          ))}
                        </button>
                      ) : (
                        <button
                          key={c.name}
                          onClick={() => setColor(c.name)}
                          title={c.name}
                          aria-label={c.name}
                          className={`w-7 h-7 border transition-all ${
                            color === c.name ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'border-line hover:border-ink'
                          }`}
                          style={{ backgroundColor: c.hex }}
                        />
                      )
                    )}
                  </div>
                </div>
              )}

              {/* Size */}
              {product.sizes?.length > 0 && (
                <div className="mb-6">
                  <p className="eyebrow mb-3">Size — <span className="text-ink">{size}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`min-w-[3.5rem] px-4 py-3 text-[11px] tracking-[0.12em] uppercase transition-colors rounded-sm ${
                          size === s ? 'bg-ink text-paper' : 'border border-line text-ink hover:border-ink'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Qty + actions */}
              <div ref={actionsRef}>
                <div className="flex items-center gap-2.5 mb-3 sm:gap-3">
                  <div className="flex items-center border border-line rounded-sm shrink-0">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center hover:bg-paper-warm">−</button>
                    <span className="w-9 sm:w-12 text-center text-sm">{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)} className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center hover:bg-paper-warm">+</button>
                  </div>
                  <button onClick={handleAdd} className={`btn flex-1 justify-center !py-3.5 sm:!py-4 whitespace-nowrap ${added ? '!bg-ink-soft' : ''}`}>
                    {added ? 'Added ✓' : product.inStock === false ? 'Sold Out' : 'Add to Bag'}
                  </button>
                  <button
                    onClick={() => toggle(product)}
                    aria-label="Wishlist"
                    className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 border flex items-center justify-center transition-colors rounded-sm ${
                      wished ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
                    </svg>
                  </button>
                </div>
                <button onClick={handleBuyNow} className="btn-outline w-full justify-center !py-3.5 sm:!py-4 whitespace-nowrap">Buy Now</button>
              </div>

              {/* Delivery / pincode serviceability — below the buy actions */}
              <div className="mt-6 rounded-lg border border-line bg-paper-warm/40 p-4">
                <p className="eyebrow mb-3">Delivery Details</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter Pincode"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    aria-label="Pincode"
                    className="min-w-0 flex-1 rounded-sm border border-line bg-paper px-3.5 py-2.5 text-sm text-ink outline-none focus:border-ink"
                  />
                  <button
                    type="button"
                    onClick={handlePincodeCheck}
                    disabled={checkingPin}
                    className="btn shrink-0 !py-2.5 !px-6 whitespace-nowrap disabled:opacity-60"
                  >
                    {checkingPin ? '…' : 'Check'}
                  </button>
                </div>
                {serviceability && (
                  <div className={`mt-3 flex flex-wrap items-center gap-1.5 text-sm font-medium ${serviceability.error ? 'text-red-600' : serviceability.serviceable ? 'text-green-700' : 'text-red-600'}`}>
                    {serviceability.error ? (
                      <span>{serviceability.error}</span>
                    ) : (
                      <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Delivery to <span className="font-semibold">{pincode}</span> in ~{serviceability.estimated_delivery_days || 5} days{serviceability.cod_available && <span className="ml-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] text-green-700">COD available</span>}</>
                    )}
                  </div>
                )}
              </div>

              {/* Trust strip */}
              <div className="grid grid-cols-4 gap-2 border-t border-line pt-6 mt-6">
                {[
                  ['Secure Checkout', <><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></>],
                  ['Cash on Delivery', <><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></>],
                  ['7-Day Returns', <><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></>],
                  ['100% Genuine', <><path d="M12 2 4 5v6c0 5 3.4 8.5 8 11 4.6-2.5 8-6 8-11V5l-8-3z"/><polyline points="9 12 11 14 15 10"/></>],
                ].map(([label, paths]) => (
                  <div key={label} className="flex flex-col items-center gap-1.5 text-center">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="text-ink">{paths}</svg>
                    <span className="text-[10px] font-semibold leading-tight text-ink-muted">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Editorial band 1 — Product story ─────────────────────────── */}
        {product.description && (
          <>
            <div className="wrap"><div className="hairline" /></div>
            <section className="wrap py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[minmax(0,14rem)_1fr] gap-6 lg:gap-14">
              <p className="eyebrow text-ink-muted">The story</p>
              <div className="space-y-6 max-w-2xl">
                <p className="h-display text-ink text-2xl md:text-3xl leading-snug">
                  {product.name}<span className="h-italic">.</span>
                </p>
                <p className="prose-body text-base md:text-lg">{product.description}</p>
              </div>
            </section>
          </>
        )}

        {/* ── Editorial band 2 — Details & specs ───────────────────────── */}
        <div className="wrap"><div className="hairline" /></div>
        <section className="wrap py-10 md:py-14 grid grid-cols-1 lg:grid-cols-[minmax(0,14rem)_1fr] gap-6 lg:gap-14">
          <p className="eyebrow text-ink-muted">Details &amp; care</p>
          <div className="max-w-3xl">
            {[
              product.sku && ['SKU', product.sku],
              ['Collection', product.collection],
              product.sizes?.length > 0 && ['Sizes', product.sizes.join(', ')],
              product.colors?.length > 0 && ['Colours', product.colors.map((c) => c.name).join(', ')],
            ].filter(Boolean).map(([label, value], i) => (
              <div
                key={label}
                className={`grid grid-cols-1 md:grid-cols-[minmax(0,10rem)_1fr] gap-1 md:gap-12 py-5 md:py-6 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                <p className="eyebrow text-ink-muted">{label}</p>
                <p className="prose-body text-sm md:text-base text-ink">{value}</p>
              </div>
            ))}
            <p className="spec block pt-6 md:pt-8">Hand-finished and inspected pair-by-pair. Free shipping over ₹499 · 7-day returns.</p>
          </div>
        </section>

        {/* ── Editorial band 3 — Reviews ───────────────────────────────── */}
        <div className="wrap"><div className="hairline" /></div>
        <ProductTestimonials productId={product.id} productName={product.name} />

        {/* ── Editorial band 4 — You may also like ─────────────────────── */}
        {related.length > 0 && (
          <>
            <div className="wrap"><div className="hairline" /></div>
            <section className="py-10 md:py-14">
              <div className="wrap">
                <div className="flex items-end justify-between flex-wrap gap-6 mb-8">
                  <div>
                    <p className="eyebrow text-ink-muted mb-4">More from the collection</p>
                    <h2 className="h-display text-3xl md:text-5xl">Pairs <span className="h-italic">like this.</span></h2>
                  </div>
                  <Link href="/products" className="link-line shrink-0">See all</Link>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                  {related.map((p) => <ProductCard key={p.uid ?? p.id} product={p} />)}
                </div>
              </div>
            </section>
          </>
        )}

        {/* Sticky add-to-bag bar — slides in once the action block scrolls away */}
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 backdrop-blur-md shadow-[0_-2px_16px_rgba(0,0,0,0.07)] transition-transform duration-300 ${
            showBar ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="wrap py-3 flex items-center gap-3 md:gap-5">
            <img
              src={images[0]}
              alt={product.name}
              className="h-12 w-12 md:h-14 md:w-14 shrink-0 rounded-md object-cover bg-paper-warm"
            />
            <div className="min-w-0 flex-1">
              <p className="h-display text-ink text-sm md:text-base leading-tight truncate">{product.name}</p>
              <p className="eyebrow mt-0.5 truncate">{colorLabel} · ₹{price.toLocaleString('en-IN')}</p>
            </div>
            <button onClick={handleBuyNow} className="btn-outline hidden sm:inline-flex !py-3 whitespace-nowrap">Buy Now</button>
            <button onClick={handleAdd} className={`btn justify-center !py-3 whitespace-nowrap ${added ? '!bg-ink-soft' : ''}`}>
              {added ? 'Added ✓' : product.inStock === false ? 'Sold Out' : 'Add to Bag'}
            </button>
          </div>
        </div>
      </main>
    </SeoWrapper>
  );
}

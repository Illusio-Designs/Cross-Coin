import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../../components/products/ProductCard';
import ProductTestimonials from '../../components/products/ProductTestimonials';
import SeoWrapper from '../../components/SeoWrapper';
import { getProductBySlug, getProductsByCategory, getPublicProducts } from '../../services/products';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';

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
        setColor(p.colors?.[0]?.name || '');
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
            <div className="md:col-span-7 aspect-square border-2 border-line bg-paper-deep animate-pulse" />
            <div className="md:col-span-5 space-y-4 pt-4">
              <div className="h-3 w-1/3 bg-paper-deep animate-pulse" />
              <div className="h-10 w-3/4 bg-paper-deep animate-pulse" />
              <div className="h-8 w-1/3 bg-paper-deep animate-pulse" />
              <div className="h-24 w-full bg-paper-deep animate-pulse" />
              <div className="h-12 w-full bg-paper-deep animate-pulse" />
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
          <p className="h-mark text-3xl md:text-4xl text-ink mb-3">Pair Not Found</p>
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

        {/* Gallery + Info */}
        <section className="wrap py-8 md:py-12">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-14">

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
                        className={`w-[4.75rem] shrink-0 overflow-hidden border-2 bg-paper-warm transition-all duration-300 ${
                          activeImg === i
                            ? 'border-ink'
                            : 'border-line opacity-50 hover:opacity-100 hover:border-ink'
                        }`}
                      >
                        <img src={img} alt="" className="block h-auto w-full" />
                      </button>
                    ))}
                  </div>
                )}

                {/* Main image — natural height, auto-advances every 3s, pauses on hover */}
                <div
                  className="gz-pdp-main relative flex-1 overflow-hidden border-2 border-ink bg-paper-warm"
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
                    <span className="absolute bottom-0 right-0 bg-ink px-3 py-1.5 text-[10px] font-bold tracking-[0.16em] text-paper tabular-nums">
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

            {/* Info */}
            <div className="md:col-span-5">
              <span className="kicker mb-4">{product.collection}</span>

              <h1 className="h-mark text-ink text-3xl md:text-[2.75rem] leading-[0.9] mt-4 mb-6">{product.name}</h1>

              <div className="flex items-baseline gap-3 mb-8 pb-8 border-b-2 border-ink">
                <span className="font-display text-ink text-4xl md:text-5xl" style={{ fontWeight: 900 }}>₹{price.toLocaleString('en-IN')}</span>
                {compare && compare > price && (
                  <span className="text-ink-muted text-base line-through">₹{compare.toLocaleString('en-IN')}</span>
                )}
              </div>

              {/* Colour */}
              {product.colors?.length > 0 && (
                <div className="mb-7">
                  <p className="eyebrow mb-3">Colour — <span className="text-ink">{colorLabel}</span></p>
                  <div className="flex flex-wrap gap-2.5">
                    {product.colors.map((c) =>
                      c.packColors ? (
                        // Multi-colour pack — all colours shown together in one box
                        <button
                          key={c.name}
                          onClick={() => setColor(c.name)}
                          title={c.name}
                          aria-label={`Pack of ${c.packColors.length}`}
                          className={`flex h-12 items-center gap-1.5 border-2 px-3 transition-all ${
                            color === c.name ? 'border-ink' : 'border-line hover:border-ink'
                          }`}
                        >
                          {c.packColors.map((pc) => (
                            <span
                              key={pc.name}
                              title={pc.name}
                              className="h-6 w-6 border border-ink"
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
                          className={`w-10 h-10 border-2 transition-all ${
                            color === c.name ? 'border-ink ring-2 ring-ink ring-offset-2 ring-offset-paper' : 'border-line hover:border-ink'
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
                <div className="mb-8">
                  <p className="eyebrow mb-3">Size — <span className="text-ink">{size}</span></p>
                  <div className="flex flex-wrap gap-2">
                    {product.sizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSize(s)}
                        className={`min-w-[3.5rem] px-4 py-3 text-[11px] font-bold tracking-[0.12em] uppercase transition-colors border-2 ${
                          size === s ? 'bg-ink text-paper border-ink' : 'border-line text-ink hover:border-ink'
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
                  <div className="flex items-center border-2 border-ink shrink-0">
                    <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center hover:bg-ink hover:text-paper transition-colors">−</button>
                    <span className="w-9 sm:w-12 text-center text-sm font-bold tabular-nums">{qty}</span>
                    <button onClick={() => setQty((q) => q + 1)} className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center hover:bg-ink hover:text-paper transition-colors">+</button>
                  </div>
                  <button onClick={handleAdd} className={`btn flex-1 justify-center !py-3.5 sm:!py-4 whitespace-nowrap ${added ? '!bg-ink-soft !border-ink-soft' : ''}`}>
                    {added ? 'Added ✓' : product.inStock === false ? 'Sold Out' : 'Add to Bag'}
                  </button>
                  <button
                    onClick={() => toggle(product)}
                    aria-label="Wishlist"
                    className={`shrink-0 w-11 h-11 sm:w-12 sm:h-12 border-2 flex items-center justify-center transition-colors ${
                      wished ? 'bg-ink text-paper border-ink' : 'border-ink text-ink hover:bg-ink hover:text-paper'
                    }`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill={wished ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.5">
                      <path d="M12 21s-7-4.35-9-9c-1.5-3.5 1-7 4.5-7 1.74 0 3 .81 4.5 2.5C13.5 5.81 14.76 5 16.5 5 20 5 22.5 8.5 21 12c-2 4.65-9 9-9 9z" />
                    </svg>
                  </button>
                </div>
                <button onClick={handleBuyNow} className="btn-outline w-full justify-center !py-3.5 sm:!py-4 mb-9 whitespace-nowrap">Buy Now</button>
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-8">
                  <p className="eyebrow mb-3">About this pair</p>
                  <p className="prose-body text-sm md:text-base text-justify">{product.description}</p>
                </div>
              )}

              {/* Spec */}
              <div className="border-t border-line pt-7">
                <p className="eyebrow mb-4">Details</p>
                <ul className="divide-y divide-line text-sm">
                  {product.sku && (
                    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-3"><span className="text-ink-muted">SKU</span><span className="text-ink sm:text-right">{product.sku}</span></li>
                  )}
                  <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-3"><span className="text-ink-muted">Collection</span><span className="text-ink sm:text-right">{product.collection}</span></li>
                  {product.sizes?.length > 0 && (
                    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-3"><span className="text-ink-muted">Sizes</span><span className="text-ink sm:text-right">{product.sizes.join(', ')}</span></li>
                  )}
                  {product.colors?.length > 0 && (
                    <li className="flex flex-col gap-1 py-2.5 sm:flex-row sm:justify-between sm:gap-3"><span className="text-ink-muted">Colours</span><span className="text-ink sm:text-right">{product.colors.map((c) => c.name).join(', ')}</span></li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Testimonials + write-a-review */}
        <ProductTestimonials productId={product.id} productName={product.name} />

        {/* Related */}
        {related.length > 0 && (
          <section className="bg-paper-warm border-t-2 border-ink section-y">
            <div className="wrap">
              <div className="flex items-end justify-between flex-wrap gap-6 mb-12">
                <div>
                  <p className="kicker mb-4">More from the collection</p>
                  <h2 className="h-mark text-3xl md:text-5xl mt-4">Pairs Like This</h2>
                </div>
                <Link href="/products" className="btn-outline">See all</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-10">
                {related.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </div>
          </section>
        )}

        {/* Sticky add-to-bag bar — slides in once the action block scrolls away */}
        <div
          className={`fixed inset-x-0 bottom-0 z-40 border-t-2 border-ink bg-paper/95 backdrop-blur-md transition-transform duration-300 ${
            showBar ? 'translate-y-0' : 'translate-y-full'
          }`}
        >
          <div className="wrap py-3 flex items-center gap-3 md:gap-5">
            <img
              src={images[0]}
              alt={product.name}
              className="h-12 w-12 md:h-14 md:w-14 shrink-0 border-2 border-ink object-cover bg-paper-warm"
            />
            <div className="min-w-0 flex-1">
              <p className="font-heavy text-ink text-sm md:text-base font-800 uppercase tracking-tight leading-tight truncate" style={{ fontWeight: 800 }}>{product.name}</p>
              <p className="eyebrow mt-0.5 truncate">{colorLabel} · ₹{price.toLocaleString('en-IN')}</p>
            </div>
            <button onClick={handleBuyNow} className="btn-outline hidden sm:inline-flex !py-3 whitespace-nowrap">Buy Now</button>
            <button onClick={handleAdd} className={`btn justify-center !py-3 whitespace-nowrap ${added ? '!bg-ink-soft !border-ink-soft' : ''}`}>
              {added ? 'Added ✓' : product.inStock === false ? 'Sold Out' : 'Add to Bag'}
            </button>
          </div>
        </div>
      </main>
    </SeoWrapper>
  );
}

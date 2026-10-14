import { useState, useEffect, useRef } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import ProductCard from '../../components/products/ProductCard';
import ProductDetailBlocks from '../../components/product/ProductDetailBlocks';
import SizeChartModal from '../../components/product/SizeChartModal';
import ConditionsSection from '../../components/sections/ConditionsSection';
import ReviewsSection from '../../components/sections/ReviewsSection';
import FaqSection from '../../components/sections/FaqSection';
import SeoWrapper from '../../components/SeoWrapper';
import { SIZE_GUIDE } from '../../lib/sizeGuide';
import { getProductBySlug, getProductsByCategory, getPublicProducts, resolveVariationId, getBundleTiers } from '../../services/products';
import { getProductReviews } from '../../services/reviews';
import { getFaqs } from '../../services/faqs';
import { getPublicCoupons } from '../../services/publicindex';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { fbTrack } from '../../utils/pixel';

// Right-size ImageKit images per slot with f-auto (same as the CrossCoin gallery).
const ik = (src, w) => {
  if (!src || typeof src !== 'string') return src;
  if (src.includes('ik.imagekit.io') && !/[?&]tr=/.test(src)) {
    return `${src.split('?')[0]}?tr=w-${w},q-78,f-auto`;
  }
  return src;
};
import { checkServiceability } from '../../services/serviceability';

// Public site origin — used for canonical / OpenGraph / JSON-LD URLs. Same
// default as SeoWrapper so the two agree.
const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://gripzus.com';

// Trim a (already-plain) string to a meta-description-friendly length on a word
// boundary.
function truncate(s, n) {
  const t = String(s || '').replace(/\s+/g, ' ').trim();
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

/**
 * Server-side render the product page.
 *
 * Fetches the product by slug on the server (the same getProductBySlug call the
 * component used to run in useEffect) so the initial HTML the crawler/browser
 * receives already carries the full product — no skeleton, better LCP, and the
 * SEO <Head> below is populated from real data. Returns 404 for a missing slug.
 */
export async function getServerSideProps({ params, res }) {
  const slug = params?.slug;
  if (!slug) return { notFound: true };

  const product = await getProductBySlug(slug);
  if (!product) return { notFound: true };

  // This product's reviews (for the Morbix-style ReviewsSection) + the global
  // FAQ set, fetched in parallel. Each service swallows its own errors and
  // returns empty, so first paint degrades gracefully.
  const [productReviews, faqs, couponsRes, bundleTiers] = await Promise.all([
    getProductReviews(product.id),
    getFaqs('global'),
    getPublicCoupons().catch(() => null),
    getBundleTiers(product.id),
  ]);

  // Surface a REAL admin-created prepaid-only coupon on the buy panel (never a
  // fabricated code). Shoppers apply it at checkout to get the offer.
  const couponList = couponsRes?.coupons || couponsRes?.data || (Array.isArray(couponsRes) ? couponsRes : []);
  const prepaidCoupon = (Array.isArray(couponList) ? couponList : [])
    .find((c) => (c?.paymentModeRestriction || c?.payment_mode_restriction) === 'prepaid') || null;

  // CDN caching: product pages change rarely; let the edge serve a stale copy
  // while it revalidates in the background.
  res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=86400'
  );

  return {
    props: {
      slug,
      initialProduct: product,
      initialReviews: productReviews?.reviews || [],
      initialReviewTotal: productReviews?.total || 0,
      initialFaqs: faqs || [],
      prepaidCoupon,
      bundleTiers: bundleTiers || [],
    },
  };
}

export default function ProductDetail({ slug: slugProp, initialProduct = null, initialReviews = [], initialReviewTotal = 0, initialFaqs = [], prepaidCoupon = null, bundleTiers = [] }) {
  const router = useRouter();
  const slug = slugProp || router.query.slug;

  const { addItem, addPack, openCart } = useCart();
  const { has, toggle } = useWishlist();

  // Preselect the colour from ?color= (set by the per-colour cards). Computed
  // the same way on the server (first render) and the client so hydration agrees.
  const pickInitialColor = (p) => {
    if (!p) return '';
    const wanted = Array.isArray(p.colors)
      ? p.colors.find((c) => c.name === router.query.color)
      : null;
    return wanted?.name || p.colors?.[0]?.name || '';
  };

  // Seed every piece of first-paint state from the server-fetched product so the
  // page renders fully populated in the initial HTML. Client interactivity below
  // still mutates these.
  const [product, setProduct] = useState(initialProduct);
  const [related, setRelated] = useState([]);
  const [loading] = useState(false);
  const [notFound, setNotFound] = useState(!initialProduct);

  const [activeImg, setActiveImg] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [showSizeChart, setShowSizeChart] = useState(false);
  const [size, setSize]   = useState(initialProduct?.sizes?.[0] || '');
  const [color, setColor] = useState(() => pickInitialColor(initialProduct));
  const [qty, setQty]     = useState(1);
  // Selected pack tier (0 = the 1-pair base); only used when this product has packs.
  const [pack, setPack]   = useState(0);
  // Per-pair colour selection for a multi-pair pack — one colour NAME per pair.
  const [packColors, setPackColors] = useState([]);
  const [added, setAdded] = useState(false);

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
  const thumbsRef = useRef(null);
  const mainImgRef = useRef(null);
  const [galH, setGalH] = useState(0); // main-image height → thumbnail rail height (mobile only)
  const [isMobile, setIsMobile] = useState(false);

  // Track the mobile breakpoint so the compact-gallery sizing applies on phones
  // only; desktop keeps the original larger layout.
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setIsMobile(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // The product now arrives from getServerSideProps as `initialProduct`, so the
  // old client-side getProductBySlug fetch is gone. This effect only RE-SEEDS
  // state when the server props change (client-side navigation between PDPs,
  // where React keeps this component mounted and useState won't re-init) and
  // fires the ViewContent pixel, which must run in the browser.
  useEffect(() => {
    const p = initialProduct;
    if (!p) { setNotFound(true); return; }
    setProduct(p);
    setNotFound(false);
    setActiveImg(0);
    setPack(0);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, initialProduct]);

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

  // Reset to the first image whenever the selected colour changes.
  useEffect(() => { setActiveImg(0); }, [color]);

  // The gallery is user-controlled only (thumbnails / prev-next / lightbox) —
  // no auto-advance, matching Morbix.

  // Keep the per-pair colour list sized to the chosen pack: new slots default to
  // the currently-selected colour, existing picks are preserved. Computes the
  // pack's pair count locally (the render-body pack derivation runs after the
  // early returns, so it isn't available to this hook).
  useEffect(() => {
    const packs = Array.isArray(bundleTiers) ? bundleTiers : [];
    if (!packs.length) return;
    const opts = [1, ...packs.map((t) => Number(t.pairs))];
    const pairs = opts[Math.min(pack, opts.length - 1)] || 1;
    if (pairs <= 1) return;
    setPackColors((prev) => {
      const next = prev.slice(0, pairs);
      while (next.length < pairs) next.push(color);
      return next;
    });
  }, [pack, color, bundleTiers]);

  // Close the zoom lightbox on Escape.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [lightbox]);

  // Match the thumbnail rail height to the main image so the 3 thumbnails fill
  // exactly its height (extras scroll). Re-measures on resize / product change.
  useEffect(() => {
    const el = mainImgRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const update = () => setGalH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [product]);

  // Keep the active thumbnail in view by scrolling ONLY the rail (never the
  // page) as the shopper changes the active image.
  useEffect(() => {
    const rail = thumbsRef.current;
    if (!rail) return;
    const el = rail.querySelector('[data-active="true"]');
    if (!el) return;
    const rr = rail.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    if (rail.scrollWidth > rail.clientWidth + 1) {
      rail.scrollBy({ left: (er.left - rr.left) - (rail.clientWidth - el.clientWidth) / 2, behavior: 'smooth' });
    } else if (rail.scrollHeight > rail.clientHeight + 1) {
      rail.scrollBy({ top: (er.top - rr.top) - (rail.clientHeight - el.clientHeight) / 2, behavior: 'smooth' });
    }
  }, [activeImg, color]);

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
  const activeColor = product.colors?.find((c) => c.name === color);
  // Show the SELECTED colour's images; fall back to the product's gallery.
  const colorImages = (activeColor?.images || []).filter(Boolean);
  const images   = colorImages.length
    ? colorImages
    : (product.images?.length ? product.images : ['/assets/Gripzus.JPG.jpeg']);
  const curImg   = Math.min(activeImg, images.length - 1);
  const colorLabel  = activeColor?.packColors ? `Pack of ${activeColor.packColors.length}` : (color || '—');

  /* ── Pack / bundle pricing ─────────────────────────────────────────────
     Per-product, admin-set EXACT pack prices (from GET /api/public/bundle-tiers).
     When a product has packs the selector REPLACES the qty stepper: 1 pair = the
     product's own price, then each configured pack (2 pairs ₹X, 3 pairs ₹Y…).
     Pricing stays server-authoritative — the cart/checkout/order endpoints
     re-price a line by its QUANTITY from the same bundle tier, so adding
     `packPairs` units of the selected variation is what makes the pack price
     apply (we never invent a discounted number beyond the tier's own figure). */
  const rawPacks = Array.isArray(bundleTiers) ? bundleTiers : [];
  const hasPacks = rawPacks.length > 0;
  const packOptions = hasPacks
    ? [{ pairs: 1, price: Number(price), label: '1 Pair', badge: null, base: true },
       ...rawPacks.map((t) => ({ pairs: Number(t.pairs), price: Number(t.price), label: t.label || `${t.pairs} Pairs`, badge: t.badge }))]
    : [];
  const activePack = hasPacks ? packOptions[Math.min(pack, packOptions.length - 1)] : null;
  const packPairs = activePack ? activePack.pairs : 1;
  const packTotal = activePack ? activePack.price : Number(price);
  const packUnit = packPairs > 0 ? packTotal / packPairs : Number(price);
  const packMrp = Number(price) * packPairs;
  const packHasDiscount = !!activePack && !activePack.base && packTotal < packMrp;
  const packOff = packHasDiscount ? Math.round((1 - packTotal / packMrp) * 100) : 0;

  // Build the cart line for the current selection. A multi-pack adds `packPairs`
  // units of the chosen variation (quantity = pairs); the backend reprices the
  // line to the admin pack price. The per-unit `price` we send is only used for
  // the guest localStorage cart + the Meta pixel — the server stays authoritative
  // for signed-in carts, checkout and the order.
  const buildCartLine = () => ({
    id: product.id, name: product.name, slug: product.slug,
    image: images[0], price: hasPacks ? packUnit : price, collection: product.collection,
    size, color, qty: hasPacks ? packPairs : qty,
    variationId: resolveVariationId(product, color, size),
  });

  /* ── Per-pair colour selection (multi-pair packs) ──────────────────────
     Single, individually-selectable colours (the admin-defined multi-colour
     "pack" swatches are excluded — you can't pick one of those per pair). When
     the chosen pack has >1 pair AND there are individual colours, the shopper
     picks a colour for EACH pair; each colour becomes its own cart line and all
     lines share one pack_id so the backend prices the group by the bundle tier. */
  const singleColors = (product.colors || []).filter((c) => !c.packColors);
  const canPerPair = hasPacks && packPairs > 1 && singleColors.length > 0;
  // The colour name chosen for each pair (defaults to the main selected colour).
  const perPairColors = Array.from({ length: packPairs }, (_, i) => packColors[i] ?? color);

  // Resolve a colour NAME → its variation id, its own first image and the name.
  const resolvePairVariant = (name) => {
    const c = product.colors?.find((x) => x.name === name);
    const img = (c?.images || []).filter(Boolean)[0] || images[0] || null;
    return { variationId: resolveVariationId(product, name, size), color: name, image: img };
  };

  // Shared, pack-aware line builder used by BOTH Add-to-cart and Buy Now.
  const addSelectionToCart = (opts = {}) => {
    if (canPerPair) {
      const perPair = perPairColors.map((name) => resolvePairVariant(name));
      // packUnit (tierPrice / pairs) is for the guest line + pixel only; the
      // server reprices every pack line from the tier via the shared pack_id.
      addPack({ ...product, image: images[0] }, size, perPair, packUnit, packPairs, opts);
      return;
    }
    addItem(buildCartLine(), opts);
  };

  const handleAdd = () => {
    addSelectionToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  // Buy Now mirrors Morbix: run the SAME pack-aware builder (packs + per-pair
  // colours included), no "added" confirmation, and open the cart/checkout the
  // Gripzus way.
  const handleBuyNow = () => {
    addSelectionToCart({ openDrawer: false, toast: false });
    openCart();
  };

  /* ── Server-rendered SEO (mirrors Crosscoin's /products/[slug]) ──────────
     Built from the already-fetched product so these tags live in the initial
     HTML that crawlers see — not injected after hydration. */
  const canonical = `${SITE_URL}/products/${slug}`;
  const metaTitle = `${product.name} | Gripzus`;
  const metaDescription = truncate(
    product.description || `${product.name} — ${product.collection} from Gripzus.`,
    160
  );
  const ogImage = product.images?.[0] || `${SITE_URL}/Gripzusfavicon.jpeg`;
  const metaKeywords = [product.name, product.collection, 'gripzus'].filter(Boolean).join(', ');

  // Product JSON-LD — rich result for the product itself.
  const productLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: metaDescription,
    image: product.images,
    ...(product.sku ? { sku: product.sku } : {}),
    brand: { '@type': 'Brand', name: 'Gripzus' },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.price,
      availability: product.inStock === false
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
      url: canonical,
    },
    ...(product.rating ? {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: product.rating,
        reviewCount: product.reviewCount || 0,
      },
    } : {}),
  };

  // BreadcrumbList — Home → Catalogue → this product (matches the on-page crumb).
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Catalogue', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: product.name, item: canonical },
    ],
  };

  // Feed the same values to SeoWrapper so it renders server-side (truthy seoData
  // short-circuits its client fetch) and never overrides the tags below.
  const seoData = {
    meta_title: metaTitle,
    meta_description: metaDescription,
    meta_keywords: metaKeywords,
    canonical_url: canonical,
    meta_image: ogImage,
    og_title: metaTitle,
    og_description: metaDescription,
  };

  return (
    <>
      <Head>
        <title>{metaTitle}</title>
        <meta name="description" content={metaDescription} />
        <meta name="keywords" content={metaKeywords} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow, max-image-preview:large" />

        <meta property="og:type" content="product" />
        <meta property="og:title" content={metaTitle} />
        <meta property="og:description" content={metaDescription} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={ogImage} />
        <meta property="og:site_name" content="Gripzus" />

        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={metaTitle} />
        <meta name="twitter:description" content={metaDescription} />
        <meta name="twitter:image" content={ogImage} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(productLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
      </Head>

      <SeoWrapper pageName={slug || 'product-details'} seoData={seoData}>
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
            <div className="md:col-span-6 md:sticky md:top-24 md:self-start">
              <div className="flex flex-col gap-3">

                {/* Main image on top — square, never cropped (Morbix layout) */}
                <div
                  ref={mainImgRef}
                  className="gz-pdp-main relative w-full overflow-hidden aspect-square bg-paper-warm"
                >
                  <button type="button" onClick={() => setLightbox(true)} aria-label="Zoom image" className="block h-full w-full cursor-zoom-in relative">
                    <img
                      key={curImg}
                      src={ik(images[curImg], 900)}
                      alt={product.name}
                      loading="eager"
                      fetchPriority="high"
                      decoding="async"
                      className="gz-pdp-img block h-full w-full object-contain"
                    />
                    {product.sku && (
                      <span className="absolute left-2.5 bottom-2.5 bg-ink/80 text-[10px] font-semibold px-2 py-1 text-paper z-10">Style: #{product.sku}</span>
                    )}
                    <span className="absolute right-2.5 top-2.5 w-8 h-8 rounded-full bg-paper/90 grid place-items-center shadow z-10 text-ink" aria-hidden="true">
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                    </span>
                  </button>

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

                {/* Thumbnail row — horizontal, below the main image (Morbix
                    layout), larger squares; auto-follows the active image. */}
                {images.length > 1 && (
                  <div
                    ref={thumbsRef}
                    className="flex flex-row gap-2.5 overflow-x-auto no-scrollbar scroll-smooth [-webkit-overflow-scrolling:touch] pb-1"
                  >
                    {images.slice(0, 8).map((img, i) => (
                      <button
                        key={i}
                        data-thumb={i}
                        onClick={() => setActiveImg(i)}
                        data-active={curImg === i ? 'true' : undefined}
                        aria-label={`View image ${i + 1}`}
                        className={`h-[72px] w-[72px] sm:h-16 sm:w-16 shrink-0 overflow-hidden border bg-paper-warm transition-colors ${
                          curImg === i ? 'border-ink' : 'border-line opacity-60 hover:opacity-100 hover:border-ink'
                        }`}
                      >
                        <img src={ik(img, 160)} alt="" loading="lazy" className="block h-full w-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Full-screen zoom lightbox (same as the CrossCoin gallery) */}
            {lightbox && images[curImg] && (
              <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6" style={{ background: 'rgba(10,8,18,.92)' }}
                role="dialog" aria-modal="true" aria-label="Product image"
                onClick={(e) => { if (e.target === e.currentTarget) setLightbox(false); }}>
                <button type="button" onClick={() => setLightbox(false)} aria-label="Close" className="absolute top-4 right-4 text-white text-3xl leading-none">×</button>
                {images.length > 1 && (
                  <button type="button" aria-label="Previous" onClick={() => setActiveImg((i) => (i - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white grid place-items-center text-2xl">‹</button>
                )}
                <img src={ik(images[curImg], 1200)} alt={product.name} className="max-w-[92vw] max-h-[88vh] object-contain rounded-xl" />
                {images.length > 1 && (
                  <button type="button" aria-label="Next" onClick={() => setActiveImg((i) => (i + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/15 hover:bg-white/25 text-white grid place-items-center text-2xl">›</button>
                )}
              </div>
            )}

            {/* Info — airy, generous spacing */}
            <div className="md:col-span-6 md:py-2">
              <h1 className="h-display text-3xl md:text-4xl leading-tight mb-3">{product.name}</h1>

              {/* Meta — rating · reviews · SKU (Morbix parity) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6 text-sm text-ink-muted">
                {product.rating > 0 && (
                  <span className="inline-flex items-center gap-1 font-semibold text-ink">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#e8a33d" aria-hidden="true"><path d="M12 2l3 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.9 21l1.2-6.8-5-4.9 6.9-1z"/></svg>
                    {Number(product.rating).toFixed(1)}
                  </span>
                )}
                {(product.reviewCount > 0 || initialReviewTotal > 0) && (
                  <a href="#reviews" className="underline-offset-4 hover:text-ink hover:underline">{product.reviewCount || initialReviewTotal} reviews</a>
                )}
                {product.sku && <span>SKU: {product.sku}</span>}
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-3">
                  {/* Headline reflects the selected pack: pack total when a
                      multi-pack is chosen, the normal unit price otherwise. */}
                  <span className="h-display text-ink text-4xl">₹{Number(hasPacks ? packTotal : price).toLocaleString('en-IN')}</span>
                  {hasPacks ? (
                    packHasDiscount && (
                      <>
                        <span className="text-ink-muted text-base line-through">₹{Number(packMrp).toLocaleString('en-IN')}</span>
                        <span className="inline-flex items-center rounded-full bg-paper-warm px-2.5 py-1 text-xs font-semibold text-ink">
                          −{packOff}% OFF
                        </span>
                      </>
                    )
                  ) : (
                    compare && compare > price && (
                      <>
                        <span className="text-ink-muted text-base line-through">₹{compare.toLocaleString('en-IN')}</span>
                        <span className="inline-flex items-center rounded-full bg-paper-warm px-2.5 py-1 text-xs font-semibold text-ink">
                          −{Math.round(((compare - price) / compare) * 100)}% OFF
                        </span>
                      </>
                    )
                  )}
                </div>
                {((hasPacks && packHasDiscount) || (!hasPacks && compare && compare > price)) && (
                  <p className="text-ink-muted text-xs mt-1.5">MRP incl. of all taxes</p>
                )}
              </div>

              {/* Stock badge (shield) + free-shipping line (Morbix parity) */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
                {product.inStock === false ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'var(--paper-warm, #f3efe8)', color: 'var(--ink, #16181d)' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                    Out of stock
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold" style={{ background: 'rgba(21,128,61,.10)', color: '#15803d' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/></svg>
                    {Number.isFinite(Number(product.stock)) && Number(product.stock) > 0 && Number(product.stock) <= 5 ? `Only ${Number(product.stock)} left` : 'In stock'}
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                  <strong className="text-ink font-semibold">Free shipping</strong> on all orders
                </span>
              </div>

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
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="eyebrow">Size — <span className="text-ink">{size}</span></p>
                    {SIZE_GUIDE.rows.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setShowSizeChart(true)}
                        className="shrink-0 text-xs font-semibold text-ink underline underline-offset-4 hover:text-ink-soft"
                      >
                        Size chart
                      </button>
                    )}
                  </div>
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

              {/* Pack — admin-set bundle tiers; replaces the qty stepper when
                  present. Shown only when there's a real choice (1-pair base +
                  at least one pack). Styled with Gripzus's own square, monochrome
                  control language (border-line → border-ink on select, ink mark,
                  no pills/circles), matching the size + colour selectors above. */}
              {packOptions.length > 1 && (
                <div className="mb-6">
                  <p className="eyebrow mb-3">Pack — <span className="text-ink">{activePack?.label}</span></p>
                  <div className="flex flex-col gap-2">
                    {packOptions.map((t, i) => {
                      const per = t.pairs > 0 ? t.price / t.pairs : t.price;
                      const mrp = Number(price) * t.pairs;
                      const disc = !t.base && t.price < mrp;
                      const activeCard = i === pack;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPack(i)}
                          aria-pressed={activeCard}
                          className={`flex items-center gap-3 border px-4 py-3 text-left transition-colors ${
                            activeCard ? 'border-ink bg-paper-warm' : 'border-line hover:border-ink'
                          }`}
                        >
                          {/* Square selection mark — ink-filled when active (the
                              site is all-square by design; no round radios). */}
                          <span aria-hidden="true" className={`shrink-0 grid place-items-center w-4 h-4 border ${activeCard ? 'border-ink bg-ink text-paper' : 'border-line'}`}>
                            {activeCard && (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-semibold text-ink">{t.label}</span>
                              {t.badge && (
                                <span className="inline-flex items-center bg-ink px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-paper">{t.badge}</span>
                              )}
                            </span>
                            <span className="block text-xs text-ink-muted mt-0.5">₹{per.toFixed(2)} / pair</span>
                          </span>
                          <span className="shrink-0 text-right">
                            <span className="block text-sm font-semibold text-ink">₹{t.price.toFixed(0)}</span>
                            {disc && <span className="block text-xs text-ink-muted line-through">₹{mrp.toFixed(0)}</span>}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-pair colour — pick a colour for EACH pair of a multi-pair
                  pack. One control per pair, each defaulting to the selected
                  colour; uses the same square monochrome swatch idiom as the
                  colour selector above. Shown only when the pack has >1 pair AND
                  the product has individually-selectable colours. */}
              {canPerPair && (
                <div className="mb-6">
                  <p className="eyebrow mb-3">Choose a colour for each pair</p>
                  <div className="flex flex-col gap-3">
                    {perPairColors.map((name, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-3">
                        <span className="eyebrow text-ink-muted shrink-0 min-w-[4.5rem]">
                          Pair {idx + 1} — <span className="text-ink">{name || '—'}</span>
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {singleColors.map((c) => {
                            const active = name === c.name;
                            return (
                              <button
                                key={c.name}
                                type="button"
                                onClick={() => setPackColors((prev) => {
                                  const next = Array.from({ length: packPairs }, (_, i) => prev[i] ?? color);
                                  next[idx] = c.name;
                                  return next;
                                })}
                                title={c.name}
                                aria-label={`Pair ${idx + 1}: ${c.name}`}
                                aria-pressed={active}
                                className={`w-7 h-7 border transition-all ${
                                  active ? 'border-ink ring-1 ring-ink ring-offset-2 ring-offset-paper' : 'border-line hover:border-ink'
                                }`}
                                style={{ backgroundColor: c.hex }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Qty + actions */}
              <div ref={actionsRef}>
                <div className="flex items-center gap-2.5 mb-3 sm:gap-3">
                  {!hasPacks && (
                    <div className="flex items-center border border-line rounded-sm shrink-0">
                      <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center hover:bg-paper-warm">−</button>
                      <span className="w-9 sm:w-12 text-center text-sm">{qty}</span>
                      <button onClick={() => setQty((q) => q + 1)} className="w-9 h-11 sm:w-11 sm:h-12 flex items-center justify-center hover:bg-paper-warm">+</button>
                    </div>
                  )}
                  <button onClick={handleAdd} className={`btn flex-1 justify-center gap-2 !py-3.5 sm:!py-4 whitespace-nowrap ${added ? '!bg-ink-soft' : ''}`}>
                    {product.inStock === false ? 'Sold Out' : (
                      <>{added ? 'Added to cart' : 'Add to cart'}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                      </>
                    )}
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
                {/* Buy Now with the prepaid coupon ticket OVERLAPPING the button's
                    top edge (Morbix pattern) — a real admin-created prepaid-only
                    coupon (never fabricated), in Gripzus's monochrome tokens. */}
                <div className="flex flex-col items-stretch">
                  {prepaidCoupon?.code && (
                    <div
                      className="relative z-[2] -mb-3 self-center inline-flex items-center gap-2 border border-ink bg-paper px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.1em] text-ink shadow-[0_6px_14px_-7px_rgba(18,18,18,0.35)]"
                      aria-label={`Use code ${prepaidCoupon.code} for extra off on prepaid orders`}
                    >
                      <span aria-hidden="true" className="flex gap-0.5 text-ink-muted"><i className="inline-block h-[3px] w-[3px] rounded-full bg-current" /><i className="inline-block h-[3px] w-[3px] rounded-full bg-current" /><i className="inline-block h-[3px] w-[3px] rounded-full bg-current" /></span>
                      <strong className="font-extrabold tracking-[0.06em]">{prepaidCoupon.code}</strong>
                      <span className="font-semibold text-ink-muted normal-case tracking-normal">· extra off on prepaid</span>
                      <span aria-hidden="true" className="flex gap-0.5 text-ink-muted"><i className="inline-block h-[3px] w-[3px] rounded-full bg-current" /><i className="inline-block h-[3px] w-[3px] rounded-full bg-current" /><i className="inline-block h-[3px] w-[3px] rounded-full bg-current" /></span>
                    </div>
                  )}
                  <button onClick={handleBuyNow} className="btn w-full justify-center gap-2 !py-3.5 sm:!py-4 whitespace-nowrap">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
                    BUY NOW – Cash On Delivery
                  </button>
                </div>
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

              {/* Delivery / pincode serviceability — below the trust strip */}
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
            </div>
          </div>
        </section>

        {/* ── Story + Details & care — one tight two-column row ────────── */}
        <div className="wrap"><div className="hairline" /></div>
        <section className={`wrap py-10 md:py-14 grid grid-cols-1 gap-10 lg:gap-16 ${(product.description || /<[a-z][\s\S]*>/i.test(product.descriptionHtml || '')) ? 'lg:grid-cols-2' : ''}`}>
          {/* Story */}
          {(product.description || /<[a-z][\s\S]*>/i.test(product.descriptionHtml || '')) && (
            <div>
              <p className="eyebrow text-ink-muted mb-4">The story</p>
              {/* Admin rich text is server-sanitised on save (safe subset incl <img>,
                  scripts stripped), so rendering the stored HTML directly is XSS-safe.
                  Old products have plain-text descriptions → fall back to plain render. */}
              {/<[a-z][\s\S]*>/i.test(product.descriptionHtml || '') ? (
                <div
                  className="gz-desc-rich prose-body text-base md:text-lg text-justify hyphens-auto"
                  dangerouslySetInnerHTML={{ __html: product.descriptionHtml }}
                />
              ) : (
                <p className="prose-body whitespace-pre-line text-base md:text-lg text-justify hyphens-auto">{product.description}</p>
              )}
            </div>
          )}

          {/* Details & care — compact definition rows */}
          <div>
            <p className="eyebrow text-ink-muted mb-4">Details &amp; care</p>
            <div className="border-t border-line">
              {[
                product.sku && ['SKU', product.sku],
                ['Collection', product.collection],
                product.sizes?.length > 0 && ['Sizes', product.sizes.join(', ')],
                product.colors?.length > 0 && ['Colours', product.colors.map((c) => c.name).join(', ')],
              ].filter(Boolean).map(([label, value]) => (
                <div key={label} className="flex items-baseline justify-between gap-6 py-3 border-b border-line">
                  <span className="eyebrow text-ink-muted shrink-0">{label}</span>
                  <span className="prose-body text-sm text-ink text-right">{value}</span>
                </div>
              ))}
            </div>
            <p className="spec block pt-4">Hand-finished and inspected pair-by-pair · 7-day returns.</p>
          </div>
        </section>

        {/* ── Conditions it can help with (ported Morbix section) ──────── */}
        <div className="wrap"><div className="hairline" /></div>
        <ConditionsSection />

        {/* ── Ideal for, care and manufacturing ────────────────────────── */}
        <div className="wrap"><div className="hairline" /></div>
        <section className="wrap py-10 md:py-14">
          <ProductDetailBlocks product={product} />
        </section>

        {/* ── Editorial band 3 — Reviews (ported Morbix moving wall) ───── */}
        <div className="wrap"><div className="hairline" /></div>
        <ReviewsSection reviews={initialReviews} total={initialReviewTotal} productId={product.id} />

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

        {/* ── FAQ accordion (ported Morbix section) — renders nothing when empty ── */}
        <div className="wrap"><div className="hairline" /></div>
        <FaqSection faqs={initialFaqs} />

        {/* Sticky add-to-bag bar — slides in once the action block scrolls away */}
        <div
          data-sticky-atc={showBar ? 'true' : undefined}
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
              <p className="eyebrow mt-0.5 truncate">{colorLabel} · ₹{Number(hasPacks ? packTotal : price).toLocaleString('en-IN')}</p>
            </div>
            <button onClick={handleBuyNow} className="btn justify-center !py-3 whitespace-nowrap">
              {product.inStock === false ? 'Sold Out' : 'Buy Now'}
            </button>
          </div>
        </div>

        {showSizeChart && <SizeChartModal onClose={() => setShowSizeChart(false)} />}
      </main>
      </SeoWrapper>
    </>
  );
}

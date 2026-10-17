import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, Thumb, toast } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { fetchProduct, fetchProducts, fetchProductReviews, fetchProductFaqs, fetchBundleTiers, checkPincode, colorToCss, submitProductReview } from '../../components/test/real';
import { addItem, addPack } from '../../components/test/store';
import { toggleWish, isWished } from '../../components/test/wishlist';
import { richHtml } from '../../utils/sanitizeHtml';
import { SIZE_GUIDE } from '../../lib/sizeGuide';

const AVBG = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a', '#6d28d9'];
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function TestProduct() {
  const router = useRouter();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [also, setAlso] = useState([]);
  const [variant, setVariant] = useState(null); // selected variant (single pair or pack)
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [mainImg, setMainImg] = useState('');
  const [prodReviews, setProdReviews] = useState({ items: [], avg: null, count: 0 });
  const [prodFaqs, setProdFaqs] = useState([]);
  const [faqOpen, setFaqOpen] = useState(0);
  const [packTiers, setPackTiers] = useState([]); // admin "Buy More, Save More" ladder
  const [packSel, setPackSel] = useState(1); // selected number of pairs
  const [packColors, setPackColors] = useState([]); // one colour name per pair (multi-pair packs)
  const [pin, setPin] = useState('');
  const [pinRes, setPinRes] = useState(null); // { ok, text }
  const [pinBusy, setPinBusy] = useState(false);
  const [lightbox, setLightbox] = useState(-1); // index into thumbs, -1 = closed
  const [sizeChart, setSizeChart] = useState(false);
  const [sticky, setSticky] = useState(false); // sticky buy bar visibility
  const [rv, setRv] = useState({ name: '', email: '', rating: 5, comment: '', busy: false, done: false, err: '' });

  useEffect(() => {
    let off = false;
    setLoading(true);
    (async () => {
      try {
        let slug = router.query.slug ? String(router.query.slug) : '';
        if (!slug) { const list = await fetchProducts({ limit: 1 }); slug = list[0]?.slug || ''; }
        const prod = slug ? await fetchProduct(slug) : null;
        if (off) return;
        setP(prod);
        if (prod) {
          const vlist = prod.variants || [];
          const v0 = vlist.find((v) => v.pairs === 1) || vlist[0] || null; // default to a single pair
          setVariant(v0);
          setSize((v0?.sizes?.length ? v0.sizes[0] : prod.sizes?.[0]) || '');
          setQty(1);
          setMainImg(v0?.img || prod.img || prod.images?.[0] || '');
          setProdReviews({ items: [], avg: null, count: 0 }); setProdFaqs([]); setFaqOpen(0);
          setPackTiers([]); setPackSel(1); setPin(''); setPinRes(null);
          fetchProductReviews(prod.id, 8).then((r) => { if (!off) setProdReviews(r); }).catch(() => {});
          fetchProductFaqs(prod.id).then((f) => { if (!off) setProdFaqs(f); }).catch(() => {});
          fetchBundleTiers(prod.id).then((t) => { if (!off) setPackTiers(t); }).catch(() => {});
        }
        fetchProducts({ limit: 12 }).then((l) => { if (!off) setAlso(l.filter((x) => x.slug !== slug).slice(0, 6)); }).catch(() => {});
      } catch (_) { if (!off) setP(null); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [router.query.slug]);

  // Sticky buy bar appears once the main buy panel has scrolled out of view.
  useEffect(() => {
    const onScroll = () => setSticky(window.scrollY > 620);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the lightbox on Escape.
  useEffect(() => {
    if (lightbox < 0) return;
    const onKey = (e) => { if (e.key === 'Escape') setLightbox(-1); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox]);

  // Default a colour for each pair when a multi-pair pack is selected.
  useEffect(() => {
    const names = (p?.colors || []).map((c) => c.name).filter(Boolean);
    if (packSel > 1 && names.length) setPackColors((prev) => Array.from({ length: packSel }, (_, i) => prev[i] || names[0]));
    else setPackColors([]);
  }, [packSel, p]);

  if (loading) return (
    <TestLayout>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="wrap">
        <div className="pd" style={{ paddingTop: 24 }}>
          <div className="gallery"><div className="cc-skel cc-skelblock" style={{ aspectRatio: '1/1', width: '100%' }} aria-hidden="true" /></div>
          <div className="buy">
            <div className="cc-skel cc-skelblock" style={{ height: 14, width: '35%', marginBottom: 14 }} aria-hidden="true" />
            <div className="cc-skel cc-skelblock" style={{ height: 30, width: '85%', marginBottom: 16 }} aria-hidden="true" />
            <div className="cc-skel cc-skelblock" style={{ height: 24, width: '50%', marginBottom: 22 }} aria-hidden="true" />
            <div className="cc-skel cc-skelblock" style={{ height: 48, marginBottom: 10 }} aria-hidden="true" />
            <div className="cc-skel cc-skelblock" style={{ height: 48, marginBottom: 10 }} aria-hidden="true" />
            <div className="cc-skel cc-skelblock" style={{ height: 48 }} aria-hidden="true" />
          </div>
        </div>
      </div>
    </TestLayout>
  );
  if (!p) return <TestLayout><Head><meta name="robots" content="noindex, nofollow" /></Head><div className="wrap"><p className="mono" style={{ padding: '60px 0', fontSize: 13 }}>Product not found. <a style={{ color: 'var(--crimson)', cursor: 'pointer' }} onClick={() => router.push('/test/shop')}>Back to shop</a></p></div></TestLayout>;

  // The selected variant (single pair or a pack) drives price + image. Fall back
  // to the product's own price when a product has no structured variants.
  const variants = p.variants || [];
  const cur = variant || { id: 0, price: p.now, comparePrice: p.was, off: p.off, pairs: 1, colors: [], sizes: p.sizes, label: 'Single', img: p.img };
  const sizeOpts = (cur.sizes && cur.sizes.length) ? cur.sizes : p.sizes;
  const total = cur.price * qty;
  const thumbs = (p.images && p.images.length ? p.images : variants.map((v) => v.img).filter(Boolean));

  // "CHOOSE YOUR PACK" ladder (Morbix-style) — the admin "Buy More, Save More"
  // tiers, with a 1-pair option at the product's own price on top.
  const basePair = cur.pairs === 1 ? cur.price : (variants.find((v) => v.pairs === 1)?.price || p.now);
  const hasPacks = packTiers.length > 0;
  const packOptions = hasPacks
    ? [{ pairs: 1, total: basePair, badge: null }, ...packTiers.map((t) => ({ pairs: t.pairs, total: t.price, badge: t.badge }))]
    : [];
  const selOpt = packOptions.find((o) => o.pairs === packSel) || packOptions[0] || null;
  const payable = hasPacks && selOpt ? selOpt.total : total;

  const pickVariant = (v) => { setVariant(v); if (v.img) setMainImg(v.img); if (v.sizes?.length) setSize(v.sizes[0]); };

  const colourNames = (p.colors || []).map((c) => c.name).filter(Boolean);
  const perPairPackers = hasPacks && selOpt && selOpt.pairs > 1 && colourNames.length > 0;

  const add = (buyNow) => {
    if (hasPacks && selOpt) {
      const perPair = Math.round(selOpt.total / selOpt.pairs);
      if (perPairPackers && packColors.length === selOpt.pairs) {
        // Multi-pair pack with a colour chosen per pair → one bundle group.
        addPack({ id: p.id, vid: cur.id || null, name: p.name, brand: p.brand, size, img: cur.img || mainImg || p.img, perPair, was: cur.comparePrice || basePair, base: basePair, packSize: selOpt.pairs, colors: packColors });
      } else {
        addItem({ id: p.id, vid: cur.id || null, name: p.name, brand: p.brand, color: cur.colors.join(' / ') || '', size, pack: selOpt.pairs === 1 ? 'Single' : `${selOpt.pairs} Pairs`, packq: selOpt.pairs, unit: perPair, was: cur.comparePrice || basePair, base: basePair, img: cur.img || mainImg || p.img }, selOpt.pairs);
      }
    } else {
      addItem({ id: p.id, vid: cur.id || null, name: p.name, brand: p.brand, color: cur.colors.join(' / ') || '', size, pack: cur.label, packq: cur.pairs, unit: cur.price, was: cur.comparePrice, base: cur.price, img: cur.img || mainImg || p.img }, qty);
    }
    // Buy-now opens the real drawer straight to checkout (places a genuine
    // order); plain add opens it at the cart step. Both use the real drawer —
    // no routing to the mock /test/cart page.
    if (buyNow) window.dispatchEvent(new CustomEvent('cc-test-opencart', { detail: 'checkout' }));
    else { toast('Added to cart ✓'); window.dispatchEvent(new CustomEvent('cc-test-opencart')); }
  };

  // Real product description (HTML from the live product record), with a safe
  // fallback. Shipping/returns stays a static note.
  const descHtml = (p.raw && (p.raw.description || p.raw.long_description || p.raw.longDescription)) || '';

  return (
    <TestLayout>
      <Head><title>{p.name} — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="wrap">
        <div className="crumbs" style={{ paddingTop: 20 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test/shop')}>Shop</span> / {p.name}
        </div>

        <div className="pd">
          <div className="gallery">
            <div className="gmain" style={{ overflow: 'hidden', cursor: thumbs.length ? 'zoom-in' : 'default' }} onClick={() => { const i = thumbs.indexOf(mainImg); setLightbox(i >= 0 ? i : 0); }}><Thumb src={mainImg} color={cur.colors?.[0]} />{thumbs.length > 0 && <span className="gzoom" aria-hidden="true">{I.search(16)}</span>}</div>
            {thumbs.length > 1 && (
              <div className="gthumbs">
                {thumbs.map((src, i) => (
                  <button key={i} className={`gthumb${src === mainImg ? ' on' : ''}`} style={{ overflow: 'hidden' }} onClick={() => setMainImg(src)}><Thumb src={src} /></button>
                ))}
              </div>
            )}
          </div>

          <div className="buy">
            <div className="kl">{p.brand}</div>
            <div className="titlerow">
              <h1>{p.name}</h1>
              <button className={`wishsq${isWished(p.id) ? ' on' : ''}`} aria-label="Save to wishlist" onClick={(e) => { const added = toggleWish(p); e.currentTarget.classList.toggle('on', added); toast(added ? 'Saved to wishlist ♥' : 'Removed from wishlist'); }}>{I.heart(18)}</button>
            </div>
            {p.rating && <div className="stars">★★★★★ <small>{p.rating} ({p.revs})</small></div>}
            <div className="prow"><span className="now">{inr(cur.price)}</span>{cur.comparePrice > cur.price && <span className="was">{inr(cur.comparePrice)}</span>}{cur.off > 0 && <span className="off">{cur.off}% OFF</span>}</div>
            <div className="tax">MRP incl. of all taxes</div>
            <div className="pdpstatus">
              <span className="instock">{I.check(13)} In stock</span>
              <span className="freeship">{I.truck(15)} <strong>Free shipping</strong> on all orders</span>
            </div>

            {sizeOpts.length > 0 && (<>
              <div className="optlabel">Size {SIZE_GUIDE.rows?.length > 0 && <a onClick={() => setSizeChart(true)}>Size chart</a>}</div>
              <div className="sizes">{sizeOpts.map((s) => <button key={s} className={`size${s === size ? ' on' : ''}`} onClick={() => setSize(s)}>{s}</button>)}</div>
            </>)}

            {/* CHOOSE YOUR PACK — admin pack-pricing ladder (per-pair + total, badges) */}
            {hasPacks && (<>
              <div className="optlabel">Choose your pack</div>
              <div className="packlad">
                {packOptions.map((o) => {
                  const perPair = o.total / o.pairs;
                  const mrp = basePair * o.pairs;
                  const on = packSel === o.pairs;
                  return (
                    <button type="button" key={o.pairs} className={`packopt${on ? ' on' : ''}`} onClick={() => setPackSel(o.pairs)}>
                      <span className="packopt__radio" />
                      <span className="packopt__l">
                        <b>{o.pairs} Pair{o.pairs > 1 ? 's' : ''}{o.badge ? <em className="packopt__badge">{o.badge}</em> : null}</b>
                        <span className="packopt__pp">{inr(perPair)} / pair</span>
                      </span>
                      <span className="packopt__p">
                        <span className="packopt__now">{inr(o.total)}</span>
                        {mrp > o.total ? <span className="packopt__was">{inr(mrp)}</span> : null}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>)}

            {/* Per-pair colour picker — Morbix-style: choose a colour for each pair */}
            {perPairPackers && (
              <div className="perpair">
                <div className="optlabel">Choose a colour for each pair</div>
                {Array.from({ length: selOpt.pairs }).map((_, i) => (
                  <div className="perpair__row" key={i}>
                    <span className="perpair__n">Pair {i + 1}</span>
                    <div className="perpair__sw">
                      {(p.colors || []).map((c) => (
                        <button type="button" key={c.name} title={c.name} aria-label={c.name}
                          className={`perpair__dot${packColors[i] === c.name ? ' on' : ''}`}
                          style={{ background: c.hex || colorToCss(c.name) }}
                          onClick={() => setPackColors((prev) => { const n = [...prev]; n[i] = c.name; return n; })} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {variants.length > 1 && !hasPacks && (<>
              <div className="optlabel">Choose your option</div>
              <div className="packs">
                {variants.map((v) => (
                  <div key={v.id} className={`pack${variant && v.id === variant.id ? ' on' : ''}`} onClick={() => pickVariant(v)}>
                    {v.isPack && <span className="tagbest">PACK OF {v.pairs}</span>}
                    <span className="radio" />
                    <span style={{ display: 'inline-flex', gap: 4, flexShrink: 0 }}>
                      {(v.colors.length ? v.colors : ['']).slice(0, 4).map((c, ci) => <span key={ci} title={c} style={{ width: 18, height: 18, borderRadius: '50%', background: colorToCss(c), border: '2px solid var(--line-ink)' }} />)}
                    </span>
                    <div style={{ minWidth: 0 }}><b>{v.label}</b><div className="d" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.colors.join(', ') || 'Single pair'}</div></div>
                    <div className="pp"><div className="pnow">{inr(v.price)}</div>{v.off > 0 ? <div className="psave">{v.off}% off</div> : <div className="psave">&nbsp;</div>}</div>
                  </div>
                ))}
              </div>
            </>)}

            <div className="qtyrow">
              {!hasPacks && <div className="qty"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div>}
              <button className="btn btn--crimson btn--lg" style={{ flex: 1 }} onClick={() => add(false)}>Add to cart · {inr(payable)}</button>
            </div>

            <div className="prepaidchip">≡ PAY ONLINE &amp; SAVE ₹50 ≡</div>
            <button className="btn btn--buynow btn--block" onClick={() => add(true)}>{I.cart(18)} Buy it now · Cash on Delivery</button>

            <div className="pdptrust">
              <div className="pdptrust__row">
                <div className="pdptrust__i">{I.lock(20)}<span>Secure Checkout</span></div>
                <div className="pdptrust__i">{I.card(20)}<span>Cash on Delivery</span></div>
                <div className="pdptrust__i">{I.ret(20)}<span>7-Day Returns</span></div>
                <div className="pdptrust__i">{I.shield(20)}<span>100% Genuine</span></div>
              </div>
              <div className="pdpdeliv">
                <span className="pdpdeliv__l">Delivery details</span>
                <form className="pdpdeliv__row" onSubmit={async (e) => { e.preventDefault(); setPinBusy(true); setPinRes(null); const r = await checkPincode(pin); setPinRes(r); setPinBusy(false); }}>
                  <input value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Enter pincode" inputMode="numeric" aria-label="Pincode" />
                  <button className="btn" type="submit" disabled={pinBusy}>{pinBusy ? '…' : 'Check'}</button>
                </form>
                {pinRes && <div className="pdpdeliv__msg" style={{ color: pinRes.ok ? 'var(--ink-soft)' : 'var(--crimson)' }}>{pinRes.ok ? '✓ ' : ''}{pinRes.text}</div>}
              </div>
            </div>
          </div>
        </div>

        {/* About + Specifications — Morbix-style (description left, spec list right) */}
        <section className="block">
          <div className="pdpdetails">
            <div className="pdpabout">
              <span className="eyebrow">Details</span>
              <h2>About this product</h2>
              {descHtml
                ? <div className="legal" {...richHtml(descHtml)} />
                : <p className="muted" style={{ color: 'var(--ink-soft)', lineHeight: 1.7 }}>Everyday essentials minted to a standard — comfortable, durable and honestly priced.</p>}
            </div>
            <aside className="pdpspecs">
              <h3>Specifications</h3>
              <dl>
                <div className="specrow"><dt>Brand</dt><dd>{p.brand}</dd></div>
                {p.cat ? <div className="specrow"><dt>Category</dt><dd>{p.cat}</dd></div> : null}
                <div className="specrow"><dt>Colours</dt><dd>{p.colors.length ? p.colors.map((c) => c.name).join(', ') : '—'}</dd></div>
                <div className="specrow"><dt>Sizes</dt><dd>{p.sizes.length ? p.sizes.join(', ') : 'One size'}</dd></div>
                <div className="specrow"><dt>Shipping</dt><dd>Free over ₹799 · 24h dispatch</dd></div>
                <div className="specrow"><dt>Returns</dt><dd>7-day easy returns</dd></div>
              </dl>
            </aside>
          </div>
        </section>

        {/* Ideal for */}
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="sechead"><div><span className="eyebrow">Ideal for</span><h2>Where it earns its keep</h2></div></div>
          <div className="idealrow">
            {[
              ['Everyday wear', <svg key="a" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>],
              ['Work', <svg key="b" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 7V5a2 2 0 00-4 0v2M8 7V5a2 2 0 00-4 0v2" /></svg>],
              ['Travel', <svg key="c" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" /></svg>],
              ['Sport', <svg key="d" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 000 18M3 12h18" /></svg>],
            ].map(([lbl, ic]) => <span className="idealchip" key={lbl}>{ic}{lbl}</span>)}
          </div>
        </section>

        {/* Washing instructions (same care set as the live store) */}
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="sechead"><div><span className="eyebrow">Care</span><h2>Washing instructions</h2></div></div>
          <div className="washbox">
            {[
              ['Gentle wash 40°C', <svg key="1" width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10 Q4 8 6 8 H30 Q32 8 32 10 L30 28 Q30 30 28 30 H8 Q6 30 6 28 Z"/><text x="18" y="22" textAnchor="middle" fontSize="9" fontWeight="700" stroke="none" fill="currentColor">40</text><path d="M8 16 Q11 13 14 16 Q17 19 20 16 Q23 13 26 16 Q29 19 32 16" strokeWidth="1.2"/></svg>],
              ['Do not bleach', <svg key="2" width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M18 5 L33 30 H3 Z"/><line x1="12" y1="14" x2="24" y2="26"/><line x1="24" y1="14" x2="12" y2="26"/></svg>],
              ['Do not wring', <svg key="3" width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14 C4 14 8 10 12 14 C16 18 20 10 24 14 C28 18 32 14 32 14"/><path d="M4 22 C4 22 8 18 12 22 C16 26 20 18 24 22 C28 26 32 22 32 22"/><line x1="13" y1="11" x2="23" y2="25"/><line x1="23" y1="11" x2="13" y2="25"/></svg>],
              ['Flat dry in shade', <svg key="4" width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="10" width="28" height="16" rx="1"/><line x1="8" y1="18" x2="28" y2="18"/></svg>],
              ['Do not iron', <svg key="5" width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M4 24 H28 Q34 24 34 18 Q34 14 28 14 H12 L8 10 H4 Z"/><line x1="13" y1="15" x2="23" y2="23"/><line x1="23" y1="15" x2="13" y2="23"/></svg>],
              ['Do not dry clean', <svg key="6" width="34" height="34" viewBox="0 0 36 36" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="18" r="13"/><line x1="11" y1="11" x2="25" y2="25"/><line x1="25" y1="11" x2="11" y2="25"/></svg>],
            ].map(([lbl, ic]) => <div className="washitem" key={lbl}>{ic}<span>{lbl}</span></div>)}
          </div>
        </section>

        {/* Manufacturing details (same as the live store) */}
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="sechead"><div><span className="eyebrow">Manufacturing details</span><h2>Who makes it</h2></div></div>
          <div className="mfgrow">
            <div className="mfgaddr">Obzus India Private Limited, Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat (India)</div>
            <div className="origin">
              <span className="origin__l">Country of origin</span>
              <span className="origin__b"><svg width="24" height="16" viewBox="0 0 24 16" aria-hidden="true"><rect width="24" height="16" fill="#FF9933"/><rect y="5.33" width="24" height="5.33" fill="#fff"/><rect y="10.67" width="24" height="5.34" fill="#138808"/></svg>India</span>
            </div>
          </div>
        </section>

        {/* Reviews (real) */}
        <section className="block">
          <div className="sechead">
            <div><span className="eyebrow">Reviews{prodReviews.count ? ` · ${prodReviews.count}` : ''}</span><h2>What buyers say{prodReviews.avg ? ` · ${prodReviews.avg.toFixed(1)}★` : ''}</h2></div>
            {!rv.done && <button className="btn" onClick={() => setRv((s) => ({ ...s, open: !s.open }))}>{rv.open ? 'Close' : 'Write a review'}</button>}
          </div>

          {/* Write a review — posts to the real store (goes to moderation). */}
          {rv.open && !rv.done && (
            <form className="rvform" onSubmit={async (e) => {
              e.preventDefault();
              if (rv.busy) return;
              if (!rv.name.trim() || !rv.email.trim() || !rv.comment.trim()) { setRv((s) => ({ ...s, err: 'Please fill in your name, email and review.' })); return; }
              setRv((s) => ({ ...s, busy: true, err: '' }));
              const res = await submitProductReview({ productId: p.id, rating: rv.rating, comment: rv.comment.trim(), name: rv.name.trim(), email: rv.email.trim() });
              if (res.ok) { setRv((s) => ({ ...s, busy: false, done: true, open: false })); toast(res.message); }
              else setRv((s) => ({ ...s, busy: false, err: res.message }));
            }}>
              <div className="rvform__stars" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button type="button" key={n} className={`rvstar${n <= rv.rating ? ' on' : ''}`} aria-label={`${n} star${n > 1 ? 's' : ''}`} onClick={() => setRv((s) => ({ ...s, rating: n }))}>★</button>
                ))}
              </div>
              <div className="rvform__grid">
                <input placeholder="Your name" value={rv.name} onChange={(e) => setRv((s) => ({ ...s, name: e.target.value }))} />
                <input type="email" placeholder="Email" value={rv.email} onChange={(e) => setRv((s) => ({ ...s, email: e.target.value }))} />
              </div>
              <textarea placeholder="Share what you liked (fit, comfort, quality)…" value={rv.comment} onChange={(e) => setRv((s) => ({ ...s, comment: e.target.value }))} rows={3} />
              {rv.err && <div className="mono" style={{ color: 'var(--crimson)', fontSize: 12 }}>{rv.err}</div>}
              <button className="btn btn--crimson" type="submit" disabled={rv.busy}>{rv.busy ? 'Submitting…' : 'Submit review'}</button>
            </form>
          )}
          {rv.done && <p className="mono" style={{ color: 'var(--ink-soft)', fontSize: 13, padding: '8px 0 18px' }}>✓ Thanks! Your review is in for moderation.</p>}

          {prodReviews.items.length > 0 ? (
            <div className="revscroll">
              {[0, 1, 2].map((row) => {
                const base = prodReviews.items;
                const rotated = [...base.slice(row), ...base.slice(0, row)];
                const cards = [...rotated, ...rotated];
                return (
                  <div className={`revscroll__track${row === 1 ? ' revscroll__track--rev' : ''}`} key={row}>
                    {cards.map((r, i) => (
                      <div className="rev" key={i}>
                        <div className="rev__top">
                          <div className="av" style={{ background: AVBG[(row + i) % AVBG.length] }}>{initials(r.name)}</div>
                          <div className="who"><b>{r.name}</b>{r.loc ? <span>{r.loc}</span> : null}</div>
                          <span className="vbadge">VERIFIED</span>
                        </div>
                        <div className="stars">{'★★★★★'.slice(0, Math.max(1, Math.round(r.rating)))}</div>
                        <p>&ldquo;{r.text}&rdquo;</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '6px 0 10px' }}>No reviews yet — be the first to write one.</p>
          )}
        </section>

        {/* Product FAQ (real) */}
        {prodFaqs.length > 0 && (
          <section className="block">
            <div className="sechead"><div><span className="eyebrow">FAQ</span><h2>Questions, answered</h2></div></div>
            <div className="faq" style={{ marginInline: 0, maxWidth: 'none' }}>
              {prodFaqs.map(([q, a], i) => (
                <div className={`qa${faqOpen === i ? ' open' : ''}`} key={i}>
                  <button className="qa__q" onClick={() => setFaqOpen(faqOpen === i ? -1 : i)}>{q}<span className="pm"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span></button>
                  <div className="qa__a" style={{ maxHeight: faqOpen === i ? 400 : 0 }}><div>{a}</div></div>
                </div>
              ))}
            </div>
          </section>
        )}

        {also.length > 0 && (
          <section className="block" style={{ paddingTop: 20 }}>
            <div className="sechead"><div><span className="eyebrow">Also minted</span><h2>You may also like</h2></div></div>
            <div className="prail">{also.map((x) => <ProductCard key={x.id} p={x} />)}</div>
          </section>
        )}
      </div>

      {/* Sticky buy bar — appears after the main buy panel scrolls away */}
      <div className={`pdpsticky${sticky ? ' on' : ''}`}>
        <div className="wrap pdpsticky__in">
          <div className="pdpsticky__p">
            <div className="pdpsticky__thumb"><Thumb src={mainImg} color={cur.colors?.[0]} /></div>
            <div className="pdpsticky__meta"><b>{p.name}</b><span>{inr(payable)}</span></div>
          </div>
          <div className="pdpsticky__btns">
            <button className="btn" onClick={() => add(false)}>Add to cart</button>
            <button className="btn btn--buynow" onClick={() => add(true)}>Buy now</button>
          </div>
        </div>
      </div>

      {/* Image lightbox */}
      {lightbox >= 0 && thumbs.length > 0 && (
        <div className="lbox" onClick={() => setLightbox(-1)}>
          <button className="lbox__x" aria-label="Close" onClick={() => setLightbox(-1)}>{I.close(24)}</button>
          {thumbs.length > 1 && <button className="lbox__nav lbox__prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i - 1 + thumbs.length) % thumbs.length); }}>‹</button>}
          <div className="lbox__img" onClick={(e) => e.stopPropagation()}><Thumb src={thumbs[lightbox]} /></div>
          {thumbs.length > 1 && <button className="lbox__nav lbox__next" aria-label="Next" onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i + 1) % thumbs.length); }}>›</button>}
        </div>
      )}

      {/* Size chart modal */}
      {sizeChart && (
        <div className="scmodal" onClick={() => setSizeChart(false)}>
          <div className="scmodal__card" onClick={(e) => e.stopPropagation()}>
            <div className="scmodal__head"><h3>Size chart</h3><button aria-label="Close" onClick={() => setSizeChart(false)}>{I.close(20)}</button></div>
            {SIZE_GUIDE.note && <p className="scmodal__note">{SIZE_GUIDE.note}</p>}
            <table className="sctable">
              <thead><tr><th>Size</th><th>Fits</th><th>Foot length</th></tr></thead>
              <tbody>{SIZE_GUIDE.rows.map((r) => <tr key={r.size}><td>{r.size}</td><td>{r.fits}</td><td>{r.foot}</td></tr>)}</tbody>
            </table>
            {SIZE_GUIDE.tip && <p className="scmodal__tip">{SIZE_GUIDE.tip}</p>}
          </div>
        </div>
      )}
    </TestLayout>
  );
}

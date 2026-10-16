import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, Thumb, toast } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { fetchProduct, fetchProducts, fetchProductReviews, fetchProductFaqs, colorToCss } from '../../components/test/real';
import { addItem } from '../../components/test/store';
import { richHtml } from '../../utils/sanitizeHtml';

const AVBG = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a', '#6d28d9'];
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function Spec({ label, value }) {
  return (
    <div style={{ border: '2px solid var(--line-ink)', borderRadius: 6, padding: '13px 15px', background: 'var(--surface)', boxShadow: 'var(--stamp-sm)' }}>
      <div style={{ fontFamily: '"Space Mono",monospace', fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '.08em', color: 'var(--ink-faint)' }}>{label}</div>
      <div style={{ fontSize: 14.5, fontWeight: 600, marginTop: 4 }}>{value}</div>
    </div>
  );
}

export default function TestProduct() {
  const router = useRouter();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [also, setAlso] = useState([]);
  const [variant, setVariant] = useState(null); // selected variant (single pair or pack)
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [acc, setAcc] = useState(0);
  const [mainImg, setMainImg] = useState('');
  const [prodReviews, setProdReviews] = useState({ items: [], avg: null, count: 0 });
  const [prodFaqs, setProdFaqs] = useState([]);
  const [faqOpen, setFaqOpen] = useState(0);

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
          fetchProductReviews(prod.id, 8).then((r) => { if (!off) setProdReviews(r); }).catch(() => {});
          fetchProductFaqs(prod.id).then((f) => { if (!off) setProdFaqs(f); }).catch(() => {});
        }
        fetchProducts({ limit: 12 }).then((l) => { if (!off) setAlso(l.filter((x) => x.slug !== slug).slice(0, 6)); }).catch(() => {});
      } catch (_) { if (!off) setP(null); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [router.query.slug]);

  if (loading) return <TestLayout><Head><meta name="robots" content="noindex, nofollow" /></Head><div className="wrap"><p className="mono" style={{ color: 'var(--ink-faint)', padding: '60px 0', fontSize: 13 }}>Loading product…</p></div></TestLayout>;
  if (!p) return <TestLayout><Head><meta name="robots" content="noindex, nofollow" /></Head><div className="wrap"><p className="mono" style={{ padding: '60px 0', fontSize: 13 }}>Product not found. <a style={{ color: 'var(--crimson)', cursor: 'pointer' }} onClick={() => router.push('/test/shop')}>Back to shop</a></p></div></TestLayout>;

  // The selected variant (single pair or a pack) drives price + image. Fall back
  // to the product's own price when a product has no structured variants.
  const variants = p.variants || [];
  const cur = variant || { id: 0, price: p.now, comparePrice: p.was, off: p.off, pairs: 1, colors: [], sizes: p.sizes, label: 'Single', img: p.img };
  const sizeOpts = (cur.sizes && cur.sizes.length) ? cur.sizes : p.sizes;
  const total = cur.price * qty;
  const thumbs = (p.images && p.images.length ? p.images : variants.map((v) => v.img).filter(Boolean));

  const pickVariant = (v) => { setVariant(v); if (v.img) setMainImg(v.img); if (v.sizes?.length) setSize(v.sizes[0]); };

  const add = (buyNow) => {
    addItem({ id: p.id, vid: cur.id || null, name: p.name, brand: p.brand, color: cur.colors.join(' / ') || '', size, pack: cur.label, packq: cur.pairs, unit: cur.price, was: cur.comparePrice, base: cur.price, img: cur.img || mainImg || p.img }, qty);
    if (buyNow) router.push('/test/cart');
    else { toast('Added to cart ✓'); window.dispatchEvent(new CustomEvent('cc-test-opencart')); }
  };

  // Real product description (HTML from the live product record), with a safe
  // fallback. Shipping/returns stays a static note.
  const descHtml = (p.raw && (p.raw.description || p.raw.long_description || p.raw.longDescription)) || '';
  const accItems = [
    { q: 'Description', node: descHtml
        ? <div className="pdt-desc-body" {...richHtml(descHtml)} />
        : <div>Everyday essentials minted to a standard — comfortable, durable and honestly priced.</div> },
    { q: 'Shipping & returns', node: <div>Ships in 24h. Free shipping over ₹799. 7-day easy returns with free pickup, refund to original method or store credit.</div> },
  ];

  return (
    <TestLayout>
      <Head><title>{p.name} — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="wrap">
        <div className="crumbs" style={{ paddingTop: 20 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test/shop')}>Shop</span> / {p.name}
        </div>

        <div className="pd">
          <div className="gallery">
            <div className="gmain" style={{ overflow: 'hidden' }}><Thumb src={mainImg} color={cur.colors?.[0]} /></div>
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
            <h1>{p.name}</h1>
            {p.rating && <div className="stars">★★★★★ <small>{p.rating} ({p.revs})</small></div>}
            <div className="prow"><span className="now">{inr(cur.price)}</span>{cur.comparePrice > cur.price && <span className="was">{inr(cur.comparePrice)}</span>}{cur.off > 0 && <span className="off">{cur.off}% OFF</span>}</div>
            <div className="tax">Inclusive of all taxes · Free shipping over ₹799</div>

            {/* Single pair vs multi-pair packs — each is a real variant with its
                own price. (Crosscoin models a pack as a multi-colour variation.) */}
            {variants.length > 1 && (<>
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

            {sizeOpts.length > 0 && (<>
              <div className="optlabel">Size <a onClick={() => toast('Pick the size that matches your usual fit.')}>Size chart</a></div>
              <div className="sizes">{sizeOpts.map((s) => <button key={s} className={`size${s === size ? ' on' : ''}`} onClick={() => setSize(s)}>{s}</button>)}</div>
            </>)}

            <div className="qtyrow">
              <div className="qty"><button onClick={() => setQty(Math.max(1, qty - 1))}>−</button><span>{qty}</span><button onClick={() => setQty(qty + 1)}>+</button></div>
              <button className="btn btn--crimson btn--lg" style={{ flex: 1 }} onClick={() => add(false)}>Add to cart · {inr(total)}</button>
            </div>
            <button className="btn btn--indigo btn--block" onClick={() => add(true)}>Buy it now</button>

            <div className="usps">
              <div className="usp">{I.truck(18)} Free shipping over ₹799 · ships in 24h</div>
              <div className="usp">{I.ret(18)} 7-day easy returns with free pickup</div>
              <div className="usp">{I.card(18)} UPI, cards &amp; cash on delivery</div>
            </div>

            <div className="acc">
              {accItems.map(({ q, node }, i) => (
                <div className={`acc__i${acc === i ? ' open' : ''}`} key={q}>
                  <button className="acc__q" onClick={() => setAcc(acc === i ? -1 : i)}>{q}<span className="pm2">{acc === i ? '–' : '+'}</span></button>
                  <div className="acc__a" style={{ maxHeight: acc === i ? 1200 : 0, overflow: acc === i ? 'auto' : 'hidden' }}><div>{node}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Specifications */}
        <section className="block">
          <div className="sechead"><div><span className="eyebrow">Specifications</span><h2>The details</h2></div></div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14 }}>
            <Spec label="Brand" value={p.brand} />
            {p.cat ? <Spec label="Category" value={p.cat} /> : null}
            <Spec label="Colours" value={p.colors.length ? p.colors.map((c) => c.name).join(', ') : '—'} />
            <Spec label="Sizes" value={p.sizes.length ? p.sizes.join(', ') : 'One size'} />
            <Spec label="Shipping" value="Free over ₹799 · 24h dispatch" />
            <Spec label="Returns" value="7-day easy returns" />
          </div>
        </section>

        {/* Reviews (real) */}
        {prodReviews.items.length > 0 && (
          <section className="block">
            <div className="sechead"><div><span className="eyebrow">Reviews{prodReviews.count ? ` · ${prodReviews.count}` : ''}</span><h2>What buyers say{prodReviews.avg ? ` · ${prodReviews.avg.toFixed(1)}★` : ''}</h2></div></div>
            <div className="revscroll">
              {[0, 1, 2].map((row) => {
                const base = prodReviews.items;
                const rotated = [...base.slice(row), ...base.slice(0, row)];
                const cards = [...rotated, ...rotated];
                return (
                  <div className={`revscroll__track${row === 1 ? ' revscroll__track--rev' : ''}`} key={row}>
                    {cards.map((r, i) => (
                      <div className="rev" key={i}>
                        <div className="stars">{'★★★★★'.slice(0, Math.max(1, Math.round(r.rating)))}</div>
                        <p>&ldquo;{r.text}&rdquo;</p>
                        <div className="who"><div className="av" style={{ background: AVBG[(row + i) % AVBG.length] }}>{initials(r.name)}</div><div><b>{r.name}</b><span>VERIFIED</span></div></div>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </section>
        )}

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
    </TestLayout>
  );
}

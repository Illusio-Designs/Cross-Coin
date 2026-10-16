import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, Thumb, toast } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { fetchProduct, fetchProducts, fetchBundleTiers, fetchProductReviews, fetchProductFaqs } from '../../components/test/real';
import { addItem } from '../../components/test/store';

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

const ACC = [
  ['Description', 'Everyday essentials minted to a standard — comfortable, durable and honestly priced. (Full description comes from the product record on the live store.)'],
  ['Shipping & returns', 'Ships in 24h. Free shipping over ₹799. 7-day easy returns with free pickup, refund to original method or store credit.'],
];

export default function TestProduct() {
  const router = useRouter();
  const [p, setP] = useState(null);
  const [loading, setLoading] = useState(true);
  const [also, setAlso] = useState([]);
  const [color, setColor] = useState(null);     // {name,hex,img}
  const [size, setSize] = useState('');
  const [tiers, setTiers] = useState([]);        // real bundle tiers
  const [packQ, setPackQ] = useState(1);         // selected pack size (pairs)
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
          const c0 = prod.colors?.[0] || null;
          setColor(c0); setSize(prod.sizes?.[0] || ''); setPackQ(1); setTiers([]); setQty(1);
          setMainImg(c0?.img || prod.img || prod.images?.[0] || '');
          setProdReviews({ items: [], avg: null, count: 0 }); setProdFaqs([]); setFaqOpen(0);
          fetchBundleTiers(prod.id).then((t) => { if (!off) setTiers(t); }).catch(() => {});
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

  // Pack ladder from REAL admin-set bundle tiers only. Products with no tiers
  // show a normal single-price product (the pack selector is hidden).
  const packOptions = tiers.length
    ? [{ q: 1, label: 'Single', total: p.now, best: false }, ...tiers.map((t) => ({ q: t.pairs, label: t.label, total: t.price, best: /best|popular/i.test(t.badge || '') }))]
    : [{ q: 1, label: 'Single', total: p.now, best: false }];
  const selected = packOptions.find((o) => o.q === packQ) || packOptions[0];
  const perUnit = Math.round(selected.total / selected.q);
  const total = selected.total * qty;
  const thumbs = (p.images && p.images.length ? p.images : p.colors.map((c) => c.img).filter(Boolean));

  const add = (buyNow) => {
    // A pack of N pairs adds N units at the per-unit pack price; the qty stepper
    // multiplies packs. Same group-pricing idea as the live store.
    addItem({ id: p.id, name: p.name, brand: p.brand, color: color?.name || '', size, pack: selected.label, packq: selected.q, unit: perUnit, img: color?.img || mainImg || p.img }, selected.q * qty);
    if (buyNow) router.push('/test/cart');
    else { toast('Added to cart ✓'); window.dispatchEvent(new CustomEvent('cc-test-opencart')); }
  };

  return (
    <TestLayout>
      <Head><title>{p.name} — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="wrap">
        <div className="crumbs" style={{ paddingTop: 20 }}>
          <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / <span style={{ cursor: 'pointer' }} onClick={() => router.push('/test/shop')}>Shop</span> / {p.name}
        </div>

        <div className="pd">
          <div className="gallery">
            <div className="gmain" style={{ overflow: 'hidden' }}><Thumb src={mainImg} color={color?.name} /></div>
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
            <div className="prow"><span className="now">{inr(p.now)}</span>{p.was > p.now && <span className="was">{inr(p.was)}</span>}{p.off > 0 && <span className="off">{p.off}% OFF</span>}</div>
            <div className="tax">Inclusive of all taxes · Free shipping over ₹799</div>

            {p.colors.length > 0 && (<>
              <div className="optlabel">Colour — <span style={{ color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>{color?.name}</span></div>
              <div className="swatches">
                {p.colors.map((c) => (
                  <button key={c.name} className={`sw${c.name === color?.name ? ' on' : ''}`} title={c.name} style={{ background: c.hex }} onClick={() => { setColor(c); if (c.img) setMainImg(c.img); }} />
                ))}
              </div>
            </>)}

            {p.sizes.length > 0 && (<>
              <div className="optlabel">Size <a onClick={() => toast('Pick the size that matches your usual fit.')}>Size chart</a></div>
              <div className="sizes">{p.sizes.map((s) => <button key={s} className={`size${s === size ? ' on' : ''}`} onClick={() => setSize(s)}>{s}</button>)}</div>
            </>)}

            {packOptions.length > 1 && (<>
              <div className="optlabel">Pack &amp; save</div>
              <div className="packs">
                {packOptions.map((o) => {
                  const save = Math.max(0, Math.round(p.now * o.q - o.total));
                  return (
                    <div key={o.q} className={`pack${o.q === packQ ? ' on' : ''}`} onClick={() => setPackQ(o.q)}>
                      {o.best && <span className="tagbest">MOST POPULAR</span>}
                      <span className="radio" /><div><b>{o.label}</b><div className="d">{o.q === 1 ? 'Single pair' : `${o.q} pairs${save > 0 ? ` · ${inr(Math.round(o.total / o.q))}/pair` : ''}`}</div></div>
                      <div className="pp"><div className="pnow">{inr(o.total)}</div>{save > 0 ? <div className="psave">save {inr(save)}</div> : <div className="psave">&nbsp;</div>}</div>
                    </div>
                  );
                })}
              </div>
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
              {ACC.map(([q, a], i) => (
                <div className={`acc__i${acc === i ? ' open' : ''}`} key={q}>
                  <button className="acc__q" onClick={() => setAcc(acc === i ? -1 : i)}>{q}<span className="pm2">{acc === i ? '–' : '+'}</span></button>
                  <div className="acc__a" style={{ maxHeight: acc === i ? 400 : 0 }}><div>{a}</div></div>
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
            <div className="revgrid">
              {prodReviews.items.slice(0, 6).map((r, i) => (
                <div className="rev" key={i}>
                  <div className="stars">{'★★★★★'.slice(0, Math.max(1, Math.round(r.rating)))}</div>
                  <p>&ldquo;{r.text}&rdquo;</p>
                  <div className="who"><div className="av" style={{ background: AVBG[i % AVBG.length] }}>{initials(r.name)}</div><div><b>{r.name}</b><span>VERIFIED</span></div></div>
                </div>
              ))}
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

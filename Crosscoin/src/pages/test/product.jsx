import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, Thumb, toast } from '../../components/test/ui';
import { PACKS, inr } from '../../components/test/data';
import { fetchProduct, fetchProducts } from '../../components/test/real';
import { addItem } from '../../components/test/store';

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
  const [pack, setPack] = useState(PACKS[0]);
  const [qty, setQty] = useState(1);
  const [acc, setAcc] = useState(0);
  const [mainImg, setMainImg] = useState('');

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
          setColor(c0); setSize(prod.sizes?.[0] || ''); setPack(PACKS[0]); setQty(1);
          setMainImg(c0?.img || prod.img || prod.images?.[0] || '');
        }
        fetchProducts({ limit: 12 }).then((l) => { if (!off) setAlso(l.filter((x) => x.slug !== slug).slice(0, 6)); }).catch(() => {});
      } catch (_) { if (!off) setP(null); }
      finally { if (!off) setLoading(false); }
    })();
    return () => { off = true; };
  }, [router.query.slug]);

  if (loading) return <TestLayout><Head><meta name="robots" content="noindex, nofollow" /></Head><div className="wrap"><p className="mono" style={{ color: 'var(--ink-faint)', padding: '60px 0', fontSize: 13 }}>Loading product…</p></div></TestLayout>;
  if (!p) return <TestLayout><Head><meta name="robots" content="noindex, nofollow" /></Head><div className="wrap"><p className="mono" style={{ padding: '60px 0', fontSize: 13 }}>Product not found. <a style={{ color: 'var(--crimson)', cursor: 'pointer' }} onClick={() => router.push('/test/shop')}>Back to shop</a></p></div></TestLayout>;

  const unit = Math.round(p.now * pack.mult);
  const total = unit * qty;
  const thumbs = (p.images && p.images.length ? p.images : p.colors.map((c) => c.img).filter(Boolean));

  const add = (buyNow) => {
    addItem({ id: p.id, name: p.name, brand: p.brand, color: color?.name || '', size, pack: pack.label, packq: pack.q, unit, img: color?.img || mainImg || p.img }, qty);
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

            <div className="optlabel">Pack &amp; save</div>
            <div className="packs">
              {PACKS.map((pk) => {
                const price = Math.round(p.now * pk.mult);
                return (
                  <div key={pk.q} className={`pack${pk.q === pack.q ? ' on' : ''}`} onClick={() => setPack(pk)}>
                    {pk.best && <span className="tagbest">MOST POPULAR</span>}
                    <span className="radio" /><div><b>{pk.label}</b><div className="d">{pk.d}{pk.save ? ` · save ${pk.save}%` : ''}</div></div>
                    <div className="pp"><div className="pnow">{inr(price)}</div>{pk.save ? <div className="psave">{inr(p.now * pk.q - price)} off</div> : <div className="psave">&nbsp;</div>}</div>
                  </div>
                );
              })}
            </div>

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

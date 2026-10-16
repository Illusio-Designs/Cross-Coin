import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, mintStyle, toast } from '../../components/test/ui';
import { PRODUCTS, SIZES, PACKS, inr, productById } from '../../components/test/data';
import { addItem } from '../../components/test/store';

const ACC = [
  ['Description', 'Knit from long-staple combed cotton with a knit-in arch band and a hand-linked seamless toe. Breathable mesh instep, reinforced heel and a stay-up cuff. Minted to a standard, not a price point.'],
  ['Materials & care', '80% combed cotton, 17% polyamide, 3% elastane. Machine wash cold, inside out. Do not bleach. Tumble dry low. Will not lose its shape.'],
  ['Shipping & returns', 'Ships in 24h. Free shipping over ₹799. 7-day easy returns with free pickup, refund to original method or store credit.'],
];

export default function TestProduct() {
  const router = useRouter();
  const p = productById(router.query.id);
  const [color, setColor] = useState(p.colors[0]);
  const [size, setSize] = useState('M');
  const [pack, setPack] = useState(PACKS[0]);
  const [qty, setQty] = useState(1);
  const [acc, setAcc] = useState(0);

  // Reset options when the product id changes (client nav to another PDP).
  useEffect(() => { setColor(p.colors[0]); setSize('M'); setPack(PACKS[0]); setQty(1); }, [p.id]);

  const unit = Math.round(p.now * pack.mult);
  const total = unit * qty;
  const also = PRODUCTS.filter((x) => x.id !== p.id).slice(0, 6);

  const add = (buyNow) => {
    addItem({ id: p.id, name: p.name, brand: p.brand, color, size, pack: pack.label, packq: pack.q, unit }, qty);
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
            <div className="gmain"><span className="mint" style={{ width: '62%', aspectRatio: '1', borderRadius: '50%', boxShadow: 'inset 0 0 0 3px rgba(255,255,255,.3), inset 0 0 0 14px rgba(0,0,0,.08)', ...mintStyle(color) }} /><div style={{ position: 'absolute', inset: '16%', borderRadius: '50%', border: '2px dashed rgba(0,0,0,.12)' }} /></div>
            <div className="gthumbs">
              {p.colors.map((c) => (
                <button key={c} className={`gthumb${c === color ? ' on' : ''}`} onClick={() => setColor(c)}><span className="mint" style={mintStyle(c)} /></button>
              ))}
            </div>
          </div>

          <div className="buy">
            <div className="kl">{p.brand}</div>
            <h1>{p.name}</h1>
            <div className="stars">★★★★★ <small>{p.rating} ({p.revs})</small></div>
            <div className="prow"><span className="now">{inr(p.now)}</span><span className="was">{inr(p.was)}</span><span className="off">{p.off}% OFF</span></div>
            <div className="tax">Inclusive of all taxes · Free shipping over ₹799</div>

            <div className="optlabel">Colour — <span style={{ color: 'var(--ink)', textTransform: 'none', letterSpacing: 0 }}>{color}</span></div>
            <div className="swatches">{p.colors.map((c) => <button key={c} className={`sw${c === color ? ' on' : ''}`} title={c} style={mintStyle(c)} onClick={() => setColor(c)} />)}</div>

            <div className="optlabel">Size <a onClick={() => toast('Size chart: S 6-7 · M 7-9 · L 9-11 · XL 11-13 (UK)')}>Size chart</a></div>
            <div className="sizes">{SIZES.map((s) => { const off = s === 'XL'; return <button key={s} className={`size${s === size ? ' on' : ''}${off ? ' off' : ''}`} disabled={off} onClick={() => !off && setSize(s)}>{s}</button>; })}</div>

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

        <section className="block" style={{ paddingTop: 20 }}>
          <div className="sechead"><div><span className="eyebrow">Also minted</span><h2>You may also like</h2></div></div>
          <div className="prail">{also.map((x) => <ProductCard key={x.id} p={x} />)}</div>
        </section>
      </div>
    </TestLayout>
  );
}

import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, toast } from '../../components/test/ui';
import { FAQS } from '../../components/test/data';
import { fetchProducts, fetchCategories } from '../../components/test/real';

const SWATCH = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a'];

export default function TestHome() {
  const router = useRouter();
  const [open, setOpen] = useState(0);
  const [rail, setRail] = useState([]);
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    Promise.all([fetchProducts({ limit: 8 }), fetchCategories()])
      .then(([prods, categories]) => { if (off) return; setRail(prods.slice(0, 6)); setCats(categories.slice(0, 6)); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  return (
    <TestLayout>
      <Head><title>CrossCoin — Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      {/* hero */}
      <section className="hero">
        <div className="wrap">
          <div>
            <span className="tagpill"><i>DROP 04</i> The Winter Mint is live</span>
            <h1>Everyday<br />essentials, <em className="ul">minted</em><br />to last.</h1>
            <p className="lede">Honest basics struck like coins — built to a standard, priced without the markup. Socks, knitwear and more, one friendly checkout.</p>
            <div className="cta">
              <button className="btn btn--crimson btn--lg" onClick={() => router.push('/test/shop')}>Shop the mint {I.arrow()}</button>
              <button className="btn btn--lg" onClick={() => router.push('/test/shop')}>Bestsellers</button>
            </div>
            <div className="denoms">
              <div className="denom"><div className="n">60k+</div><div className="l">Minted orders</div></div>
              <div className="denom"><div className="n">4.8★</div><div className="l">Avg rating</div></div>
              <div className="denom"><div className="n">7-day</div><div className="l">Easy returns</div></div>
            </div>
          </div>
          <div className="hero__art">
            <div className="hero__coin"><span>₹</span></div>
            <div className="hero__chip c1">LEGAL TENDER · COMFORT</div>
            <div className="hero__chip c2">↑ FREE SHIP ₹799+</div>
            <div className="hero__chip c3">EST. 2021 · INDIA</div>
          </div>
        </div>
      </section>

      {/* category index */}
      <section className="block" id="categories">
        <div className="wrap">
          <div className="sechead"><div><span className="eyebrow">[ 01 ] Denominations</span><h2>Shop by category</h2></div>
            <span className="seelink" onClick={() => router.push('/test/shop')}>Browse all →</span></div>
          <div className="catlist">
            {cats.length === 0 && <div className="catrow" style={{ color: 'var(--ink-faint)' }}><span className="no">—</span><h3 style={{ fontSize: 20 }}>{loading ? 'Loading categories…' : 'No categories'}</h3></div>}
            {cats.map((c, i) => (
              <div className="catrow" key={c.id || c.name} onClick={() => router.push(`/test/shop?cat=${encodeURIComponent(c.name)}`)}>
                <span className="no">0{i + 1}</span><h3>{c.name}</h3><span className="ct">{c.count != null ? `${c.count} styles` : ''}</span>
                <span className="swatch" style={{ background: SWATCH[i % SWATCH.length] }} />
                <span className="arw">{I.arrow(16)}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* bestsellers */}
      <section className="block" id="bestsellers" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sechead"><div><span className="eyebrow">[ 02 ] In circulation</span><h2>Bestsellers</h2></div>
            <span className="seelink" onClick={() => router.push('/test/shop')}>See all →</span></div>
          <div className="prail">
            {loading && rail.length === 0
              ? <div className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '20px 2px' }}>Loading products…</div>
              : rail.map((p) => <ProductCard key={p.id} p={p} />)}
          </div>
        </div>
      </section>

      {/* technologies */}
      <section className="tech">
        <div className="wrap">
          <div className="sechead" style={{ marginBottom: 0 }}><div><span className="eyebrow" style={{ color: 'var(--gold)' }}>[ 03 ] The standard</span><h2>Struck to spec</h2></div></div>
          <div className="techgrid">
            {[
              ['Combed cotton', 'Long-staple yarn that stays soft wash after wash.'],
              ['Arch support', 'Knit-in compression band that hugs the mid-foot.'],
              ['Breathable mesh', 'Ventilated instep keeps feet dry all day.'],
              ['Seamless toe', 'Hand-linked toe seam — no rub, no blisters.'],
            ].map(([t, d]) => (
              <div className="techcard" key={t}><div className="mk">{I.shield(22)}</div><b>{t}</b><span>{d}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* reviews */}
      <section className="block">
        <div className="wrap">
          <div className="sechead"><div><span className="eyebrow">[ 04 ] Vault notes</span><h2>What shoppers say</h2></div><div className="idx">4.8 / 5 · 2,140 reviews</div></div>
          <div className="revgrid">
            {[
              ['Aarav R.', 'MUMBAI · VERIFIED', '#ce1e36', '"Unreasonably comfortable. The arch band is the real deal — ordered four more packs the same week."'],
              ['Simran I.', 'DELHI · VERIFIED', '#180d3e', '"Quality feels well above the price and the pack deal is great value. Returns were genuinely painless."'],
              ['Karthik M.', 'BENGALURU · VERIFIED', '#0f766e', '"Clean site, fast COD and the socks actually last. This is my default now."'],
            ].map(([who, loc, bg, text]) => (
              <div className="rev" key={who}><div className="stars">★★★★★</div><p>{text}</p>
                <div className="who"><div className="av" style={{ background: bg }}>{who.slice(0, 2)}</div><div><b>{who}</b><span>{loc}</span></div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* journal */}
      <section className="block" id="journal" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sechead"><div><span className="eyebrow">[ 05 ] The ledger</span><h2>Journal</h2></div><span className="seelink">Read more →</span></div>
          <div className="jgrid">
            {[
              ['Guide', 'How to build a sock drawer that actually lasts', 'linear-gradient(150deg,#ffd7dd,#ffbac4)'],
              ['Materials', 'Merino vs cotton: what to wear this winter', 'linear-gradient(150deg,#d7cff2,#bcb0e8)'],
              ['Care', 'Five habits that double the life of your knits', 'linear-gradient(150deg,#cdeee6,#aee0d3)'],
            ].map(([m, t, bg]) => (
              <a className="post" key={t}><div className="post__img" style={{ background: bg }} /><div className="post__b"><div className="m">{m}</div><h3>{t}</h3></div></a>
            ))}
          </div>
        </div>
      </section>

      {/* faq */}
      <section className="block" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sechead" style={{ justifyContent: 'center', textAlign: 'center' }}><div><span className="eyebrow">[ 06 ] Fine print</span><h2>Questions, answered</h2></div></div>
          <div className="faq">
            {FAQS.map(([q, a], i) => (
              <div className={`qa${open === i ? ' open' : ''}`} key={q}>
                <button className="qa__q" onClick={() => setOpen(open === i ? -1 : i)}>{q}<span className="pm"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span></button>
                <div className="qa__a" style={{ maxHeight: open === i ? 300 : 0 }}><div>{a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* mint club */}
      <section className="block" style={{ paddingTop: 0 }}>
        <div className="wrap"><div className="mint">
          <span className="eyebrow" style={{ color: '#ffd3d9' }}>Join the mint club</span>
          <h2>Get ₹100 off your first strike</h2>
          <p>Early access to drops, members-only prices and the occasional good story. No spam, unsubscribe anytime.</p>
          <form className="mintform" onSubmit={(e) => { e.preventDefault(); toast('You’re in — ₹100 off on its way'); e.currentTarget.reset(); }}>
            <input type="email" placeholder="you@email.com" aria-label="Email" required /><button className="btn" type="submit">Subscribe</button>
          </form>
        </div></div>
      </section>
    </TestLayout>
  );
}

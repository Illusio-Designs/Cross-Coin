import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, toast, SkeletonCards } from '../../components/test/ui';
import { fetchProducts, fetchCategories, fetchReviews, fetchCoupons, fetchFaqs, fetchBlogs, fetchSliders } from '../../components/test/real';

const SWATCH = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a'];
const AVBG = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a', '#6d28d9'];
const GRADS = ['linear-gradient(150deg,#ffd7dd,#ffbac4)', 'linear-gradient(150deg,#d7cff2,#bcb0e8)', 'linear-gradient(150deg,#cdeee6,#aee0d3)'];
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

export default function TestHome() {
  const router = useRouter();
  const [open, setOpen] = useState(0);
  const [rail, setRail] = useState([]);
  const [cats, setCats] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [deal, setDeal] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [slide, setSlide] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let off = false;
    Promise.all([fetchProducts({ limit: 8 }), fetchCategories(), fetchReviews(12), fetchCoupons(), fetchBlogs(3), fetchFaqs(), fetchSliders()])
      .then(([prods, categories, revs, coupons, posts, realFaqs, sliders]) => {
        if (off) return;
        setRail(prods.slice(0, 6)); setCats(categories.slice(0, 6));
        setReviews(revs.slice(0, 10)); setDeal(coupons[0] || null);
        setBlogs(posts); setFaqs(realFaqs);
        setSlide(sliders[0] || null);
      })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, []);

  return (
    <TestLayout>
      <Head><title>CrossCoin — Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      {/* hero — real banner/slider when the live store has one, else the Mint art */}
      <section className="hero">
        <div className="wrap">
          <div>
            {loading ? (
              <>
                <div className="cc-skel cc-skelblock" style={{ height: 24, width: 220, marginBottom: 18 }} aria-hidden="true" />
                <div className="cc-skel cc-skelblock" style={{ height: 48, width: '92%', marginBottom: 12 }} aria-hidden="true" />
                <div className="cc-skel cc-skelblock" style={{ height: 48, width: '70%', marginBottom: 18 }} aria-hidden="true" />
                <div className="cc-skel cc-skelblock" style={{ height: 16, width: '85%', marginBottom: 8 }} aria-hidden="true" />
                <div className="cc-skel cc-skelblock" style={{ height: 16, width: '60%', marginBottom: 22 }} aria-hidden="true" />
              </>
            ) : (<>
            <span className="tagpill"><i>DROP 04</i> {slide?.catName || 'The Winter Mint is live'}</span>
            {slide?.title
              ? <h1>{slide.title}</h1>
              : <h1>Everyday<br />essentials, <em className="ul">minted</em><br />to last.</h1>}
            <p className="lede">{slide?.description || 'Honest basics struck like coins — built to a standard, priced without the markup. Socks, knitwear and more, one friendly checkout.'}</p>
            </>)}
            <div className="cta">
              <button className="btn btn--crimson btn--lg" onClick={() => router.push(slide?.catName ? `/test/shop?cat=${encodeURIComponent(slide.catName)}` : '/test/shop')}>{slide?.cta || 'Shop the mint'} {I.arrow()}</button>
              <button className="btn btn--lg" onClick={() => router.push('/test/shop')}>Bestsellers</button>
            </div>
            <div className="denoms">
              <div className="denom"><div className="n">60k+</div><div className="l">Minted orders</div></div>
              <div className="denom"><div className="n">4.8★</div><div className="l">Avg rating</div></div>
              <div className="denom"><div className="n">7-day</div><div className="l">Easy returns</div></div>
            </div>
          </div>
          {loading
            ? <div className="hero__art hero__art--banner cc-skel" aria-hidden="true" />
            : slide?.img
            ? <div className="hero__art hero__art--banner"><img src={slide.img} alt={slide.title || 'CrossCoin'} /></div>
            : (
              <div className="hero__art">
                <div className="hero__coin"><span>₹</span></div>
                <div className="hero__chip c1">LEGAL TENDER · COMFORT</div>
                <div className="hero__chip c2">↑ FREE SHIP ₹799+</div>
                <div className="hero__chip c3">EST. 2021 · INDIA</div>
              </div>
            )}
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
              ? <SkeletonCards n={6} />
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
              ['Combed cotton', 'Long-staple yarn that stays soft wash after wash.', I.box],
              ['Arch support', 'Knit-in compression band that hugs the mid-foot.', I.shield],
              ['Breathable mesh', 'Ventilated instep keeps feet dry all day.', I.ret],
              ['Seamless toe', 'Hand-linked toe seam — no rub, no blisters.', I.check],
            ].map(([t, d, ic]) => (
              <div className="techcard" key={t}><div className="mk">{ic(24)}</div><b>{t}</b><span>{d}</span></div>
            ))}
          </div>
        </div>
      </section>

      {/* reviews — real store reviews, auto-scrolling marquee (Morbix-style) */}
      {reviews.length > 0 && (
        <section className="block">
          <div className="wrap"><div className="sechead"><div><span className="eyebrow">[ 04 ] Vault notes</span><h2>What shoppers say</h2></div></div></div>
          <div className="revscroll">
            {[0, 1, 2].map((row) => {
              // Rotate each row's start so the three tracks show different
              // reviews; duplicate the row so the marquee loops seamlessly.
              const rotated = [...reviews.slice(row), ...reviews.slice(0, row)];
              const cards = [...rotated, ...rotated];
              return (
                <div className={`revscroll__track${row === 1 ? ' revscroll__track--rev' : ''}`} key={row}>
                  {cards.map((r, i) => (
                    <div className="rev" key={i}>
                      <div className="stars">{'★★★★★'.slice(0, Math.max(1, Math.round(r.rating)))}</div>
                      <p>&ldquo;{r.text}&rdquo;</p>
                      <div className="who"><div className="av" style={{ background: AVBG[(row + i) % AVBG.length] }}>{initials(r.name)}</div><div><b>{r.name}</b><span>{r.loc ? `${r.loc} · ` : ''}VERIFIED</span></div></div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* journal — real blog posts */}
      {blogs.length > 0 && (
        <section className="block" id="journal" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sechead"><div><span className="eyebrow">[ 05 ] The ledger</span><h2>Journal</h2></div></div>
            <div className="jgrid">
              {blogs.map((b, i) => (
                <a className="post" key={b.slug || i} onClick={() => b.slug && router.push(`/test/blog/${encodeURIComponent(b.slug)}`)} style={{ cursor: b.slug ? 'pointer' : 'default' }}>
                  <div className="post__img" style={{ background: GRADS[i % GRADS.length], overflow: 'hidden' }}>{b.img && <img src={b.img} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}</div>
                  <div className="post__b"><div className="m">{b.tag}</div><h3>{b.title}</h3></div>
                </a>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* faq — real global FAQs only */}
      {faqs.length > 0 && (
      <section className="block" id="faq" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sechead" style={{ justifyContent: 'center', textAlign: 'center' }}><div><span className="eyebrow">[ 06 ] Fine print</span><h2>Questions, answered</h2></div></div>
          <div className="faq">
            {faqs.map(([q, a], i) => (
              <div className={`qa${open === i ? ' open' : ''}`} key={q}>
                <button className="qa__q" onClick={() => setOpen(open === i ? -1 : i)}>{q}<span className="pm"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg></span></button>
                <div className="qa__a" style={{ maxHeight: open === i ? 300 : 0 }}><div>{a}</div></div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

    </TestLayout>
  );
}

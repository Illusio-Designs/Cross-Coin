import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { ProductCard, I, toast, SkeletonCards, Thumb, Sk, SkBusy, CatTileSkeletons, PostCardSkeletons, ReviewCardSkeletons } from '../../components/test/ui';
import { fetchProducts, fetchCategories, fetchReviews, fetchCoupons, fetchFaqs, fetchBlogs, fetchSliders } from '../../components/test/real';
import { BENEFITS } from '../../components/test/data';
import { HERO_WIDTHS, HERO_SIZES } from '../../utils/imageUtils';
import { R, shopUrl } from '../../components/test/routes';

const AVBG = ['#ce1e36', '#180d3e', '#0f766e', '#c9a25a', '#6d28d9'];
const GRADS = ['linear-gradient(150deg,#ffd7dd,#ffbac4)', 'linear-gradient(150deg,#d7cff2,#bcb0e8)', 'linear-gradient(150deg,#cdeee6,#aee0d3)'];
const initials = (n) => (n || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();

// Map the server-fetched home payload (raw API shape, passed from the live
// route's getServerSideProps) into the shapes the Mint home renders, so the
// hero + category tiles ship in the SSR HTML instead of only after a client
// fetch. Everything else still hydrates/refreshes client-side.
const seedHome = (d) => {
  const s = d?.slides?.[0];
  const slide = s ? {
    img: s.image || s.imageUrl || s.image_url || '',
    title: s.title || '',
    description: s.description || s.subtitle || '',
    cta: s.buttonText || s.button_text || s.cta || '',
    catName: s.categoryName || s.category_name || (s.category && s.category.name) || '',
  } : null;
  const cats = (d?.categories || []).slice(0, 6).map((c) => ({
    id: c.id, name: c.name, img: c.image || c.imageUrl || c.image_url || '',
  }));
  return { slide, cats };
};

export default function TestHome({ preview = true, initialData = null }) {
  const router = useRouter();
  const seed = seedHome(initialData);
  const [open, setOpen] = useState(0);
  const [rail, setRail] = useState([]);
  const [cats, setCats] = useState(seed.cats);
  const [reviews, setReviews] = useState([]);
  const [deal, setDeal] = useState(null);
  const [blogs, setBlogs] = useState([]);
  const [faqs, setFaqs] = useState([]);
  const [slide, setSlide] = useState(seed.slide);
  // When the live route seeded SSR data, render the hero/categories straight
  // away; otherwise (the /test preview) start in the loading state as before.
  const [loading, setLoading] = useState(!seed.slide);
  // The client fetch below fills the rails/reviews/journal even when the hero
  // was seeded, so they show skeletons until it settles.
  const [fetched, setFetched] = useState(false);

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
      .finally(() => { if (!off) { setLoading(false); setFetched(true); } });
    return () => { off = true; };
  }, []);

  return (
    <TestLayout>
      {preview && <Head><title>CrossCoin — Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>}

      {/* hero — real banner/slider when the live store has one, else the Mint art */}
      <section className="hero">
        <div className="wrap">
          <div className="hero__copy">
            {loading ? (
              <SkBusy label="Loading the latest drop…">
                <Sk w={240} h={32} style={{ marginBottom: 18 }} />
                <Sk w="92%" h="clamp(40px, 7vw, 78px)" style={{ marginBottom: 10 }} />
                <Sk w="70%" h="clamp(40px, 7vw, 78px)" style={{ marginBottom: 22 }} />
                <Sk w="85%" h={16} style={{ marginBottom: 9 }} />
                <Sk w="60%" h={16} style={{ marginBottom: 28 }} />
              </SkBusy>
            ) : (<>
            <span className="tagpill"><i>DROP 04</i> <span className="tagpill__t">{slide?.catName || 'The Winter Mint is live'}</span></span>
            {slide?.title
              ? <h1>{slide.title}</h1>
              : <h1>Everyday<br />essentials, <em className="ul">minted</em><br />to last.</h1>}
            <p className="lede">{slide?.description || 'Honest basics struck like coins — built to a standard, priced without the markup. Socks, knitwear and more, one friendly checkout.'}</p>
            </>)}
            <div className="cta">
              <button className="btn btn--crimson btn--lg" onClick={() => router.push(slide?.catName ? shopUrl(slide.catName) : R.shop)}>{slide?.cta || 'Shop the mint'} {I.arrow()}</button>
              <button className="btn btn--lg" onClick={() => router.push(R.shop)}>Bestsellers</button>
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
            ? <div className="hero__art hero__art--banner"><Thumb src={slide.img} alt={slide.title || 'CrossCoin'} w={1600} widths={HERO_WIDTHS} sizes={HERO_SIZES} priority /></div>
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
            <span className="seelink" onClick={() => router.push(R.shop)}>Browse all →</span></div>
          <div className="catgrid" {...(loading && cats.length === 0 ? { role: 'status', 'aria-busy': true } : {})}>
            {loading && cats.length === 0 && <span className="sr-only">Loading categories…</span>}
            {loading && cats.length === 0
              ? <CatTileSkeletons n={6} />
              : cats.map((c) => (
                <button className="cattile" key={c.id || c.name} onClick={() => router.push(shopUrl(c.name))}>
                  <span className="cattile__img"><Thumb src={c.img} w={600} /></span>
                  <span className="cattile__bar"><b>{c.name.replace(/^Cross ?Coin®?\s*/i, '')}</b><span className="cattile__ar">{I.arrow(16)}</span></span>
                </button>
              ))}
          </div>
        </div>
      </section>

      {/* bestsellers */}
      <section className="block" id="bestsellers" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sechead"><div><span className="eyebrow">[ 02 ] In circulation</span><h2>Bestsellers</h2></div>
            <span className="seelink" onClick={() => router.push(R.shop)}>See all →</span></div>
          {!fetched && rail.length === 0
            ? <SkBusy className="prail" label="Loading bestsellers…"><SkeletonCards n={6} /></SkBusy>
            : <div className="prail">{rail.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
        </div>
      </section>

      {/* the standard — image-based benefit grid (real product photos in gold rings) */}
      <section className="tech">
        <div className="wrap">
          <div className="benefithead">
            <span className="eyebrow" style={{ color: 'var(--gold)' }}>[ 03 ] The standard</span>
            <h2>Comfort you feel every day</h2>
            <p>Everyday essentials, minted to a standard — soft, breathable and built to last, at an honest price.</p>
          </div>
          <div className="benefitgrid">
            {BENEFITS.map((b, i) => (
              <div className="benefit" key={b.t}>
                <span className="benefit__img"><Thumb src={rail[i]?.img} color={rail[i]?.colors?.[0]?.name} w={300} /></span>
                <b>{b.t}</b>
                <span className="benefit__d">{b.d}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* reviews — real store reviews, auto-scrolling marquee (Morbix-style) */}
      {!fetched && reviews.length === 0 && (
        <section className="block">
          <div className="wrap">
            <div className="sechead"><div><span className="eyebrow">[ 04 ] Vault notes</span><h2>What shoppers say</h2></div></div>
            <SkBusy className="revgrid" label="Loading reviews…"><ReviewCardSkeletons n={3} /></SkBusy>
          </div>
        </section>
      )}
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
        </section>
      )}

      {/* journal — real blog posts */}
      {!fetched && blogs.length === 0 && (
        <section className="block" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sechead"><div><span className="eyebrow">[ 05 ] The ledger</span><h2>Journal</h2></div></div>
            <SkBusy className="jgrid" label="Loading journal posts…"><PostCardSkeletons n={3} /></SkBusy>
          </div>
        </section>
      )}
      {blogs.length > 0 && (
        <section className="block" id="journal" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <div className="sechead"><div><span className="eyebrow">[ 05 ] The ledger</span><h2>Journal</h2></div></div>
            <div className="jgrid">
              {blogs.map((b, i) => (
                <a className="post" key={b.slug || i} onClick={() => b.slug && router.push(R.blog(b.slug))} style={{ cursor: b.slug ? 'pointer' : 'default' }}>
                  <div className="post__img" style={{ background: GRADS[i % GRADS.length], overflow: 'hidden' }}>{b.img && <Thumb src={b.img} w={600} />}</div>
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

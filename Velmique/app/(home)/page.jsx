import BrandIcon, { Gem, Leaf, Hourglass, Heart } from '@/components/ui/BrandIcon';
import ScentStudio from '@/components/home/ScentStudio';
import ShopByNotes from '@/components/home/ShopByNotes';
import Link from 'next/link';
import { getImageProps } from 'next/image';
import { getBestsellers, getPublicProducts, productNotes } from '@/lib/api/products';
import { getPackTiers } from '@/lib/api/bundles';
import { getAllReviews } from '@/lib/api/reviews';
import { getFaqs } from '@/lib/api/faqs';
import { getSeoOrg } from '@/lib/api/seo-org';
import { SITE_URL, absUrl, seoMeta } from '@/lib/site';
import { ik, ikSrcSet } from '@/lib/imagekit';
import ProductCard from '../_components/ProductCard';
import SkImg from '../_components/SkImg';
import FaqSection from '../_components/FaqSection';
import PdpMixPack from '../_components/PdpMixPack';

// Dashboard-controlled SEO ('home') over the page's own copy; the seo-org
// description / OG image fill in when the home row is empty.
export async function generateMetadata() {
  const org = await getSeoOrg();
  return seoMeta('home', {
    title: 'Velmique — Maison de Parfum',
    description: org?.description || 'Refined, handcrafted Indian fragrances for moments that stay with you.',
    path: '/',
    image: org?.ogImage || undefined,
  });
}

// Regenerate at most every minute (ISR): fast, but bestsellers/reviews/FAQs stay fresh.
export const revalidate = 60;

const stars = (r) => { const n = Math.round(Number(r) || 5); return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n); };

const AV = ['#b85f6e', '#866027', '#7a3b3f', '#4a6b4f', '#9a6b2e', '#6e4a7a'];
const HERO_SIZES = '(max-width: 740px) calc(100vw - 40px), (max-width: 1200px) 50vw, 600px';

function BundledPhoto({ src, sizes, alt, ...props }) {
  const { props: { src: optimizedSrc, srcSet } } = getImageProps({ src, sizes, alt, fill: true });
  return <SkImg src={optimizedSrc} srcSet={srcSet} sizes={sizes} alt={alt} {...props} />;
}

export default async function MaisonHome() {
  const [featured, catalog, reviewsRes, faqs, seoOrg, packTiers] = await Promise.all([
    getBestsellers(8).catch(() => []),
    getPublicProducts({ limit: 48 }),
    getAllReviews({ limit: 30 }).catch(() => null),
    getFaqs('global').catch(() => []),
    getSeoOrg().catch(() => null),
    getPackTiers(),
  ]);

  const noteProducts = catalog.products.length ? catalog.products : featured;
  const packProducts = noteProducts.filter((product) => product.inStock && product.defaultVariationId);
  const notesHref = noteProducts.some((product) => productNotes(product).length) ? '#shop-by-notes' : '/shop';

  // Organization (dashboard-controlled, hardcoded fallback) + WebSite with the
  // sitelinks search box pointing at /search.
  const jsonLd = [
    seoOrg?.organization || { '@context': 'https://schema.org', '@type': 'Organization', name: 'Velmique', url: SITE_URL, logo: absUrl('/logo.webp') },
    {
      '@context': 'https://schema.org', '@type': 'WebSite', name: 'Velmique', url: SITE_URL,
      potentialAction: {
        '@type': 'SearchAction',
        target: { '@type': 'EntryPoint', urlTemplate: `${SITE_URL}/search?q={search_term_string}` },
        'query-input': 'required name=search_term_string',
      },
    },
  ];

  // Hero spotlights the #1 bestseller as a live product card.
  const best = featured?.[0] || null;

  // Only published customer reviews are displayed.
  const reviews = (reviewsRes?.reviews || []).slice(0, 30);
  const renderReview = (v, i) => {
    const name = v.reviewerName || v.guestName || v.name || 'Customer';
    return (
      <div className="m-rev" key={v.id || i}>
        <div className="m-stars">{stars(v.rating)}</div>
        <q>{v.review || v.comment || ''}</q>
        <div className="m-rev__by">
          <span className="m-rev__av" style={{ background: AV[(typeof i === 'number' ? i : 0) % AV.length] }}>{name[0]}</span>
          <span><b>{name}</b>{v.verified_purchase ? <small><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>Verified Buyer</small> : null}</span>
        </div>
      </div>
    );
  };

  return (
    <>
      {jsonLd.map((obj, i) => (
        <script key={`ld-${i}`} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(obj).replace(/</g, '\\u003c') }} />
      ))}
      <section className="v-hero"><div className="m-wrap v-hero__inner">
        <div className="v-hero__copy">
          <span className="m-eyebrow">A little luxury. Entirely you.</span>
          <h1>Fragrances for<br /><em>Every Side of You</em></h1>
          <p>Modern, expressive and long-lasting<br />scents crafted for your everyday moods.</p>
          <div className="v-actions"><Link className="m-btn m-btn--fill" href="/shop">Shop Collection</Link></div>
        </div>
        <div className="v-hero__image">{best?.images?.[0] ? (
          <SkImg src={ik(best.images[1] || best.images[0], 1000)}
            srcSet={ikSrcSet(best.images[1] || best.images[0], [400, 640, 800, 1000, 1200])}
            sizes={HERO_SIZES}
            alt={best.name} loading="eager" fetchPriority="high" />
        ) : <BundledPhoto src="/FRAGRANCE.webp" sizes={HERO_SIZES} alt="Velmique fragrance collection" loading="eager" fetchPriority="high" />}
        <span>VELMIQUE<br /><small>YOUR EVERYDAY SIGNATURE</small></span></div>
      </div></section>
      <ShopByNotes products={noteProducts} />
      <div className="v-trust m-wrap">
        {[
          ['cash', 'COD', 'Available'],
          ['returns', 'Easy Returns', '7-day policy'],
          ['verified', '100% Authentic', 'Original fragrances'],
        ].map(([icon, title, subtitle]) => (
          <div key={title}>
            <span className="v-trust__icon"><BrandIcon name={icon} size={24} /></span>
            <p><b>{title}</b><small>{subtitle}</small></p>
          </div>
        ))}
      </div>
      <section className="v-section m-wrap" id="scent-studio"><div className="v-center"><span className="m-eyebrow">The Velmique Scent Studio</span><h2>Let’s Find Your Perfect Fragrance</h2><p>Not sure which perfume suits you? Discover it in a way that feels personal.</p></div><ScentStudio products={featured} notesHref={notesHref} /></section>
      <section className="v-section m-wrap" id="m-featured"><div className="v-heading"><div><h2>Our Signature Collection</h2><p>A curated range of modern fragrances, crafted to leave a lasting impression.</p></div><Link href="/shop">View All Fragrances →</Link></div>{featured.length ? <div className="m-pgrid">{featured.slice(0,4).map(p=><ProductCard key={p.id} product={p} />)}</div> : <p>Our collection is being bottled. Please check back shortly.</p>}</section>
      <div className="m-wrap">
        <PdpMixPack placement="home" scents={packProducts} tiers={packTiers} />
      </div>
      <section className="v-why"><BundledPhoto frameClassName="v-why__photo" src="/abouthero.webp" sizes="(max-width: 740px) 100vw, 33vw" alt="The world of Velmique" loading="lazy" /><div><h2><em>Why Choose Velmique?</em></h2><div className="v-pillars">{[[Leaf,'Thoughtfully Crafted Scents'],[Hourglass,'Long-Lasting Performance'],[Gem,'Premium Ingredients'],[Heart,'Modern & Versatile']].map(([Icon,t])=><div key={t}><Icon size={28} strokeWidth={1.2} aria-hidden="true"/><p>{t}</p></div>)}</div></div></section>
      {reviews.length ? <section className="v-section m-wrap"><div className="v-heading"><div><h2>Loved by Our Community</h2><p>Real people. Real experiences.</p></div></div><div className="v-reviews">{reviews.slice(0,3).map(renderReview)}</div></section> : null}

      <FaqSection faqs={faqs} />
    </>
  );
}

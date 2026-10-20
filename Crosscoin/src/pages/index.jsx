import Head from 'next/head';
import TestHome from './test/index';
import SeoWrapper from '../console/SeoWrapper';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import { getSeoOrg } from '../services/getSeoOrg';
import { ikTransform, ikSrcSet, HERO_WIDTHS, HERO_SIZES } from '../utils/imageUtils';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

async function fetchJson(url, timeoutMs = 3000) {
  // Cap how long SSR waits on the API. If a call is slow, abort and render the
  // page now (the client hydrates/fills the rest) instead of holding TTFB.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const r = await fetch(url, { headers: { 'X-Brand-Name': 'crosscoin' }, signal: controller.signal });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function getServerSideProps(ctx) {
  // Edge-cache the rendered homepage HTML on Vercel. Set this unconditionally
  // and up-front so it applies even when an API call is slow or aborts — the
  // helpers below only set it on success, which meant a slow API (our exact
  // problem) left the homepage uncached and re-running SSR on every hit. With
  // this, repeat visitors are served from Vercel's edge and never wait on the
  // cPanel API. Fresh 5 min, then served instantly from the edge (stale) for up
  // to a day while it revalidates in the background — so the slow cold render
  // is rare instead of happening whenever the short window lapsed.
  ctx.res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=86400'
  );

  // Fetch the SEO meta AND the above-the-fold content (hero slides, categories,
  // latest products) on the server, in parallel. Previously these were fetched
  // client-side in a useEffect, so the initial HTML shipped empty and the
  // hero/products only appeared after JS downloaded, hydrated, and made its own
  // round-trips — a client waterfall that wrecked LCP and left crawlers with a
  // blank shell. Now the LCP content is in the HTML the moment it loads.
  //
  // The homepage does not render any FAQ section (FAQs live on product pages),
  // so we no longer fetch page/global FAQs here — that removed two per-load API
  // round-trips that produced nothing visible.
  const [seoData, slidersJson, categoriesJson, latestJson, seoOrg] = await Promise.all([
    fetchPageSeo('home', ctx),
    fetchJson(`${API_URL}/api/sliders/listing`),
    fetchJson(`${API_URL}/api/categories/listing`),
    fetchJson(`${API_URL}/api/products/catalog?limit=15&sort=newest`),
    // Per-brand Organization JSON-LD. Best-effort: null when the API is down,
    // in which case SeoWrapper keeps emitting its default Organization block.
    getSeoOrg('crosscoin'),
  ]);

  const slides = slidersJson?.sliders || (Array.isArray(slidersJson) ? slidersJson : []) || [];
  const categories = categoriesJson?.categories || (Array.isArray(categoriesJson) ? categoriesJson : []) || [];
  const latestProducts = (latestJson?.success && latestJson?.data?.products) ? latestJson.data.products : [];

  const organizationLd = seoOrg?.organization || null;

  return {
    props: {
      seoData,
      organizationLd,
      // Best-effort brand-level fallbacks; SeoWrapper only uses these when the
      // page's own SeoMetadata doesn't already supply an image / description.
      orgOgImage: seoOrg?.ogImage || null,
      orgDescription: seoOrg?.description || null,
      initialData: { slides, categories, latestProducts },
    },
  };
}

export default function MainPage({ seoData, organizationLd = null, orgOgImage = null, orgDescription = null, initialData = {} }) {
  // Preload the first hero image (the LCP element). Since the slide markup is
  // in the SSR HTML, telling the browser to fetch this image at highest
  // priority before it parses the body shaves a big chunk off LCP.
  //
  // The preload must name exactly what the Mint hero <img> (Thumb in
  // pages/test/index.jsx) resolves to — same URL (seedHome reads the slide
  // image the same way), same ImageKit srcSet and sizes — or the browser would
  // download the hero twice. The Mint hero uses a single image for every
  // viewport (no separate mobile banner), so one preload covers all.
  const firstSlide = initialData?.slides?.[0];
  const heroImg = firstSlide ? (firstSlide.image || firstSlide.imageUrl || firstSlide.image_url || '') : '';
  const heroSrcSet = heroImg ? ikSrcSet(heroImg, HERO_WIDTHS) : undefined;

  return (
    <SeoWrapper
      pageName="home"
      seoData={seoData}
      organizationLd={organizationLd}
      fallbackOgImage={orgOgImage}
      fallbackDescription={orgDescription}
    >
      {heroImg && (
        <Head>
          <link
            rel="preload"
            as="image"
            href={ikTransform(heroImg, 1600)}
            imageSrcSet={heroSrcSet}
            imageSizes={heroSrcSet ? HERO_SIZES : undefined}
            fetchPriority="high"
          />
        </Head>
      )}
      {/* Mint storefront home. SSR here supplies SEO meta + Organization
          JSON-LD (via SeoWrapper) and the hero preload; the Mint home fetches
          its own above-the-fold content client-side. */}
      <TestHome preview={false} initialData={initialData} />
    </SeoWrapper>
  );
}

// Render with the Mint chrome (bare — no legacy Header/Footer/Breadcrumb).
MainPage.mintChrome = true;

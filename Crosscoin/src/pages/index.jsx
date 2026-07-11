import Head from 'next/head';
import Home from "./home";
import SeoWrapper from '../console/SeoWrapper';
import ProductFaqSection from '../components/common/ProductFaqSection';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import { fetchPageFaqs } from '../utils/fetchPageFaqs';
import { getHeroSrcSet } from '../utils/imageUtils';

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
  // Fetch the SEO/FAQ meta AND the above-the-fold content (hero slides,
  // categories, latest products) on the server, in parallel. Previously these
  // were fetched client-side in a useEffect, so the initial HTML shipped empty
  // and the hero/products only appeared after JS downloaded, hydrated, and made
  // its own round-trips — a client waterfall that wrecked LCP and left crawlers
  // with a blank shell. Now the LCP content is in the HTML the moment it loads.
  // The edge-cache header set by fetchPageSeo keeps this cheap at the CDN.
  const [seoData, faqs, slidersJson, categoriesJson, latestJson] = await Promise.all([
    fetchPageSeo('home', ctx),
    fetchPageFaqs('home', ctx),
    fetchJson(`${API_URL}/api/sliders/listing`),
    fetchJson(`${API_URL}/api/categories/listing`),
    fetchJson(`${API_URL}/api/products/catalog?limit=15&sort=newest`),
  ]);

  const slides = slidersJson?.sliders || (Array.isArray(slidersJson) ? slidersJson : []) || [];
  const categories = categoriesJson?.categories || (Array.isArray(categoriesJson) ? categoriesJson : []) || [];
  const latestProducts = (latestJson?.success && latestJson?.data?.products) ? latestJson.data.products : [];

  return {
    props: {
      seoData,
      pageFaqs: faqs.pageFaqs,
      globalFaqs: faqs.globalFaqs,
      initialData: { slides, categories, latestProducts },
    },
  };
}

export default function MainPage({ seoData, pageFaqs = [], globalFaqs = [], initialData = {} }) {
  // Preload the first hero image (the LCP element). Since the slide markup is
  // now in the SSR HTML, telling the browser to fetch this image at highest
  // priority before it parses the body shaves a big chunk off LCP — the same
  // benefit next/image's `priority` gives, without touching the hero layout.
  //
  // Preload the exact same srcSet HeroSlider builds (via the shared
  // getHeroSrcSet helper) so the preloaded candidate matches what the hero
  // <img srcSet sizes="…100vw"> resolves to — a mismatch would download the
  // hero twice. Both use the ImageKit-optimised widths for ImageKit sources.
  const firstSlide = initialData?.slides?.[0];
  const heroPreloadSrcSet = firstSlide ? getHeroSrcSet(firstSlide) : undefined;

  return (
    <SeoWrapper pageName="home" seoData={seoData}>
      {heroPreloadSrcSet && (
        <Head>
          <link
            rel="preload"
            as="image"
            href={firstSlide.image}
            imageSrcSet={heroPreloadSrcSet}
            imageSizes="100vw"
            fetchPriority="high"
          />
        </Head>
      )}
      <Home initialData={initialData} />
      {(pageFaqs.length > 0 || globalFaqs.length > 0) && (
        <section style={{ padding: '0 16px', maxWidth: 1200, margin: '0 auto' }}>
          <ProductFaqSection productFaqs={pageFaqs} globalFaqs={globalFaqs} />
        </section>
      )}
    </SeoWrapper>
  );
}

// Live /products route — Mint design on its canonical URL, with SSR SEO preserved:
// fetchPageSeo + SeoWrapper emit the server-rendered meta/canonical/JSON-LD;
// the Mint page renders the UI (and fetches its own content client-side).
import SeoWrapper from '../../console/SeoWrapper';
import { fetchPageSeo } from '../../utils/fetchPageSeo';
import TestShop from '../test/shop';

export async function getServerSideProps(ctx) {
  ctx.res?.setHeader?.('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  const seoData = await fetchPageSeo('products', ctx);
  return { props: { seoData } };
}

export default function TestShopLive({ seoData }) {
  return (
    <SeoWrapper pageName="products" seoData={seoData}>
      <TestShop preview={false} />
    </SeoWrapper>
  );
}
TestShopLive.mintChrome = true;

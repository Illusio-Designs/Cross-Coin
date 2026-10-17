// Live About route — Mint design on its canonical URL, with SSR SEO preserved:
// fetchPageSeo + SeoWrapper emit the server-rendered meta/canonical/JSON-LD;
// the Mint page renders the UI (and fetches its own content client-side).
import SeoWrapper from '../console/SeoWrapper';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import TestAbout from './test/about';

export async function getServerSideProps(ctx) {
  ctx.res?.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  const seoData = await fetchPageSeo('about', ctx);
  return { props: { seoData } };
}

export default function TestAboutLive({ seoData }) {
  return (
    <SeoWrapper pageName="about" seoData={seoData}>
      <TestAbout preview={false} />
    </SeoWrapper>
  );
}
TestAboutLive.mintChrome = true;

// Live Contact route — Mint design on its canonical URL, with SSR SEO preserved:
// fetchPageSeo + SeoWrapper emit the server-rendered meta/canonical/JSON-LD;
// the Mint page renders the UI (and fetches its own content client-side).
import SeoWrapper from '../console/SeoWrapper';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import TestContact from './test/contact';

export async function getServerSideProps(ctx) {
  ctx.res?.setHeader?.('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
  const seoData = await fetchPageSeo('contact', ctx);
  return { props: { seoData } };
}

export default function TestContactLive({ seoData }) {
  return (
    <SeoWrapper pageName="contact" seoData={seoData}>
      <TestContact preview={false} />
    </SeoWrapper>
  );
}
TestContactLive.mintChrome = true;

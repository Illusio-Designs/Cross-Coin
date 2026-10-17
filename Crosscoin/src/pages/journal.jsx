// Live journal route — Mint design on its canonical URL, with SSR SEO preserved:
// fetchPageSeo + SeoWrapper emit the server-rendered meta/canonical/JSON-LD;
// the Mint page renders the UI (and fetches its own content client-side).
import SeoWrapper from '../console/SeoWrapper';
import { fetchPageSeo } from '../utils/fetchPageSeo';
import TestJournal from './test/journal';

export async function getServerSideProps(ctx) {
  ctx.res?.setHeader?.('Cache-Control', 'no-store, max-age=0, must-revalidate');
  const seoData = await fetchPageSeo('blog', ctx);
  return { props: { seoData } };
}

export default function TestJournalLive({ seoData }) {
  return (
    <SeoWrapper pageName="blog" seoData={seoData}>
      <TestJournal preview={false} />
    </SeoWrapper>
  );
}
TestJournalLive.mintChrome = true;

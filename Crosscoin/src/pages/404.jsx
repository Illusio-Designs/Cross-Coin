import Head from 'next/head';
import { useRouter } from 'next/router';
import TestLayout from '../components/test/TestLayout';
import { I } from '../components/test/ui';
import { R } from '../components/test/routes';

export default function NotFound() {
  const router = useRouter();
  return (
    <TestLayout>
      <Head><title>Page not found — CrossCoin</title><meta name="robots" content="noindex, follow" /></Head>
      <section className="nf">
        <div className="wrap nf__in">
          <div className="nf__coin"><span>404</span></div>
          <span className="eyebrow">Off the ledger</span>
          <h1>This page isn&rsquo;t in circulation</h1>
          <p>The link may be broken or the page has been retired. Let&rsquo;s get you back to the good stuff.</p>
          <div className="nf__cta">
            <button className="btn btn--crimson btn--lg" onClick={() => router.push(R.home)}>{I.arrow()} Back home</button>
            <button className="btn btn--lg" onClick={() => router.push(R.shop)}>Shop the mint</button>
          </div>
        </div>
      </section>
    </TestLayout>
  );
}

// Render with the Mint chrome (bare — no legacy Header/Footer/Breadcrumb).
NotFound.mintChrome = true;

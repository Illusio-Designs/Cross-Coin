import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../../components/test/TestLayout';
import { fetchPolicy } from '../../../components/test/real';
import { richHtml } from '../../../utils/sanitizeHtml';

const TITLES = {
  'privacy-policy': 'Privacy Policy',
  'terms-and-conditions': 'Terms & Conditions',
  'shipping-policy': 'Shipping Policy',
  'cancellation-and-refund': 'Cancellation & Refund',
};

export default function TestPolicy() {
  const router = useRouter();
  const slug = typeof router.query.slug === 'string' ? router.query.slug : '';
  const [policy, setPolicy] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let off = false;
    setLoading(true);
    fetchPolicy(slug)
      .then((p) => { if (!off) setPolicy(p); })
      .catch(() => {})
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [slug]);

  const title = policy?.title || TITLES[slug] || 'Policy';

  return (
    <TestLayout>
      <Head><title>{title} — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / {title}</div>
          <h2 style={{ fontSize: 'clamp(26px,4.5vw,42px)', marginTop: 10 }}>{title}</h2>
        </div>
      </div>

      <div className="wrap" style={{ paddingBottom: 70, maxWidth: 820 }}>
        {loading
          ? <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>Loading…</p>
          : policy?.html
            ? <div className="legal" {...richHtml(policy.html)} />
            : <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 13, padding: '30px 0' }}>This policy isn&rsquo;t available right now.</p>}
      </div>
    </TestLayout>
  );
}

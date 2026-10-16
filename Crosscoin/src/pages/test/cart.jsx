import Head from 'next/head';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';

// The /test cart + checkout lives in the TestLayout drawer (it places REAL
// guest orders). This standalone route previously held a mock checkout, so it
// now just bounces to the homepage and opens the real drawer.
export default function TestCartRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/test');
    const t = setTimeout(() => { try { window.dispatchEvent(new CustomEvent('cc-test-opencart')); } catch (_) {} }, 250);
    return () => clearTimeout(t);
  }, []);
  return (
    <TestLayout>
      <Head><meta name="robots" content="noindex, nofollow" /></Head>
      <div className="wrap"><p className="mono" style={{ padding: '60px 0', fontSize: 13, color: 'var(--ink-faint)' }}>Opening your cart…</p></div>
    </TestLayout>
  );
}

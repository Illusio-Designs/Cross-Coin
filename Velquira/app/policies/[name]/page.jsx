import Link from 'next/link';
import { getPolicy } from '@/lib/api';

export const revalidate = 300;

// Keys are the real backend policy slugs (lowercased + hyphenated title), the
// same ones the other brands use — the /api/policies/name/:name endpoint
// matches by title, so a bare "returns" would NOT match "Cancellation and
// Refund". Older short slugs are kept as aliases so existing links don't 404.
const TITLES = {
  'privacy-policy': 'Privacy Policy',
  'terms-and-conditions': 'Terms & Conditions',
  'shipping-policy': 'Shipping & Delivery',
  'cancellation-and-refund': 'Cancellation & Refund',
  // legacy aliases
  privacy: 'Privacy Policy',
  terms: 'Terms & Conditions',
  shipping: 'Shipping & Delivery',
  returns: 'Cancellation & Refund',
  refund: 'Cancellation & Refund',
};

export async function generateMetadata({ params }) {
  const { name } = await params;
  return { title: TITLES[name] || 'Policy' };
}

// Strip dangerous nodes from backend-provided HTML before rendering.
function sanitize(html) {
  return String(html || '')
    .replace(/<\/?(script|style)[^>]*>/gi, '')
    .replace(/ on\w+="[^"]*"/gi, '')
    .replace(/ on\w+='[^']*'/gi, '')
    .replace(/javascript:/gi, '');
}

// Coerce any backend value to a string safe to render / sanitize.
function str(v) {
  if (v == null) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'object') return str(v.html ?? v.content ?? v.value ?? v.text ?? '');
  return '';
}

export default async function PolicyPage({ params }) {
  const { name } = await params;
  const policy = await getPolicy(name);
  const title = str(policy?.title || policy?.name) || TITLES[name] || 'Policy';
  const content = str(
    policy?.content ?? policy?.body ?? policy?.html ?? policy?.description ?? policy?.policy_content ?? policy?.text
  );

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 50 }}>
      <div className="page-hero">
        <span className="eyebrow">Policy</span>
        <h1>{title}</h1>
      </div>

      <div className="article-body" style={{ marginTop: 20, maxWidth: 780 }}>
        {content ? (
          <div dangerouslySetInnerHTML={{ __html: sanitize(content) }} />
        ) : (
          <p className="muted">
            This policy isn’t available right now. Please <Link href="/contact" style={{ color: 'var(--navy)', fontWeight: 600 }}>contact us</Link> if you need details.
          </p>
        )}
      </div>
    </div>
  );
}

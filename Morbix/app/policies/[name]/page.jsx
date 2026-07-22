import Link from 'next/link';
import { getPolicy } from '@/lib/api';

export const revalidate = 300;

const TITLES = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
  shipping: 'Shipping & Delivery',
  returns: 'Returns & Exchange',
  refund: 'Refund Policy',
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

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

export default async function PolicyPage({ params }) {
  const { name } = await params;
  const policy = await getPolicy(name);
  const title = policy?.title || TITLES[name] || 'Policy';
  const content = policy?.content || policy?.body || policy?.html || '';

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

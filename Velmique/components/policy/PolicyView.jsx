'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import PageHeader from '@/components/layout/PageHeader';
import { getPolicyByName } from '@/lib/api/policies';
import { richHtml } from '@/lib/sanitizeHtml';

/* Renders a policy fetched from the public Policies API.
   - When the API returns a title, we use it whole (no fallbackAccent append).
   - When it falls back, we use fallbackTitle + fallbackAccent for an editorial header.
   Pass `name` (the dashboard slug) to choose which policy to load. */
export default function PolicyView({
  name,
  fallbackTitle = 'Policy',
  fallbackAccent = '',
  eyebrow = 'Legal',
  intro,
}) {
  const [policy, setPolicy] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'empty'

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    getPolicyByName(name).then((p) => {
      if (!alive) return;
      if (p && (p.content || p.body)) {
        setPolicy(p);
        setStatus('ready');
      } else {
        setStatus('empty');
      }
    });
    return () => { alive = false; };
  }, [name]);

  const isApiTitle = !!policy?.title;
  const headerTitle = (isApiTitle ? policy.title : fallbackTitle).toUpperCase();
  // Don't append the accent word when the title came from the API —
  // otherwise we end up with "CANCELLATION AND REFUND & REFUND".
  const headerAccent = isApiTitle ? '' : fallbackAccent;
  const html = policy?.content || policy?.body || '';

  return (
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow={eyebrow}
        title={headerTitle}
        accent={headerAccent}
        intro={intro}
      />

      <article className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="bg-white border border-[var(--border)] rounded-2xl px-6 md:px-12 lg:px-16 py-10 md:py-14">
          {status === 'loading' && (
            <div className="space-y-3 animate-pulse">
              {[88, 72, 95, 60, 90, 78, 92, 65, 85].map((w, i) => (
                <div key={i} className="h-3 rounded bg-[var(--surface-2)]" style={{ width: `${w}%` }} />
              ))}
            </div>
          )}

          {status === 'ready' && (
            <div
              className="policy-content text-[var(--ink-soft)] font-body"
              {...richHtml(html)}
            />
          )}

          {status === 'empty' && (
            <div className="text-center py-10">
              <p className="text-[var(--ink-soft)] font-body text-base mb-4">
                This policy is being prepared. Please check back shortly or reach out to our team.
              </p>
              <Link href="/contact" className="pill-cta inline-flex">Contact Us</Link>
            </div>
          )}
        </div>
      </article>

      {/* Editorial styling for HTML coming from the dashboard rich-text editor */}
      <style jsx global>{`
        .policy-content {
          font-size: 16px;
          line-height: 1.85;
          text-align: justify;
          text-justify: inter-word;
          hyphens: auto;
        }
        .policy-content > * + * { margin-top: 1.1rem; }

        .policy-content h1,
        .policy-content h2,
        .policy-content h3,
        .policy-content h4 {
          font-family: 'Anton', 'Playfair Display', sans-serif;
          color: var(--ink);
          letter-spacing: -0.01em;
          line-height: 1.05;
          text-transform: uppercase;
          text-align: left;
          margin-top: 2.25rem;
          margin-bottom: 1rem;
        }
        .policy-content h1 { font-size: clamp(2rem, 4vw, 2.8rem); }
        .policy-content h2 { font-size: clamp(1.5rem, 2.8vw, 2.1rem); }
        .policy-content h3 { font-size: clamp(1.2rem, 2vw, 1.55rem); }
        .policy-content h4 { font-size: clamp(1.05rem, 1.6vw, 1.25rem); }

        .policy-content p { margin: 0 0 1.1rem; }

        .policy-content a {
          color: var(--gold-deep);
          text-decoration: underline;
          text-underline-offset: 3px;
          transition: color 0.2s;
        }
        .policy-content a:hover { color: var(--gold); }

        .policy-content ul,
        .policy-content ol {
          padding-left: 1.6rem;
          margin: 0 0 1.2rem;
          text-align: left;
        }
        .policy-content li { margin: 0.4rem 0; line-height: 1.7; }
        .policy-content li::marker { color: var(--gold); }

        .policy-content strong { color: var(--ink); font-weight: 600; }
        .policy-content em { font-family: 'Cormorant Garamond', serif; font-style: italic; }

        .policy-content blockquote {
          border-left: 3px solid var(--gold);
          padding: 0.4rem 0 0.4rem 1.4rem;
          margin: 1.6rem 0;
          color: var(--ink);
          font-style: italic;
          text-align: left;
        }

        .policy-content hr {
          border: none;
          height: 1px;
          background: var(--border);
          margin: 2rem 0;
        }

        .policy-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 1.4rem 0;
          font-size: 0.94em;
          text-align: left;
        }
        .policy-content th,
        .policy-content td {
          border: 1px solid var(--border);
          padding: 0.7rem 1rem;
          vertical-align: top;
        }
        .policy-content th {
          background: var(--surface);
          color: var(--ink);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-size: 0.85em;
        }

        .policy-content img { max-width: 100%; height: auto; border-radius: 8px; margin: 1rem 0; }
      `}</style>
    </div>
  );
}

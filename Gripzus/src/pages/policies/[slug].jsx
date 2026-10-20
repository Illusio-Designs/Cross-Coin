import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import PageHero from '../../components/common/PageHero';
import SeoWrapper from '../../components/SeoWrapper';
import { getPolicyByName } from '../../services/policies';
import { SkBusy, TextSkeleton } from '../../components/common/Skeleton';

/* Presentational chrome only — the legal text itself comes from the API.
   Policies are global (same for every brand), so no brand filter. */
const META = {
  'privacy-policy':          { eyebrow: 'Legal', title: 'Privacy',      accent: 'policy',   intro: 'How we collect, use and protect your personal information when you shop with Gripzus.' },
  'terms-and-conditions':    { eyebrow: 'Legal', title: 'Terms',        accent: 'of use',   intro: 'The rules of the road for using gripzus.com — short, plain, fair.' },
  'shipping-policy':         { eyebrow: 'Care',  title: 'Shipping',     accent: 'policy',   intro: 'How your Gripzus pair gets to you — timelines, fees, and what to expect.' },
  'cancellation-and-refund': { eyebrow: 'Care',  title: 'Cancellation', accent: '& refund', intro: 'Cancel before it ships, return any pair within 7 days of delivery.' },
};

function formatTitle(slug) {
  return (slug || '').replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function PolicyPage() {
  const { query } = useRouter();
  const slug = query.slug;
  const meta = META[slug] || { eyebrow: 'Legal', title: formatTitle(slug), accent: '', intro: '' };

  const [policy, setPolicy]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    setError(false);
    getPolicyByName(slug)
      .then((data) => {
        if (data && (data.content || data.title)) setPolicy(data);
        else setError(true);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  return (
    <SeoWrapper pageName={slug || 'policy'}>
      <PageHero eyebrow={meta.eyebrow} title={meta.title} accent={meta.accent} intro={meta.intro} />

      <section className="section-y">
        <div className="wrap">
          <div>

            {/* Loading — grey skeleton */}
            {loading && (
              <SkBusy label="Loading policy…"><TextSkeleton lines={12} /></SkBusy>
            )}

            {/* Not found / error */}
            {!loading && error && (
              <div className="text-center py-16">
                <p className="h-display text-2xl text-ink mb-2">Policy unavailable</p>
                <p className="prose-body text-sm">
                  We couldn&apos;t load this policy right now. Email{' '}
                  <a href="mailto:obzusindia@gmail.com" className="text-ink underline underline-offset-4">obzusindia@gmail.com</a>.
                </p>
              </div>
            )}

            {/* Live policy content */}
            {!loading && !error && policy?.content && (
              <div className="policy-content" dangerouslySetInnerHTML={{ __html: policy.content }} />
            )}

            {/* Footer line */}
            {!loading && !error && (
              <p className="eyebrow mt-14 pt-8 border-t border-line">
                Questions?{' '}
                <a href="mailto:obzusindia@gmail.com" className="text-ink underline underline-offset-4 hover:text-ink-soft">
                  obzusindia@gmail.com
                </a>
              </p>
            )}
          </div>
        </div>
      </section>
    </SeoWrapper>
  );
}

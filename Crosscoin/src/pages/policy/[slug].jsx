/**
 * Clean-slug policy route: /policy/<slug>
 *
 * Same pattern as /products/[slug]:
 *   - getServerSideProps fetches the policy content + the matching
 *     SeoMetadata row (page_name = "policy-<slug>") in parallel.
 *   - SSR-rendered title / meta / OG / canonical / structured_data
 *     (admin can edit any of these from Dashboard → SEO → Pages).
 *   - The visible UI is the same legacy policy.jsx body — we pass
 *     initialPolicy + initialSlug so it skips its client fetch.
 *
 * No backend schema change needed: the existing
 * GET /api/policies/name/:name endpoint matches by title and the
 * slug is just the lowercased + hyphenated title (preserving
 * current behaviour). The default SEO seeding in setupDatabase
 * creates page_name="policy-<slug>" rows automatically for every
 * existing policy.
 */

import Policy from '../policy';
import SeoWrapper from '../../console/SeoWrapper';
import { fetchPageSeo } from '../../utils/fetchPageSeo';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';

async function fetchPolicy(slug) {
  try {
    const r = await fetch(
      `${API_URL}/api/policies/name/${encodeURIComponent(slug)}`,
      { headers: { 'X-Brand-Name': 'crosscoin' } },
    );
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function getServerSideProps(ctx) {
  const slug = ctx.params?.slug;
  if (!slug) return { notFound: true };

  // Canonicalize the URL: the legacy /policy?name=<slug> redirect forwards its
  // query to the destination, producing /policy/<slug>?name=<slug>. Strip that
  // leftover ?name= with a 301 so the final URL is exactly /policy/<slug>.
  if (ctx.query?.name) {
    return { redirect: { destination: `/policy/${slug}`, permanent: true } };
  }

  const [policy, seoData] = await Promise.all([
    fetchPolicy(slug),
    fetchPageSeo(`policy-${slug}`, ctx),
  ]);
  if (!policy) return { notFound: true };
  ctx.res?.setHeader?.('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=86400');
  return { props: { slug, initialPolicy: policy, seoData } };
}

export default function PolicySlugPage({ slug, initialPolicy, seoData }) {
  return (
    <SeoWrapper pageName={`policy-${slug}`} seoData={seoData}>
      <Policy initialPolicy={initialPolicy} initialSlug={slug} />
    </SeoWrapper>
  );
}

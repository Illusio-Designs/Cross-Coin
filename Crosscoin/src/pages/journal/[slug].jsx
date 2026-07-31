/**
 * Clean-slug journal route: /journal/<slug>
 *
 * Fetches the blog post + global FAQs server-side so Google indexes
 * the correct title, description, OG image, canonical, and JSON-LD
 * (BlogPosting + BreadcrumbList + FAQPage) from the first paint.
 *
 * The interactive UI is still blog-details.jsx — we pass the SSR
 * payload as initialPost so it skips the client refetch.
 */

import Head from 'next/head';
import BlogDetails from '../blog-details';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.crosscoin.in';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://crosscoin.in';

async function fetchJson(url) {
  try {
    const r = await fetch(url, { headers: { 'X-Brand-Name': 'crosscoin' } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

export async function getServerSideProps({ params, res }) {
  const slug = params?.slug;
  if (!slug) return { notFound: true };

  const [postResp, faqResp] = await Promise.all([
    fetchJson(`${API_URL}/api/blogs/by-slug/${encodeURIComponent(slug)}`),
    fetchJson(`${API_URL}/api/public/faqs?type=global`),
  ]);

  const post = postResp?.data || postResp?.post || null;
  if (!post) return { notFound: true };

  res?.setHeader?.(
    'Cache-Control',
    'public, s-maxage=300, stale-while-revalidate=600'
  );

  return {
    props: {
      slug,
      initialPost: post,
      globalFaqs: faqResp?.faqs || [],
    },
  };
}

function stripHtml(s) {
  if (!s) return '';
  return String(s).replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}
function truncate(s, n) {
  const t = stripHtml(s);
  return t.length <= n ? t : t.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}
function safeJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return null; }
}

export default function BlogSlugPage({ slug, initialPost, globalFaqs }) {
  const seo = initialPost?.seo || initialPost?.BlogSEO || {};
  const title = seo.meta_title || seo.metaTitle || `${initialPost?.title || 'Blog'} | CrossCoin`;
  const description = truncate(
    seo.meta_description || seo.metaDescription || initialPost?.excerpt || initialPost?.content || '',
    160,
  );
  const canonical = seo.canonical_url || seo.canonicalUrl || `${SITE_URL}/journal/${slug}`;
  const ogTitle = seo.og_title || seo.ogTitle || title;
  const ogDescription = seo.og_description || seo.ogDescription || description;
  const ogImage = seo.og_image || seo.ogImage
    || initialPost?.featured_image
    || initialPost?.image
    || `${SITE_URL}/crosscoin-icon.png`;

  // Prefer admin-supplied structured data; otherwise build a BlogPosting.
  let postingLd = safeJson(seo.structured_data || seo.structuredData);
  if (!postingLd) {
    postingLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: initialPost?.title,
      description,
      image: ogImage ? [ogImage] : undefined,
      datePublished: initialPost?.published_at || initialPost?.createdAt,
      dateModified: initialPost?.updated_at || initialPost?.updatedAt,
      author: initialPost?.author?.name
        ? { '@type': 'Person', name: initialPost.author.name }
        : { '@type': 'Organization', name: 'CrossCoin' },
      publisher: {
        '@type': 'Organization',
        name: 'CrossCoin',
        logo: { '@type': 'ImageObject', url: `${SITE_URL}/crosscoin-icon.png` },
      },
      mainEntityOfPage: { '@type': 'WebPage', '@id': canonical },
    };
  }

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home',  item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Journal',  item: `${SITE_URL}/journal` },
      { '@type': 'ListItem', position: 3, name: initialPost?.title || 'Post', item: canonical },
    ],
  };

  const faqs = globalFaqs || [];
  const faqLd = faqs.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: stripHtml(f.answer) },
    })),
  } : null;

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta name="robots" content="index, follow, max-image-preview:large" />

        <meta property="og:type"        content="article" />
        <meta property="og:title"       content={ogTitle} />
        <meta property="og:description" content={ogDescription} />
        <meta property="og:url"         content={canonical} />
        <meta property="og:image"       content={ogImage} />
        <meta property="og:site_name"   content="CrossCoin" />

        <meta name="twitter:card"        content="summary_large_image" />
        <meta name="twitter:title"       content={ogTitle} />
        <meta name="twitter:description" content={ogDescription} />
        <meta name="twitter:image"       content={ogImage} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(postingLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
        />
        {faqLd && (
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
          />
        )}
      </Head>

      <BlogDetails initialPost={initialPost} initialSlug={slug} />
    </>
  );
}

/**
 * Journal post route — server component shell.
 *
 * Owns generateMetadata + the initial post fetch on the SERVER so
 * social-share scrapers (Twitter, LinkedIn, Slack) see the right
 * title + excerpt + cover image without running JS. The
 * interactive UI lives in ClientPage.jsx.
 */

import ClientPage from './ClientPage';
import { getPost } from '@/lib/api/blog';

const SITE_URL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'https://knitwink.com';

export const revalidate = 600;

export async function generateMetadata({ params }) {
  const { slug } = await params;
  let post = null;
  try { post = await getPost(slug); } catch { /* ignore — handled below */ }

  if (!post) {
    return { title: 'Post not found', robots: { index: false, follow: true } };
  }

  const title = post.seo?.metaTitle || `${post.title} | Knitwink Journal`;
  const description = (post.seo?.metaDescription || post.excerpt || '').slice(0, 160);
  const url = `${SITE_URL}/journal/${slug}`;
  const ogImage = post.coverImage || `${SITE_URL}/knitwinklogo.webp`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      type: 'article',
      images: [{ url: ogImage }],
      publishedTime: post.publishedAt || post.createdAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      authors: post.author?.name ? [post.author.name] : ['Knitwink'],
    },
    twitter: { card: 'summary_large_image', title, description, images: [ogImage] },
  };
}

export default function JournalRoute() {
  return <ClientPage />;
}

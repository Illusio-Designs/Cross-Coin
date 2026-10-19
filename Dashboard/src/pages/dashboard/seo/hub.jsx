// Dashboard views seo, seo-pages, seo-health, seo-bulk, faqs, seo-global →
// Website › SEO (components/website). Product SEO in bulk lives in
// Products → Fix SEO in bulk; the SEO tab links there.
import WebsiteShell from '../../../components/website/WebsiteShell';

const SUB = { overview: 'pages', pages: 'pages', faqs: 'faqs', settings: 'settings' };

export default function SeoHub({ initialTab = 'pages' } = {}) {
  return <WebsiteShell tab="seo" seoView={SUB[initialTab] || 'pages'} />;
}

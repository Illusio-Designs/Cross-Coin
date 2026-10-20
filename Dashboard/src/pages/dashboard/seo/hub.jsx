// Dashboard views seo, seo-pages, seo-health, seo-bulk, faqs, seo-global →
// the SEO page (components/website/SeoPage). Product SEO in bulk lives in
// Products → Fix SEO in bulk; the "To fix" tab links there.
import SeoPage from '../../../components/website/SeoPage';

const TAB = { overview: 'fix', fix: 'fix', pages: 'pages', faqs: 'faqs', settings: 'store' };

export default function SeoHub({ initialTab = 'fix' } = {}) {
  return <SeoPage initialTab={TAB[initialTab] || 'fix'} />;
}

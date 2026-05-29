/**
 * Live "how this will look in Google search results" preview.
 *
 * Used inside SEO editors (per-product, per-page, per-category) so the
 * admin can see immediately what their title + description + URL will
 * render as in a SERP. Helps catch:
 *   - Title that's too long (gets ellipsised after ~60 chars)
 *   - Description that's too short (Google fills in a snippet of body
 *     content if too short, often wrong content)
 *   - URL that has query strings or non-clean slugs
 *
 * Renders both desktop and mobile-width variants because they're
 * displayed differently — mobile gets the URL on top, desktop has the
 * "site name › path" breadcrumb pattern.
 */

const SITE_NAME = 'CrossCoin';

function truncate(s, n) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0, n - 1).replace(/\s+\S*$/, '') + '…';
}

// Google sometimes shows "in 1 day" / current date next to the description
// for product pages. We'll skip that for accuracy.

function urlBreadcrumb(url) {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/^\//, '').replace(/\/+$/, '');
    if (!path) return u.hostname.replace(/^www\./, '');
    const segments = path.split('/').map(s => s.replace(/-/g, ' '));
    return `${u.hostname.replace(/^www\./, '')} › ${segments.join(' › ')}`;
  } catch {
    return url || '';
  }
}

export default function SerpPreview({
  title = '',
  description = '',
  url = 'https://crosscoin.in/',
  siteName = SITE_NAME,
  variant = 'both', // 'desktop' | 'mobile' | 'both'
}) {
  const displayTitle = truncate(title || 'Title not set', 60);
  const displayDesc  = truncate(description || 'Description not set — Google will pick text from the page itself.', 160);
  const breadcrumb   = urlBreadcrumb(url);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {(variant === 'desktop' || variant === 'both') && (
        <SerpCard
          label="Google Desktop"
          width={520}
          siteName={siteName}
          breadcrumb={breadcrumb}
          title={displayTitle}
          description={displayDesc}
        />
      )}
      {(variant === 'mobile' || variant === 'both') && (
        <SerpCard
          label="Google Mobile"
          width={360}
          siteName={siteName}
          breadcrumb={breadcrumb}
          title={displayTitle}
          description={displayDesc}
          mobile
        />
      )}
    </div>
  );
}

function SerpCard({ label, width, siteName, breadcrumb, title, description, mobile }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
        {label}
      </div>
      <div style={{
        width,
        maxWidth: '100%',
        padding: '14px 16px',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        fontFamily: '"Roboto", "Helvetica Neue", Arial, sans-serif',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: mobile ? 6 : 4 }}>
          <div style={{
            width: 22, height: 22, borderRadius: '50%',
            background: '#180D3E',
            color: '#fff',
            fontSize: 11, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>{siteName.slice(0, 1)}</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 13, color: '#202124', lineHeight: 1.2 }}>{siteName}</div>
            <div style={{ fontSize: 11, color: '#5f6368', lineHeight: 1.2 }}>{breadcrumb}</div>
          </div>
        </div>
        <div style={{
          fontSize: mobile ? 17 : 20,
          color: '#1a0dab',
          lineHeight: 1.3,
          fontWeight: 400,
          marginTop: 4,
          marginBottom: 4,
          // Google underlines on hover; we approximate the default link look.
          cursor: 'pointer',
        }}>
          {title}
        </div>
        <div style={{
          fontSize: mobile ? 13 : 14,
          color: '#4d5156',
          lineHeight: 1.5,
        }}>
          {description}
        </div>
      </div>
    </div>
  );
}

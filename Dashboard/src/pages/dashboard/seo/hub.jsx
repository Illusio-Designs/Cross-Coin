/**
 * Unified SEO Hub.
 *
 * One dashboard view that consolidates every SEO surface we built into
 * tabs, plus a new Search Console section so admins can see how Google
 * is indexing and ranking the site without leaving the dashboard.
 *
 * Tab content components (Overview, Settings, Bulk, Pages, FAQs) are
 * imported from their existing route files; each keeps its own
 * PageHeader so the tab still reads as a real page when navigated to
 * directly via the legacy /dashboard/seo-* URLs.
 */

import { useEffect, useState } from 'react';
import SeoHealth         from './health';
import GlobalSeoSettings from './global';
import SeoBulkEditor     from './bulk';
import SEO               from './seo';
import FaqsManager       from './faqs';
import Dropdown          from '../../../components/ui/Dropdown';
import { brandService }  from '../../../services';

const TABS = [
  { id: 'overview',  label: 'Overview',        Component: SeoHealth },
  { id: 'pages',     label: 'Pages',           Component: SEO },
  { id: 'products',  label: 'Products',        Component: SeoBulkEditor },
  { id: 'faqs',      label: 'FAQs',            Component: FaqsManager },
  { id: 'settings',  label: 'Settings',        Component: GlobalSeoSettings },
];

export default function SeoHub({ initialTab = 'overview' } = {}) {
  const [active, setActive] = useState(initialTab);

  // Shared brand selector for the whole SEO section. Every tab receives the
  // selected brandId (numeric, used by brand_id-param endpoints) and brandSlug
  // (used by the X-Brand-Name header on the Pages endpoints), so switching
  // brand here re-scopes Overview, Pages, FAQs and Settings in one place.
  const [brands, setBrands] = useState([]);
  const [brandId, setBrandId] = useState(1);

  useEffect(() => {
    brandService.getAllBrands(true)
      .then(r => {
        if (r?.success && Array.isArray(r.data) && r.data.length) {
          setBrands(r.data);
          setBrandId(prev => (r.data.some(b => b.id === prev) ? prev : r.data[0].id));
        }
      })
      .catch(() => {});
  }, []);

  const brandSlug = brands.find(b => b.id === brandId)?.slug || 'crosscoin';
  const Current = (TABS.find(t => t.id === active) || TABS[0]).Component;

  return (
    <div>
      {/* Header row: section title sits with the tabs; the brand selector
          (shown only when there's more than one brand) scopes every tab. */}
      {brands.length > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'center',
            gap: 8,
            marginBottom: 'var(--ds-space-3)',
          }}
        >
          <span style={{ fontSize: 'var(--ds-text-sm)', color: 'var(--ds-color-text-muted)', fontWeight: 'var(--ds-weight-medium)' }}>
            Brand
          </span>
          <Dropdown
            value={brandId}
            onChange={(v) => setBrandId(Number(v))}
            options={brands.map(b => ({ value: b.id, label: b.display_name || b.name }))}
          />
        </div>
      )}

      {/* Tab nav — scrolls horizontally on small screens so all six fit. */}
      <nav
        aria-label="SEO sections"
        style={{
          display: 'flex',
          gap: 4,
          padding: '4px',
          marginBottom: 'var(--ds-space-5)',
          background: 'var(--ds-color-surface)',
          border: '1px solid var(--ds-color-border)',
          borderRadius: 'var(--ds-radius-md)',
          overflowX: 'auto',
        }}
      >
        {TABS.map(t => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              aria-current={isActive ? 'page' : undefined}
              style={{
                padding: '8px 16px',
                border: 0,
                background: isActive ? 'var(--ds-color-brand)' : 'transparent',
                color: isActive ? 'var(--ds-color-surface)' : 'var(--ds-color-text-muted)',
                fontSize: 'var(--ds-text-md)',
                fontWeight: isActive ? 'var(--ds-weight-semi)' : 'var(--ds-weight-medium)',
                borderRadius: 'var(--ds-radius-sm)',
                cursor: 'pointer',
                transition: 'background var(--ds-trans-fast), color var(--ds-trans-fast)',
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <Current brandId={brandId} brandSlug={brandSlug} />
    </div>
  );
}

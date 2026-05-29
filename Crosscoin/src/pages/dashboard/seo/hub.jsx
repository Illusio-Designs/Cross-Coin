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

import { useState } from 'react';
import SeoHealth         from './health';
import GlobalSeoSettings from './global';
import SeoBulkEditor     from './bulk';
import SEO               from './seo';
import FaqsManager       from './faqs';
import SearchConsoleTab  from './search-console';

const TABS = [
  { id: 'overview',  label: 'Overview',        Component: SeoHealth },
  { id: 'pages',     label: 'Pages',           Component: SEO },
  { id: 'products',  label: 'Products',        Component: SeoBulkEditor },
  { id: 'faqs',      label: 'FAQs',            Component: FaqsManager },
  { id: 'settings',  label: 'Settings',        Component: GlobalSeoSettings },
  { id: 'search',    label: 'Search Console',  Component: SearchConsoleTab },
];

export default function SeoHub({ initialTab = 'overview' } = {}) {
  const [active, setActive] = useState(initialTab);
  const Current = (TABS.find(t => t.id === active) || TABS[0]).Component;

  return (
    <div>
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
                color: isActive ? '#fff' : 'var(--ds-color-text-muted)',
                fontSize: 'var(--ds-text-md)',
                fontWeight: isActive ? 'var(--ds-weight-semi)' : 'var(--ds-weight-medium)',
                borderRadius: 'var(--ds-radius-sm)',
                cursor: 'pointer',
                transition: 'background var(--ds-trans-fast), color var(--ds-trans-fast)',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </nav>

      <Current />
    </div>
  );
}

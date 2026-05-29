/**
 * SEO Health — at-a-glance gap analysis.
 *
 * Shows admins how many products / categories are missing each common
 * SEO field, so they know where to focus. Clicking through to "Fix in
 * bulk editor" takes them to the bulk SEO editor pre-filtered.
 *
 * Data comes from GET /api/admin/seo/health (productController.js).
 */

import { useEffect, useState } from 'react';
import { seoAdminService } from '../../../services';
import { handleViewChange } from '../../../utils/dashboardRouting';

export default function SeoHealth() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    seoAdminService.health()
      .then(r => { if (!cancelled) setData(r); })
      .catch(err => { if (!cancelled) setError(typeof err === 'string' ? err : err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="dashboard-sections">
      <div className="dc-topbar">
        <div className="dc-greeting">
          <span className="dc-greeting-text">SEO Health</span>
          <span className="dc-greeting-sub">Where the catalog still has SEO gaps you should fix before Google Ads.</span>
        </div>
        <button
          onClick={() => handleViewChange('seo-bulk', () => {})}
          className="cd-btn-primary"
          style={{ padding: '8px 16px' }}
        >
          Open bulk editor →
        </button>
      </div>

      {loading && (
        <div className="dashboard-section" style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Loading…</div>
      )}
      {error && (
        <div className="dashboard-section" style={{ padding: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#991b1b' }}>
          {error}
        </div>
      )}

      {data && (
        <>
          {/* Products */}
          <div className="dashboard-section" style={{ marginBottom: 16 }}>
            <SectionHeader title="Products" subtitle={`${data.products.total} total · ${data.products.withSeoRow} with SEO row`} />
            <KpiGrid>
              <Stat label="Missing meta title"       count={data.products.missingMetaTitle}       total={data.products.total} />
              <Stat label="Missing meta description" count={data.products.missingMetaDescription} total={data.products.total} />
              <Stat label="Missing OG image"         count={data.products.missingOgImage}         total={data.products.total} />
            </KpiGrid>
          </div>

          {/* Categories */}
          <div className="dashboard-section" style={{ marginBottom: 16 }}>
            <SectionHeader title="Categories" subtitle={`${data.categories.total} total`} />
            <KpiGrid>
              <Stat label="Missing meta title"       count={data.categories.missingMetaTitle}       total={data.categories.total} />
              <Stat label="Missing meta description" count={data.categories.missingMetaDescription} total={data.categories.total} />
              <Stat label="Missing OG image"         count={data.categories.missingOgImage}         total={data.categories.total} />
              <Stat label="Noindex"                  count={data.categories.noindex}                total={data.categories.total} tone="neutral" />
            </KpiGrid>
          </div>

          {/* FAQs */}
          <div className="dashboard-section" style={{ marginBottom: 16 }}>
            <SectionHeader title="FAQs" subtitle={`${data.faqs.active} active / ${data.faqs.total} total`} />
            {data.faqs.total === 0 && (
              <div style={{ padding: 16, background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 6, color: '#92400e', fontSize: 13 }}>
                No FAQs configured. Adding 3–5 site-wide FAQs (return policy, shipping time, warranty) wins entire rich-result slots on Google mobile and AI shopping.
                <a href="#" onClick={(e) => { e.preventDefault(); handleViewChange('faqs', () => {}); }} style={{ marginLeft: 8, color: '#180D3E', fontWeight: 600 }}>Add FAQs →</a>
              </div>
            )}
          </div>

          {/* Sample products with gaps */}
          {data.sampleProductsWithGaps?.length > 0 && (
            <div className="dashboard-section">
              <SectionHeader title="Recent products with gaps" subtitle="Most recently updated — fix these first" />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      <th style={th}>Product</th>
                      <th style={th}>Slug</th>
                      <th style={th}>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sampleProductsWithGaps.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={td}>{p.name}</td>
                        <td style={{ ...td, color: '#6b7280', fontFamily: 'ui-monospace, monospace', fontSize: 12 }}>{p.slug}</td>
                        <td style={td}>
                          {p.gaps.map(g => (
                            <span key={g} style={{
                              display: 'inline-block', marginRight: 6,
                              padding: '1px 6px', borderRadius: 10,
                              background: '#fef2f2', color: '#991b1b', fontSize: 11, fontWeight: 600,
                            }}>{g}</span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 12 }}>
      <h3 style={{ margin: 0, fontSize: 14, color: '#180D3E', textTransform: 'uppercase', letterSpacing: 0.5 }}>{title}</h3>
      <span style={{ fontSize: 12, color: '#6b7280' }}>{subtitle}</span>
    </div>
  );
}

function KpiGrid({ children }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
      {children}
    </div>
  );
}

function Stat({ label, count, total, tone = 'auto' }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  const color = tone === 'neutral'
    ? '#6b7280'
    : (count === 0 ? '#16a34a' : pct > 25 ? '#dc2626' : '#d97706');
  return (
    <div style={{
      padding: 12,
      border: `1px solid ${count === 0 && tone !== 'neutral' ? '#bbf7d0' : '#e5e7eb'}`,
      borderRadius: 8,
      background: count === 0 && tone !== 'neutral' ? '#f0fdf4' : '#fff',
    }}>
      <div style={{ fontSize: 11, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color }}>{count}</span>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>/ {total} ({pct}%)</span>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '8px 10px', color: '#374151' };

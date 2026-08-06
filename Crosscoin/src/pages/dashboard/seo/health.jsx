/**
 * SEO Health — at-a-glance gap analysis.
 *
 * Shows admins how many products / categories are missing each common
 * SEO field, so they know where to focus. Counts are scoped to the brand
 * selected in the SEO hub header (brandId prop).
 *
 * Data comes from GET /api/admin/seo/health (productController.js).
 */

import { useEffect, useState } from 'react';
import { seoAdminService } from '../../../services';
import { handleViewChange } from '../../../utils/dashboardRouting';
import { PageHeader, Panel } from '../../../components/Dashboard/primitives';

export default function SeoHealth({ brandId } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    seoAdminService.health(brandId ? { brand_id: brandId } : {})
      .then(r => { if (!cancelled) setData(r); })
      .catch(err => { if (!cancelled) setError(typeof err === 'string' ? err : err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [brandId]);

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="SEO Health"
        subtitle="Where the catalog still has SEO gaps you should fix before Google Ads."
      />

      {loading && (
        <Panel><div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>Loading…</div></Panel>
      )}
      {error && (
        <Panel><div style={{ color: 'var(--ds-color-danger)', fontSize: 14 }}>{error}</div></Panel>
      )}

      {data && (
        <>
          <Panel
            title="Products"
            subtitle={`${data.products.total} total · ${data.products.withSeoRow} with SEO row`}
            style={{ marginBottom: 'var(--ds-space-4)' }}
          >
            <KpiGrid>
              <Stat label="Missing meta title"       count={data.products.missingMetaTitle}       total={data.products.total} />
              <Stat label="Missing meta description" count={data.products.missingMetaDescription} total={data.products.total} />
              <Stat label="Missing OG image"         count={data.products.missingOgImage}         total={data.products.total} />
            </KpiGrid>
          </Panel>

          <Panel
            title="Categories"
            subtitle={`${data.categories.total} total`}
            style={{ marginBottom: 'var(--ds-space-4)' }}
          >
            <KpiGrid>
              <Stat label="Missing meta title"       count={data.categories.missingMetaTitle}       total={data.categories.total} />
              <Stat label="Missing meta description" count={data.categories.missingMetaDescription} total={data.categories.total} />
              <Stat label="Missing OG image"         count={data.categories.missingOgImage}         total={data.categories.total} />
              <Stat label="Noindex"                  count={data.categories.noindex}                total={data.categories.total} tone="neutral" />
            </KpiGrid>
          </Panel>

          <Panel
            title="FAQs"
            subtitle={`${data.faqs.active} active / ${data.faqs.total} total`}
            style={{ marginBottom: 'var(--ds-space-4)' }}
          >
            {data.faqs.total === 0 && (
              <div style={{
                padding: 16,
                background: 'var(--ds-color-warn-bg)',
                border: '1px solid var(--ds-color-warn-bd)',
                borderRadius: 'var(--ds-radius-sm)',
                color: 'var(--ds-color-warn)',
                fontSize: 13,
              }}>
                No FAQs configured. Adding 3–5 site-wide FAQs (return policy, shipping time, warranty) wins entire rich-result slots on Google mobile and AI shopping.
                <a
                  href="#"
                  onClick={(e) => { e.preventDefault(); handleViewChange('faqs', () => {}); }}
                  style={{ marginLeft: 8, color: 'var(--ds-color-brand)', fontWeight: 600 }}
                >Add FAQs →</a>
              </div>
            )}
          </Panel>

          {data.sampleProductsWithGaps?.length > 0 && (
            <Panel
              title="Recent products with gaps"
              subtitle="Most recently updated — fix these first"
              flush
            >
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--ds-color-surface-soft)', borderBottom: '1px solid var(--ds-color-border)' }}>
                      <th style={th}>Product</th>
                      <th style={th}>Slug</th>
                      <th style={th}>Missing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.sampleProductsWithGaps.map(p => (
                      <tr key={p.id} style={{ borderBottom: '1px solid var(--ds-color-border-soft)' }}>
                        <td style={td}>{p.name}</td>
                        <td style={{ ...td, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>{p.slug}</td>
                        <td style={td}>
                          {p.gaps.map(g => (
                            <span key={g} style={{
                              display: 'inline-block', marginRight: 6,
                              padding: '1px 6px', borderRadius: 10,
                              background: 'var(--ds-color-danger-bg)',
                              color: 'var(--ds-color-danger)',
                              fontSize: 11, fontWeight: 600,
                            }}>{g}</span>
                          ))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>
          )}
        </>
      )}
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
    ? 'var(--ds-color-text-muted)'
    : (count === 0 ? '#0a0a0a' : pct > 25 ? '#3f3f46' : '#6b6b73');
  return (
    <div style={{
      padding: 12,
      border: `1px solid ${count === 0 && tone !== 'neutral' ? '#bbf7d0' : 'var(--ds-color-border)'}`,
      borderRadius: 8,
      background: count === 0 && tone !== 'neutral' ? '#f0fdf4' : 'var(--ds-color-surface)',
    }}>
      <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color }}>{count}</span>
        <span style={{ fontSize: 12, color: 'var(--ds-color-text-faint)' }}>/ {total} ({pct}%)</span>
      </div>
    </div>
  );
}

const th = { textAlign: 'left', padding: '8px 10px', fontSize: 11, fontWeight: 700, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5 };
const td = { padding: '8px 10px', color: 'var(--ds-color-text-muted)' };

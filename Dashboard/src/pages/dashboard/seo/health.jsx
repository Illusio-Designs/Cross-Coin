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
          <Panel style={{ marginBottom: 'var(--ds-space-4)' }}>
            {(() => {
              const p = data.products, c = data.categories;
              const fields = (p.total * 3) + (c.total * 3); // 3 tracked SEO fields each
              const missing = (p.missingMetaTitle || 0) + (p.missingMetaDescription || 0) + (p.missingOgImage || 0)
                + (c.missingMetaTitle || 0) + (c.missingMetaDescription || 0) + (c.missingOgImage || 0);
              const score = fields ? Math.round(100 * (1 - missing / fields)) : 100;
              const band = score >= 90 ? 'Excellent' : score >= 70 ? 'Good' : score >= 50 ? 'Needs work' : 'Poor';
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 700 }}>Overall SEO score</div>
                    <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.05, color: 'var(--ds-color-text)' }}>
                      {score}<span style={{ fontSize: 18, color: 'var(--ds-color-text-faint)', fontWeight: 600 }}>/100</span>
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ds-color-text-muted)', marginTop: 2 }}>{band}</div>
                  </div>
                  <div style={{ flex: 1, minWidth: 220 }}>
                    <div style={{ height: 8, borderRadius: 99, background: 'var(--ds-color-border)', overflow: 'hidden' }}>
                      <span style={{ display: 'block', height: '100%', width: `${score}%`, background: 'var(--ds-color-text)', borderRadius: 99 }} />
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)', marginTop: 8 }}>
                      {missing === 0 ? 'Every tracked field is filled across products & categories.' : `${missing} of ${fields} tracked fields still need attention across products & categories.`}
                    </div>
                  </div>
                </div>
              );
            })()}
          </Panel>

          {/* The per-type gap breakdown (Products / Categories stat cards) was
              removed — product gaps now live on a "SEO" column on the Products
              table and FAQ status on the FAQ manager, so each gap shows up
              where you actually fix it. This page stays a pure at-a-glance
              score overview. */}
        </>
      )}
    </div>
  );
}


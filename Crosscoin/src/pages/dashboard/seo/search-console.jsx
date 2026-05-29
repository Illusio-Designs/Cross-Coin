/**
 * Search Console tab — live data from Google Search Console showing:
 *   - Sitemap submission status (which sitemaps Google has, when last
 *     read, how many URLs).
 *   - Top queries the site ranks for (impressions, clicks, CTR, avg
 *     position) — this is the "ranking" view.
 *   - Top landing pages (which URLs are getting clicks) — paired with
 *     the queries, tells admins what's working.
 *   - Per-URL Inspection — paste any URL, get its index status (this
 *     is the "indexing" view).
 *
 * Data is fetched via /api/gsc-proxy (server-side) so the browser
 * never talks to webmasters.googleapis.com directly. Same pattern as
 * /api/ga4-proxy.
 *
 * Setup required (one time per brand, by admin):
 *   1. Brand Settings → Analytics: GA4_SA_EMAIL + GA4_SA_PRIVATE_KEY
 *      already configured (we reuse them for GSC API auth).
 *   2. Google Search Console → Settings → Users and Permissions →
 *      add the SA email above as a 'Restricted' user on the property.
 *   3. Brand Settings → SEO: GSC_SITE_URL = "https://crosscoin.in/"
 *      (trailing slash matters — must match how GSC stores the
 *      property).
 */

import { useEffect, useState } from 'react';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';

const SITE_URL_HINT = 'https://crosscoin.in/';

export default function SearchConsoleTab() {
  const [loading, setLoading] = useState(true);
  const [setupError, setSetupError] = useState(null);
  const [sitemaps, setSitemaps] = useState([]);
  const [queries, setQueries] = useState([]);
  const [pages, setPages] = useState([]);

  // URL inspection (per-URL indexing check)
  const [inspectUrl, setInspectUrl] = useState('');
  const [inspectLoading, setInspectLoading] = useState(false);
  const [inspectResult, setInspectResult] = useState(null);
  const [inspectError, setInspectError] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const [sm, qd, pd] = await Promise.all([
          callGsc('sitemaps'),
          callGsc('queries'),
          callGsc('pages'),
        ]);
        if (cancel) return;
        setSitemaps(sm?.sitemap || []);
        setQueries(qd?.rows || []);
        setPages(pd?.rows || []);
      } catch (err) {
        if (!cancel) setSetupError(err?.message || 'Failed to load Search Console data');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, []);

  const runInspect = async () => {
    if (!inspectUrl.trim()) return;
    setInspectLoading(true);
    setInspectError(null);
    setInspectResult(null);
    try {
      const res = await callGsc('urlInspect', { inspectionUrl: inspectUrl.trim() });
      setInspectResult(res?.inspectionResult || res);
    } catch (err) {
      setInspectError(err?.message || 'Failed to inspect URL');
    } finally {
      setInspectLoading(false);
    }
  };

  // Aggregate KPI cards across all rows we got back.
  const totals = aggregate(queries);

  return (
    <div className="dashboard-sections">
      <PageHeader
        title="Search Console"
        subtitle="Live indexing, ranking and click data for the last 28 days, straight from Google."
      />

      {loading && (
        <Panel><div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>Loading Search Console data…</div></Panel>
      )}

      {!loading && setupError && (
        <SetupGuide message={setupError} />
      )}

      {!loading && !setupError && (
        <>
          {/* Headline KPIs */}
          <StatGrid style={{ marginBottom: 'var(--ds-space-4)' }}>
            <StatTile label="Total clicks"      value={fmt(totals.clicks)}                              tone="good" />
            <StatTile label="Total impressions" value={fmt(totals.impressions)}                         tone="info" />
            <StatTile label="Avg CTR"           value={`${(totals.ctr * 100).toFixed(1)}%`}             tone={totals.ctr > 0.02 ? 'good' : 'warn'} />
            <StatTile label="Avg position"      value={totals.position ? totals.position.toFixed(1) : '—'} tone={totals.position && totals.position <= 10 ? 'good' : 'warn'} sub="Lower is better" />
            <StatTile label="Sitemaps"          value={sitemaps.length}                                  sub={sitemapsSubtitle(sitemaps)} />
            <StatTile label="Indexed URLs"      value={fmt(sumSitemapIndexed(sitemaps))}                tone="info" />
          </StatGrid>

          {/* URL Inspector */}
          <Panel title="Inspect a URL" subtitle="Paste any page URL to see how Google indexed it.">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <input
                type="text"
                value={inspectUrl}
                onChange={(e) => setInspectUrl(e.target.value)}
                placeholder={`${SITE_URL_HINT}products/your-product-slug`}
                style={{
                  flex: 1, minWidth: 260,
                  padding: '8px 12px',
                  border: '1px solid var(--ds-color-border)',
                  borderRadius: 'var(--ds-radius-sm)',
                  fontSize: 14,
                  background: 'var(--ds-color-surface)',
                }}
              />
              <button
                onClick={runInspect}
                disabled={inspectLoading || !inspectUrl.trim()}
                className="ds-btn ds-btn--primary"
              >
                {inspectLoading ? 'Inspecting…' : 'Inspect'}
              </button>
            </div>
            {inspectError && <div style={{ marginTop: 10, color: 'var(--ds-color-danger)', fontSize: 13 }}>{inspectError}</div>}
            {inspectResult && <UrlInspectionResult result={inspectResult} />}
          </Panel>

          {/* Top queries (ranking) */}
          <Panel
            title="Top queries — ranking"
            subtitle="What people search to find you, ranked by impressions."
            flush
            style={{ marginTop: 'var(--ds-space-4)' }}
          >
            <SearchRowsTable rows={queries} firstColumn={{ key: 'keys', label: 'Query', render: (r) => r.keys?.[0] || '—' }} />
          </Panel>

          {/* Top pages (which URLs get clicks) */}
          <Panel
            title="Top landing pages"
            subtitle="Which pages are pulling traffic from search."
            flush
            style={{ marginTop: 'var(--ds-space-4)' }}
          >
            <SearchRowsTable rows={pages} firstColumn={{
              key: 'keys', label: 'Page',
              render: (r) => {
                const u = r.keys?.[0] || '';
                const short = u.replace(/^https?:\/\/[^/]+/, '');
                return <span style={{ fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>{short || u || '—'}</span>;
              },
            }} />
          </Panel>

          {/* Sitemap submissions */}
          <Panel
            title="Sitemaps"
            subtitle="Submitted sitemaps Google has on record for this property."
            flush
            style={{ marginTop: 'var(--ds-space-4)' }}
          >
            {sitemaps.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>
                No sitemaps submitted yet. Submit <code>https://crosscoin.in/sitemap.xml</code> in <a href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console → Sitemaps</a>.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--ds-color-surface-soft)', borderBottom: '1px solid var(--ds-color-border)' }}>
                      <th style={th}>Path</th>
                      <th style={th}>Last submitted</th>
                      <th style={th}>Last downloaded</th>
                      <th style={th}>URLs</th>
                      <th style={th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sitemaps.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--ds-color-border-soft)' }}>
                        <td style={{ ...td, fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>{shortenPath(s.path)}</td>
                        <td style={td}>{fmtDate(s.lastSubmitted)}</td>
                        <td style={td}>{fmtDate(s.lastDownloaded)}</td>
                        <td style={{ ...td, fontVariantNumeric: 'tabular-nums' }}>{fmt(toNum(s.contents?.[0]?.submitted))}</td>
                        <td style={td}>
                          {s.errors > 0 || s.warnings > 0 ? (
                            <span style={{ color: 'var(--ds-color-danger)', fontWeight: 600 }}>
                              {s.errors} errors{s.warnings ? `, ${s.warnings} warnings` : ''}
                            </span>
                          ) : (
                            <span style={{ color: 'var(--ds-color-success)', fontWeight: 600 }}>Healthy</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────── */

async function callGsc(type, body) {
  const authToken = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const r = await fetch(`/api/gsc-proxy?brandId=1`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, body }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `GSC proxy returned ${r.status}`);
  return j;
}

function aggregate(rows) {
  let clicks = 0, impressions = 0, position = 0, n = 0;
  for (const r of rows || []) {
    clicks += r.clicks || 0;
    impressions += r.impressions || 0;
    if (r.position) { position += r.position; n++; }
  }
  const ctr = impressions > 0 ? clicks / impressions : 0;
  return { clicks, impressions, ctr, position: n ? position / n : 0 };
}

function sumSitemapIndexed(sitemaps) {
  let total = 0;
  for (const s of sitemaps) {
    for (const c of s.contents || []) {
      total += parseInt(c.indexed || c.submitted || 0, 10) || 0;
    }
  }
  return total;
}

function sitemapsSubtitle(sitemaps) {
  if (!sitemaps?.length) return 'None submitted';
  const errors = sitemaps.reduce((a, s) => a + (parseInt(s.errors, 10) || 0), 0);
  return errors === 0 ? 'All healthy' : `${errors} sitemap error${errors === 1 ? '' : 's'}`;
}

function shortenPath(url) {
  try { return new URL(url).pathname || url; } catch { return url; }
}

function fmt(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-IN');
}

function fmtDate(iso) {
  if (!iso) return '—';
  try { return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return iso; }
}

function toNum(v) { const n = parseInt(v, 10); return isFinite(n) ? n : 0; }

const th = { textAlign: 'left', padding: '10px 12px', fontSize: 11, fontWeight: 700, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.05 };
const td = { padding: '10px 12px', color: 'var(--ds-color-text)', verticalAlign: 'top' };

/* ── Sub-components ─────────────────────────────────────────────────── */

function SearchRowsTable({ rows, firstColumn }) {
  if (!rows?.length) {
    return <div style={{ padding: 24, textAlign: 'center', color: 'var(--ds-color-text-muted)' }}>No data for the last 28 days yet.</div>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: 'var(--ds-color-surface-soft)', borderBottom: '1px solid var(--ds-color-border)' }}>
            <th style={th}>{firstColumn.label}</th>
            <th style={{ ...th, textAlign: 'right' }}>Clicks</th>
            <th style={{ ...th, textAlign: 'right' }}>Impressions</th>
            <th style={{ ...th, textAlign: 'right' }}>CTR</th>
            <th style={{ ...th, textAlign: 'right' }}>Position</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const ctr = r.impressions ? r.clicks / r.impressions : 0;
            const goodPos = r.position && r.position <= 10;
            return (
              <tr key={i} style={{ borderBottom: '1px solid var(--ds-color-border-soft)' }}>
                <td style={td}>{firstColumn.render(r)}</td>
                <td style={{ ...td, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{fmt(r.clicks)}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmt(r.impressions)}</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{(ctr * 100).toFixed(1)}%</td>
                <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: goodPos ? 'var(--ds-color-success)' : 'var(--ds-color-text-muted)', fontWeight: goodPos ? 700 : 400 }}>
                  {r.position ? r.position.toFixed(1) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function UrlInspectionResult({ result }) {
  const idx = result?.indexStatusResult || {};
  const verdict = idx.verdict || 'UNKNOWN';
  const coverage = idx.coverageState || '—';
  const lastCrawl = idx.lastCrawlTime;
  const indexingState = idx.indexingState || idx.robotsTxtState || '—';
  const pageFetchState = idx.pageFetchState || '—';
  const isPass = verdict === 'PASS';

  return (
    <div style={{
      marginTop: 14,
      padding: 14,
      background: isPass ? 'var(--ds-color-success-bg)' : 'var(--ds-color-warn-bg)',
      border: `1px solid ${isPass ? 'var(--ds-color-success-bd)' : 'var(--ds-color-warn-bd)'}`,
      borderRadius: 'var(--ds-radius-sm)',
    }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: isPass ? 'var(--ds-color-success)' : 'var(--ds-color-warn)', marginBottom: 6 }}>
        {verdict === 'PASS' ? '✓ Indexed' : verdict === 'PARTIAL' ? '◐ Partial' : '⚠ Not indexed'}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 8, fontSize: 13 }}>
        <Cell label="Coverage" value={coverage} />
        <Cell label="Indexing state" value={indexingState} />
        <Cell label="Page fetch" value={pageFetchState} />
        <Cell label="Last crawl" value={fmtDate(lastCrawl)} />
      </div>
    </div>
  );
}

function Cell({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--ds-color-text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>{label}</div>
      <div style={{ color: 'var(--ds-color-text)' }}>{value}</div>
    </div>
  );
}

function SetupGuide({ message }) {
  return (
    <Panel title="Search Console isn't connected yet">
      <div style={{ color: 'var(--ds-color-text-muted)', fontSize: 13, marginBottom: 14 }}>{message}</div>
      <div style={{ fontSize: 14, marginBottom: 8, fontWeight: 600, color: 'var(--ds-color-text)' }}>To enable live indexing + ranking data here:</div>
      <ol style={{ paddingLeft: 20, lineHeight: 1.7, color: 'var(--ds-color-text)' }}>
        <li>You already have <code>GA4_SA_EMAIL</code> and <code>GA4_SA_PRIVATE_KEY</code> in <strong>Brand Settings → Analytics</strong>. Reuse the same service-account email.</li>
        <li>Open <a href="https://search.google.com/search-console/users" target="_blank" rel="noreferrer">Search Console → Settings → Users and permissions</a> and add that service-account email as <strong>Restricted</strong> (read-only is enough).</li>
        <li>In <strong>Brand Settings → SEO</strong>, add a new setting:
          <div style={{ marginTop: 6, padding: 8, background: 'var(--ds-color-surface-soft)', border: '1px solid var(--ds-color-border)', borderRadius: 6, fontFamily: 'var(--ds-font-mono)', fontSize: 12 }}>
            GSC_SITE_URL = {SITE_URL_HINT}
          </div>
          (The trailing slash matters — must match how Google Search Console stores the property.)
        </li>
        <li>Reload this tab. Data appears within a few seconds.</li>
      </ol>
    </Panel>
  );
}

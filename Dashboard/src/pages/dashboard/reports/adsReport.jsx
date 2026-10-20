import { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { reportPagesService, brandService, metaAdsService } from '../../../services';
import { Button, DateRangePicker, Input, Select, Table, SkeletonKpis, Skeleton, StatusPill } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';
import Dropdown from '../../../components/ui/Dropdown';

/* ──────────────────────────────────────────────────────────────
   Ads — Meta ad spend against the orders it actually brought in.
   GET /api/reports/ads (services/reports/adsReport.js), admin only.

   Spend comes from Meta (synced every 3 hours into ad_spend_daily by
   services/metaAdsService.js). Our orders are matched to it by NAME:
   the ads carry utm_campaign={{campaign.name}}, utm_term={{adset.name}},
   utm_content={{ad.name}}, and the visit an order came from is compared
   with Meta's names (case, spaces and URL-encoding ignored), in the same
   store. ROAS = delivered net sales ÷ spend, so RTO and refunds count.

   The connection panel on top (/api/admin/meta-ads/connection) holds the
   one Meta token for all stores and which ad account belongs to which store.
   ────────────────────────────────────────────────────────────── */

const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
const inr = (v) => `₹${(Math.round(Number(v) || 0)).toLocaleString('en-IN')}`;
const inr2 = (v) => (v == null ? '—' : `₹${(Number(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`);
const pc = (v) => (v == null ? '—' : `${(Number(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`);
const xr = (v) => (v == null ? '—' : `${(Number(v) || 0).toFixed(2)}×`);

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const when = (iso) => (iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : null);

function exportCsv(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

// ROAS colour: under 1 loses money on ads, 1–2 is thin, over 2 is healthy.
const roasTone = (v) => (v == null ? 'neutral' : v < 1 ? 'problem' : v <= 2 ? 'needs' : 'done');
const muted = { color: 'var(--ds-color-text-muted)' };
const faint = { color: 'var(--ds-color-text-faint)' };
const tabular = { fontVariantNumeric: 'tabular-nums' };
const URL_PARAMS = 'utm_source=facebook&utm_medium=paid_social&utm_campaign={{campaign.name}}&utm_term={{adset.name}}&utm_content={{ad.name}}';
const LEVEL_TXT = { campaign: 'Campaign', adset: 'Ad set', ad: 'Ad' };
const GAP_REASON = {
  no_spend: 'No spend on Meta under this name in this period — renamed, or run from an ad account that isn’t linked.',
  no_account: 'This store has no ad account linked above.',
  macro: 'The link still says {{campaign.name}} — the URL parameters weren’t filled in by Meta (check the spelling of the parameters).',
  no_campaign: 'The visit came from Meta without a campaign name.',
};

/* ── Meta connection panel ── */
function ConnectionPanel({ onSynced }) {
  const qc = useQueryClient();
  const connQ = useQuery({ queryKey: ['meta-ads', 'connection'], queryFn: () => metaAdsService.getConnection(false), staleTime: 60 * 1000 });
  const conn = connQ.data;
  const [open, setOpen] = useState(null); // null = decide from the state
  const [replacing, setReplacing] = useState(false);
  const [token, setToken] = useState('');
  const [links, setLinks] = useState({}); // accountId -> '' | brandId string (edits)
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState(null); // { ok, text }

  const accounts = useMemo(() => conn?.accounts || [], [conn]);
  const linkedCount = accounts.filter((a) => a.storeBrandId != null).length;
  const errored = accounts.filter((a) => a.storeBrandId != null && a.lastError);
  const connected = !!conn?.tokenSet && linkedCount > 0;
  const isOpen = open === null ? (!connQ.isLoading && !connected) : open;
  const lastSynced = accounts.map((a) => a.lastSyncedAt).filter(Boolean).sort().pop() || null;
  const storeOptions = [{ value: '', label: 'Not linked' }, ...(conn?.brands || []).map((b) => ({ value: String(b.id), label: b.name }))];
  const linkOf = (a) => (a.id in links ? links[a.id] : (a.storeBrandId != null ? String(a.storeBrandId) : ''));
  const dirty = accounts.some((a) => a.id in links && links[a.id] !== (a.storeBrandId != null ? String(a.storeBrandId) : ''));

  const refreshAll = (data) => {
    if (data) qc.setQueryData(['meta-ads', 'connection'], data);
    else qc.invalidateQueries({ queryKey: ['meta-ads', 'connection'] });
  };
  const run = async (what, fn) => {
    setBusy(what); setMsg(null);
    try { await fn(); } catch (e) { setMsg({ ok: false, text: e.message || 'Something went wrong — try again.' }); }
    finally { setBusy(''); }
  };
  const find = () => run('find', async () => {
    const data = await metaAdsService.getConnection(true);
    refreshAll(data);
    setMsg(data.accountsError
      ? { ok: false, text: `Meta didn’t list the ad accounts: ${data.accountsError}` }
      : { ok: true, text: `Found ${data.accounts.filter((a) => a.visible).length} ad account(s) this token can read.` });
  });
  const saveToken = () => run('token', async () => {
    const r = await metaAdsService.saveConnection({ token: token.trim() });
    if (!r?.success) { setMsg({ ok: false, text: r?.message || 'Meta didn’t accept the token.' }); return; }
    setToken(''); setReplacing(false); refreshAll(r);
    setMsg({ ok: true, text: r.token?.message || 'Token saved.' });
  });
  const saveLinks = () => run('links', async () => {
    const mapping = accounts.filter((a) => a.id in links).map((a) => ({ accountId: a.id, brandId: links[a.id] ? Number(links[a.id]) : null }));
    const r = await metaAdsService.saveConnection({ mapping });
    if (!r?.success) { setMsg({ ok: false, text: r?.message || 'Couldn’t save the links.' }); return; }
    setLinks({}); refreshAll(r);
    setMsg({ ok: true, text: r.mapping?.changed ? `Saved — ${r.mapping.changed} store(s) updated. Press “Sync now” to fetch their spend.` : 'Nothing changed.' });
  });
  const syncNow = () => run('sync', async () => {
    const r = await metaAdsService.syncNow();
    setMsg({ ok: r?.status === 'ok' || r?.status === 'skipped', text: r?.summary || r?.message || 'Sync finished.' });
    refreshAll(); onSynced?.();
  });

  const accountCols = [
    {
      header: 'Ad account', accessor: 'name', align: 'left',
      cell: (a) => (
        <div style={{ minWidth: 180 }}>
          <b style={{ fontSize: 13 }}>{a.name || 'Unknown account'}</b>
          <span style={{ display: 'block', fontSize: 11.5, ...faint, fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)' }}>
            act_{a.id}{a.currency ? ` · ${a.currency}` : ''}{a.status ? ` · ${a.status}` : ''}
          </span>
          {!a.visible ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ds-color-danger-text, #b42318)' }}>The token can’t see this account.</span> : null}
        </div>
      ),
    },
    {
      header: 'Store', accessor: 'storeBrandId', align: 'left',
      cell: (a) => (
        <div style={{ minWidth: 170 }}>
          <Select size="sm" options={storeOptions} value={linkOf(a)} onChange={(v) => setLinks((m) => ({ ...m, [a.id]: String(v ?? '') }))} placeholder="Not linked" />
        </div>
      ),
    },
    {
      header: 'Last sync', accessor: 'lastSyncedAt', align: 'left',
      cell: (a) => (a.lastError
        ? <span style={{ fontSize: 12, color: 'var(--ds-color-danger-text, #b42318)' }}>{a.lastError}</span>
        : <span style={{ fontSize: 12, ...muted }}>{a.lastSyncedAt ? `${when(a.lastSyncedAt)}${a.lastRows != null ? ` · ${num(a.lastRows)} rows` : ''}` : '—'}</span>),
    },
  ];

  const statusLine = connQ.isLoading ? 'Checking the Meta connection…'
    : connQ.error ? `Couldn’t load the Meta connection: ${connQ.error.message}`
      : !conn?.tokenSet ? 'Not connected — paste a Meta token below to read ad spend.'
        : `Using ${conn.tokenSourceLabel} (${conn.tokenHint}) · ${linkedCount} ad account${linkedCount === 1 ? '' : 's'} linked`
          + `${lastSynced ? ` · last sync ${when(lastSynced)}` : ' · not synced yet'} · ${conn.schedule ? conn.schedule.toLowerCase() : 'every 3 hours'}`;

  return (
    <Panel
      title="Meta connection"
      subtitle={<span>{statusLine}{errored.length ? <span style={{ color: 'var(--ds-color-danger-text, #b42318)' }}> · {errored.length} account{errored.length === 1 ? '' : 's'} failed last time</span> : null}</span>}
      actions={
        <>
          {conn?.tokenSet && linkedCount ? <Button variant="secondary" size="sm" onClick={syncNow} disabled={!!busy}>{busy === 'sync' ? 'Syncing…' : 'Sync now'}</Button> : null}
          <Button variant="secondary" size="sm" onClick={() => setOpen(!isOpen)} aria-expanded={isOpen}>{isOpen ? 'Hide' : 'Manage'}</Button>
        </>
      }
    >
      {msg ? <div role="status" style={{ fontSize: 13, marginBottom: isOpen ? 12 : 0, color: msg.ok ? 'var(--ds-color-success-text, #067647)' : 'var(--ds-color-danger-text, #b42318)' }}>{msg.text}</div> : null}
      {conn?.lastRun && isOpen ? (
        <div style={{ fontSize: 12.5, marginBottom: 12, ...muted }}>
          Last run {when(conn.lastRun.startedAt)} — {conn.lastRun.summary || conn.lastRun.status} (also on Settings → System health).
        </div>
      ) : null}
      {isOpen ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <b style={{ fontSize: 13 }}>Token (one for all stores)</b>
            <span style={{ fontSize: 13, ...muted }}>
              {conn?.tokenSet
                ? <>Reading ad spend with <b>{conn.tokenSourceLabel}</b> ({conn.tokenHint}). One token reads every ad account it has access to.</>
                : 'No token can read your ad accounts yet. A Conversions API token often works; otherwise make a read-only one.'}
            </span>
            {replacing || !conn?.tokenSet ? (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ flex: '1 1 320px', maxWidth: 520 }}>
                  <Input label="Paste a Meta token" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} placeholder="EAA…" />
                </div>
                <Button onClick={saveToken} disabled={!token.trim() || !!busy}>{busy === 'token' ? 'Testing…' : 'Test & save'}</Button>
                {conn?.tokenSet ? <Button variant="secondary" onClick={() => { setReplacing(false); setToken(''); }}>Cancel</Button> : null}
              </div>
            ) : (
              <div><Button variant="secondary" size="sm" onClick={() => setReplacing(true)}>Replace token</Button></div>
            )}
            <span style={{ fontSize: 12, ...faint }}>
              Make one in Meta Business Settings → Users → System users → your system user → Generate new token → tick <b>ads_read</b>. Give that user your ad accounts under Assign assets (View performance). The token is tested before it is saved and never shown again.
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <b style={{ fontSize: 13 }}>Ad accounts → stores</b>
              <div style={{ display: 'flex', gap: 8 }}>
                <Button variant="secondary" size="sm" onClick={find} disabled={!conn?.tokenSet || !!busy}>{busy === 'find' ? 'Asking Meta…' : 'Find my ad accounts'}</Button>
                <Button size="sm" onClick={saveLinks} disabled={!dirty || !!busy}>{busy === 'links' ? 'Saving…' : 'Save'}</Button>
              </div>
            </div>
            {conn?.accountsError ? <span style={{ fontSize: 12.5, color: 'var(--ds-color-danger-text, #b42318)' }}>Meta didn’t list the ad accounts: {conn.accountsError}</span> : null}
            <Table
              columns={accountCols}
              data={accounts}
              loading={connQ.isLoading}
              sortable={false}
              emptyMessage={conn?.tokenSet ? 'Press “Find my ad accounts” to list the accounts this token can read.' : 'Save a token first.'}
            />
            <span style={{ fontSize: 12, ...faint }}>One ad account per store. Spend already synced moves with its account when you change a link.</span>
          </div>
        </div>
      ) : null}
    </Panel>
  );
}

/* ── Spend vs delivered sales, per day (SVG bars) ── */
function DailyBars({ daily }) {
  const series = daily || [];
  if (!series.length || series.every((d) => !d.spend && !d.deliveredNet)) {
    return <span style={{ fontSize: 13, ...muted }}>No spend or sales in this period yet.</span>;
  }
  const W = 720, H = 170, PAD = 6;
  const max = Math.max(1, ...series.map((d) => Math.max(d.spend, d.deliveredNet)));
  const slot = W / series.length;
  const bw = Math.max(1, slot * 0.36);
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const totalSpend = series.reduce((s, d) => s + d.spend, 0);
  const totalNet = series.reduce((s, d) => s + d.deliveredNet, 0);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="170" preserveAspectRatio="none" role="img" aria-label="Ad spend and delivered sales per day">
        <line x1="0" y1={H - PAD} x2={W} y2={H - PAD} stroke="var(--ds-color-border)" vectorEffect="non-scaling-stroke" />
        {series.map((d, i) => (
          <g key={d.day}>
            <title>{`${d.day}: spend ${inr(d.spend)} · delivered sales ${inr(d.deliveredNet)}`}</title>
            <rect x={i * slot + slot * 0.12} y={y(d.spend)} width={bw} height={H - PAD - y(d.spend)} fill="var(--ds-color-warn, #f59e0b)" rx="1" />
            <rect x={i * slot + slot * 0.12 + bw} y={y(d.deliveredNet)} width={bw} height={H - PAD - y(d.deliveredNet)} fill="var(--ds-color-success, #12b76a)" rx="1" />
          </g>
        ))}
      </svg>
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12.5, marginTop: 8, ...muted }}>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--ds-color-warn, #f59e0b)', marginRight: 6 }} />Ad spend · {inr(totalSpend)}</span>
        <span><span aria-hidden="true" style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: 'var(--ds-color-success, #12b76a)', marginRight: 6 }} />Delivered sales from these ads · {inr(totalNet)}</span>
        <span>{series[0].day} → {series[series.length - 1].day}</span>
      </div>
    </>
  );
}

export default function AdsReport() {
  const qc = useQueryClient();
  const [from, setFrom] = useState(shiftDay(istDate(), -29));
  const [to, setTo] = useState(istDate());
  const [brandId, setBrandId] = useState('');
  const [brandList, setBrandList] = useState([]);
  const [path, setPath] = useState([]); // [{ campaign, brandId }, { adset }]

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);
  useEffect(() => { setPath([]); }, [brandId]);

  const level = path.length === 0 ? 'campaign' : path.length === 1 ? 'adset' : 'ad';
  const params = {
    startDate: from, endDate: to, brandId: brandId || undefined, level,
    campaign: path[0]?.campaign, scopeBrandId: path[0]?.brandId, adset: path[1]?.adset,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'ads', from, to, brandId, level, path[0]?.campaign, path[0]?.brandId, path[1]?.adset],
    queryFn: () => reportPagesService.get('ads', params),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => (data?.rows || []).map((r) => ({ ...r, id: r.key })), [data]);
  const k = data?.kpis || {};
  const canSeeCost = !!data?.canSeeCost;
  const allStores = !brandId;
  const first = isLoading && !data;
  const dim = isFetching && data ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;
  const brandName = brandId
    ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'Store')
    : 'All brands';
  const foreign = (data?.currencies || []).filter((c) => c !== 'INR');

  const drill = (r) => {
    if (level === 'campaign') setPath([{ campaign: r.campaign, brandId: r.brandId, label: r.campaign }]);
    else if (level === 'adset') setPath((p) => [p[0], { adset: r.adset ?? '', label: r.adset || '(no ad set name)' }]);
  };

  const columns = [
    {
      header: LEVEL_TXT[level], accessor: 'name', align: 'left',
      cell: (r) => (
        <div style={{ minWidth: 190, maxWidth: 360 }}>
          <b style={{ fontSize: 13, overflowWrap: 'anywhere' }}>{r.name || '(no name)'}</b>
          <span style={{ display: 'block', fontSize: 11.5, ...faint }}>
            {[allStores ? r.brand : null, level === 'ad' ? null : `${num(r.ads)} ad${r.ads === 1 ? '' : 's'}`, level !== 'ad' ? 'click to open' : null].filter(Boolean).join(' · ')}
          </span>
          {level === 'campaign' && !r.tracked && r.spend > 0
            ? <StatusPill tone="needs" size="sm" style={{ marginTop: 4 }}>No tracking tags</StatusPill> : null}
        </div>
      ),
    },
    { header: 'Spend', accessor: 'spend', align: 'right', cell: (r) => <span style={tabular}>{inr(r.spend)}</span> },
    { header: 'Our orders', accessor: 'orders', align: 'right', cell: (r) => <span style={tabular}>{num(r.orders)}</span> },
    { header: 'Cost / order', accessor: 'costPerOrder', align: 'right', cell: (r) => <span style={tabular}>{r.costPerOrder == null ? '—' : inr(r.costPerOrder)}</span> },
    { header: 'Delivered sales', accessor: 'deliveredNet', align: 'right', cell: (r) => <span style={tabular} title={`${num(r.delivered)} delivered orders`}>{inr(r.deliveredNet)}</span> },
    {
      header: 'ROAS', accessor: 'roas', align: 'right',
      cell: (r) => (r.roas == null ? <span style={faint}>—</span>
        : <StatusPill tone={roasTone(r.roas)} size="sm" style={{ whiteSpace: 'nowrap' }} title={`Meta says ${xr(r.metaRoas)}`}>{xr(r.roas)}</StatusPill>),
    },
    { header: 'Meta purchases', accessor: 'metaPurchases', align: 'right', cell: (r) => <span style={tabular}>{num(Math.round(r.metaPurchases))}</span> },
    { header: 'RTO', accessor: 'rtoPct', align: 'right', cell: (r) => <span style={tabular}>{pc(r.rtoPct)}</span> },
    { header: 'CTR', accessor: 'ctr', align: 'right', cell: (r) => <span style={tabular}>{pc(r.ctr)}</span> },
    { header: 'CPC', accessor: 'cpc', align: 'right', cell: (r) => <span style={tabular}>{inr2(r.cpc)}</span> },
  ];

  const doExport = () => exportCsv(`ads_${level}_${brandName.replace(/\W+/g, '-').toLowerCase()}_${from}_to_${to}.csv`, [
    { label: 'Store', value: (r) => r.brand },
    { label: 'Campaign', value: (r) => r.campaign },
    ...(level !== 'campaign' ? [{ label: 'Ad set', value: (r) => r.adset }] : []),
    ...(level === 'ad' ? [{ label: 'Ad', value: (r) => r.ad }] : []),
    { label: 'Spend', value: (r) => r.spend },
    { label: 'Impressions', value: (r) => r.impressions },
    { label: 'Link clicks', value: (r) => r.clicks },
    { label: 'CTR %', value: (r) => r.ctr ?? '' },
    { label: 'CPC', value: (r) => r.cpc ?? '' },
    { label: 'Our orders', value: (r) => r.orders },
    { label: 'Cost per order', value: (r) => r.costPerOrder ?? '' },
    { label: 'Delivered orders', value: (r) => r.delivered },
    { label: 'Delivered net sales', value: (r) => r.deliveredNet },
    { label: 'ROAS (delivered net / spend)', value: (r) => r.roas ?? '' },
    { label: 'RTO %', value: (r) => r.rtoPct ?? '' },
    { label: 'Return %', value: (r) => r.returnPct ?? '' },
    { label: 'Meta purchases', value: (r) => r.metaPurchases },
    { label: 'Meta purchase value', value: (r) => r.metaPurchaseValue },
    { label: 'Meta ROAS', value: (r) => r.metaRoas ?? '' },
    ...(canSeeCost ? [
      { label: 'Cost of goods kept', value: (r) => r.cogs },
      { label: 'Profit after ads (before GST, shipping, fees)', value: (r) => r.profitAfterAds },
    ] : []),
    { label: 'From', value: () => from },
    { label: 'To', value: () => to },
  ], rows);

  const untagged = data?.gaps?.untagged || [];
  const noSpend = data?.gaps?.noSpend || [];
  const crumbs = [{ label: 'All campaigns' }, ...path];

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Ads"
        subtitle={`What Meta charged, and the orders it actually brought in. ${brandName} · ${from} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}`}
        actions={
          <>
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => setBrandId(v === 'all' ? '' : String(v))}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
            <Button variant="secondary" onClick={doExport} disabled={!rows.length || first}>Export CSV</Button>
          </>
        }
      />

      <ConnectionPanel onSynced={() => qc.invalidateQueries({ queryKey: ['reports', 'ads'] })} />

      {error ? <Panel><span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{error.message || 'Failed to load the report'}</span></Panel> : null}
      {foreign.length ? (
        <Panel><span style={{ fontSize: 13, color: 'var(--ds-color-warn-text, #b54708)' }}>Some ad accounts report spend in {foreign.join(', ')}. Spend is shown as Meta reports it, not converted to rupees.</span></Panel>
      ) : null}

      {first ? (
        <SkeletonKpis count={5} label="Loading ad spend…" />
      ) : data ? (
        <div style={dim} aria-busy={isFetching || undefined}>
          <StatGrid>
            <StatTile label="Ad spend" value={inr(k.spend)} sub={`${num(k.impressions)} impressions · ${num(k.clicks)} link clicks`} />
            <StatTile label="Our orders" value={num(k.orders)} sub={k.costPerOrder != null ? `${inr(k.costPerOrder)} per order` : 'none matched to this spend'} />
            <StatTile label="ROAS · after RTO" value={xr(k.roas)} tone={k.roas == null ? undefined : roasTone(k.roas)} sub={`${inr(k.deliveredNet)} delivered sales ÷ spend · Meta says ${xr(k.metaRoas)}`} />
            <StatTile
              label="Meta purchases vs ours"
              value={`${num(Math.round(k.metaPurchases || 0))} vs ${num(k.orders)}`}
              sub={k.metaOverCountPct == null ? 'no matched orders to compare' : k.metaOverCountPct > 0 ? `Meta counts ${pc(k.metaOverCountPct)} more` : `Meta counts ${pc(Math.abs(k.metaOverCountPct))} fewer`}
            />
            <StatTile label="Spend with no orders" value={inr(k.spendNoOrders)} tone={k.spendNoOrders > 0 ? 'needs' : undefined} sub={`${num(k.rowsNoOrders)} ${LEVEL_TXT[level].toLowerCase()}${k.rowsNoOrders === 1 ? '' : 's'} with spend and no order`} />
            {canSeeCost ? (
              <StatTile label="Profit after ads" value={inr(k.profitAfterAds)} tone={(k.profitAfterAds || 0) < 0 ? 'problem' : 'done'} sub="delivered sales − cost of goods − spend" />
            ) : null}
          </StatGrid>
        </div>
      ) : null}

      <div style={dim}>
        <Panel
          flush
          title={
            <nav aria-label="Breadcrumb" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {crumbs.map((c, i) => (
                <span key={i} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                  {i ? <span aria-hidden="true" style={faint}>›</span> : null}
                  {i < crumbs.length - 1
                    ? <button type="button" onClick={() => setPath(path.slice(0, i))} style={{ border: 0, background: 'none', padding: 0, cursor: 'pointer', font: 'inherit', color: 'var(--ds-color-text-muted)', textDecoration: 'underline' }}>{c.label}</button>
                    : <span aria-current="page">{c.label}</span>}
                </span>
              ))}
            </nav>
          }
          subtitle={level === 'ad' ? 'Each ad in this ad set.' : `Click a ${level === 'campaign' ? 'campaign to see its ad sets' : 'ad set to see its ads'}.`}
        >
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={columns}
              data={rows}
              loading={first}
              sortable={false}
              onRowClick={level !== 'ad' ? drill : undefined}
              getRowStyle={() => (level !== 'ad' ? { cursor: 'pointer' } : {})}
              emptyMessage={data && !data.hasSpendData
                ? 'No ad spend synced for this period yet. Link the ad accounts above and press “Sync now”.'
                : 'No spend here in this period.'}
            />
          </div>
          {data && k.unmatchedOrders > 0 && level === 'campaign' ? (
            <div style={{ padding: '10px 20px', fontSize: 12.5, borderTop: '1px solid var(--ds-color-border)', ...muted }}>
              {num(k.unmatchedOrders)} more order{k.unmatchedOrders === 1 ? '' : 's'} came from Meta links ({inr(k.unmatchedDeliveredNet)} delivered) but don’t match a campaign with spend — see “Needs tracking tags”.
            </div>
          ) : null}
        </Panel>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <Panel title="Needs tracking tags" subtitle="Spend and orders that can’t be joined up yet.">
            {first ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}><Skeleton w="70%" h={12} /><Skeleton w="90%" h={12} /><Skeleton w="60%" h={12} /></div>
            ) : !untagged.length && !noSpend.length ? (
              <span style={{ fontSize: 13, color: 'var(--ds-color-success-text, #067647)' }}>Every campaign with spend has tracked visits, and every Meta order matches a campaign.</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {untagged.length ? (
                  <div>
                    <b style={{ fontSize: 13 }}>Ads without tracking tags — add the URL parameters</b>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                      {untagged.slice(0, 12).map((g) => (
                        <li key={`${g.brandId}:${g.campaign}`}><b>{g.campaign}</b> <span style={muted}>· {g.brand} · {inr(g.spend)} spent, no visits with this campaign name</span></li>
                      ))}
                    </ul>
                    <div style={{ marginTop: 8, fontSize: 12.5, ...muted }}>
                      In Ads Manager → each ad → Tracking → URL parameters, paste:
                      <code style={{ display: 'block', marginTop: 4, padding: '6px 8px', borderRadius: 8, background: 'var(--ds-color-surface-soft)', fontSize: 11.5, overflowWrap: 'anywhere', color: 'var(--ds-color-text)' }}>{URL_PARAMS}</code>
                    </div>
                  </div>
                ) : null}
                {noSpend.length ? (
                  <div>
                    <b style={{ fontSize: 13 }}>Meta orders with no spend under that name</b>
                    <ul style={{ margin: '6px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13 }}>
                      {noSpend.slice(0, 12).map((g) => (
                        <li key={`${g.brandId}:${g.campaign}`}>
                          <b>{g.campaign || '(no campaign)'}</b> <span style={muted}>· {g.brand} · {num(g.orders)} order{g.orders === 1 ? '' : 's'}, {inr(g.deliveredNet)} delivered</span>
                          <span style={{ display: 'block', fontSize: 12, ...faint }}>{GAP_REASON[g.reason] || ''}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </Panel>
        </div>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <Panel title="Spend vs delivered sales" subtitle={path.length ? `Per day, for ${path.map((p) => p.label).join(' › ')}.` : 'Per day: Meta spend and the delivered sales of orders matched to it (by the day the order was placed).'}>
            {first ? <Skeleton w="100%" h={170} r={10} /> : <DailyBars daily={data?.daily} />}
          </Panel>
        </div>
      </div>

      <Panel title="How to read this">
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, ...muted }}>
          <li><b>Spend</b>, impressions, link clicks and <b>Meta purchases</b> come from Meta, by the day in your ad account’s time zone. They are synced every 3 hours; Meta keeps revising the last few days.</li>
          <li><b>Our orders</b> are orders placed in this period (cancelled left out) whose visit came from a Meta link carrying this campaign / ad set / ad name, in the same store. Names are matched ignoring capital letters, extra spaces and link encoding.</li>
          <li><b>ROAS after RTO</b> = delivered sales ÷ spend. Delivered sales are what reached the customer, minus refunds — orders the courier brought back (RTO) bring in nothing, so this is usually lower than Meta’s own ROAS, which counts every purchase the pixel saw.</li>
          <li><b>ROAS colours</b>: red under 1× (the ads cost more than they brought in), amber 1–2×, green over 2×. <b>RTO</b> = RTO ÷ (delivered + RTO), same rule as the Overview.</li>
          <li><b>Meta purchases vs ours</b>: Meta also counts purchases after a view or a click days earlier, and cancelled or undelivered ones, so it usually reports more.</li>
          {canSeeCost ? <li><b>Profit after ads</b> = delivered sales − cost price of the goods kept − spend. It is before GST, shipping and payment fees; Revenue &amp; Profit has the full picture and now uses this real spend.</li> : null}
          <li>Orders from ads that don’t carry the URL parameters can’t be matched — they are listed under <b>Needs tracking tags</b>.</li>
        </ul>
      </Panel>
    </div>
  );
}

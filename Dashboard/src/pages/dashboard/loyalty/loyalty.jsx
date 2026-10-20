import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import {
  Button, PageHeader, KpiTile, KpiGrid, FilterChips, EmptyState, ErrorState,
  Skeleton, SkeletonKpis, SkeletonTableRows,
} from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { loyaltyService, userService, brandService } from '../../../services';
import { useAuth } from '../../../context/AuthContext';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { HugeiconsIcon } from '@hugeicons/react';
import { Search01Icon, StarIcon } from '@hugeicons/core-free-icons';

/* ──────────────────────────────────────────────────────────────
   Loyalty points — what customers have, earn, spend and lose.
   Data (Backend services/loyaltyAdminService.js):
     GET  /api/admin/loyalty/summary        tiles, rules, expiring in 30 days, last expiry run
     GET  /api/admin/loyalty/transactions   tabs, customer search, paging, real order numbers
     GET  /api/admin/loyalty/customer/:id   balance for the give/take form
     POST /api/admin/loyalty/adjust         give (+) / take (−) points with a reason
     PUT  /api/admin/loyalty/rules          admin; rules live in brand settings
   Customer search reuses GET /api/admin/customers?q= (registered accounts only —
   guests have no points). Styles: payLoyalty.css (.pl-*).
   ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;
const TABS = [
  { value: 'all', label: 'All' }, { value: 'earned', label: 'Earned' }, { value: 'spent', label: 'Spent' },
  { value: 'staff', label: 'By staff' }, { value: 'expired', label: 'Expired' },
];
const EMPTY = {
  all: 'Points show up here when a delivered order earns them.',
  earned: 'No points earned yet — they’re added when an order is delivered.',
  spent: 'Nobody has spent points yet.',
  staff: 'Nobody on the team has given or taken points yet.',
  expired: 'No points have expired.',
};
const RULE_FIELDS = [
  { key: 'earnRate', label: 'Earn — ₹ spent for 1 point', min: 1, max: 100000 },
  { key: 'redeemRate', label: 'Worth — points for ₹1 off', min: 1, max: 100 },
  { key: 'maxRedeemPercent', label: 'Max per order — % of the order', min: 1, max: 100 },
  { key: 'expiryDays', label: 'Expire after — days', min: 1, max: 3650 },
];

const num = (n) => Number(n || 0).toLocaleString('en-IN');
const inr = (n) => `₹${num(Math.round(Number(n) || 0))}`;
const plural = (n, w) => `${num(n)} ${w}${Number(n) === 1 ? '' : 's'}`;
const fullDate = (d) => (d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' }) : '');
const istDay = (d) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
function when(d) {
  if (!d) return '—';
  if (istDay(d) === istDay(Date.now())) return 'Today';
  if (istDay(d) === istDay(Date.now() - 86400000)) return 'Yesterday';
  const days = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (days < 7) return `${days} days ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: days > 300 ? 'numeric' : undefined, timeZone: 'Asia/Kolkata' });
}
function goTo(path) {
  window.history.pushState({}, '', path);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function openOrder(orderNumber) {
  try { sessionStorage.setItem('obz-orders-search', orderNumber); } catch { /* storage blocked */ }
  goTo('/dashboard/orders');
}
const ic = (icon, size = 16) => <HugeiconsIcon icon={icon} size={size} strokeWidth={2} aria-hidden="true" />;
const ruleLines = (r) => [
  ['Earn', `1 point per ₹${num(r.earnRate)} delivered`],
  ['Worth', r.redeemRate === 1 ? '1 point = ₹1 at checkout' : `${num(r.redeemRate)} points = ₹1 at checkout`],
  ['Max per order', `${r.maxRedeemPercent}% of the order`],
  ['Expire after', `${num(r.expiryDays)} days`],
];

const DIM = { opacity: 0.6, transition: 'opacity .15s' };

// ── Rules ────────────────────────────────────────────────────────
function RulesCard({ data, brandId, brandName, isAdmin, expiryJob, onSaved }) {
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  if (!data) {
    return (
      <section className="pl-side-card" role="status" aria-busy="true">
        <b>How points work</b>
        <span className="ds-sr-only">Loading rules…</span>
        <div className="pl-rules" aria-hidden="true">
          {[0, 1, 2, 3].map((i) => <div key={i}><Skeleton w={70 + (i % 2) * 20} h={12} /><Skeleton w={130 + (i % 3) * 20} h={12} /></div>)}
        </div>
        <Skeleton w="85%" h={10} />
      </section>
    );
  }
  const r = data.rules;
  const start = () => { setErr(''); setForm(Object.fromEntries(RULE_FIELDS.map((f) => [f.key, String(r[f.key])]))); };
  const save = async () => {
    for (const f of RULE_FIELDS) {
      const n = Number(form[f.key]);
      if (!Number.isInteger(n) || n < f.min || n > f.max) { setErr(`${f.label.split(' — ')[0]} must be a whole number from ${f.min} to ${num(f.max)}.`); return; }
    }
    setSaving(true); setErr('');
    try {
      const res = await loyaltyService.saveRules({ brandId: brandId || undefined, ...Object.fromEntries(RULE_FIELDS.map((f) => [f.key, Number(form[f.key])])) });
      showSuccess(null, res.message || 'Rules saved.');
      setForm(null);
      onSaved();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  };
  return (
    <section className="pl-side-card" aria-labelledby="pl-rules-h">
      <b id="pl-rules-h">How points work{brandName ? ` · ${brandName}` : ''}</b>
      {!form ? (
        <>
          {data.same ? (
            <dl className="pl-rules">
              {ruleLines(r).map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
            </dl>
          ) : (
            <div className="pl-rules-split">
              <span className="pl-small pl-faint">Each brand has its own rules — pick a brand above to see one.</span>
              {data.perBrand.map((b) => (
                <span key={b.brandId} className="pl-small"><b>{b.brand}</b>: 1 pt per ₹{num(b.earnRate)} · max {b.maxRedeemPercent}% · {num(b.expiryDays)} days</span>
              ))}
            </div>
          )}
          <p className="pl-small pl-faint pl-note">
            Customers can’t spend points at checkout yet, so “Worth” and “Max per order” apply once a store offers it.
            {expiryJob ? ` Expiry runs daily at 2 am — last run ${fullDate(expiryJob.at)}: ${expiryJob.summary || expiryJob.status}.` : ' Expiry runs daily at 2 am.'}
          </p>
          {isAdmin && <Button size="sm" variant="secondary" onClick={start}>Change rules</Button>}
        </>
      ) : (
        <div className="pl-form">
          {RULE_FIELDS.map((f) => (
            <label key={f.key} className="pl-field">
              <span>{f.label}</span>
              <input type="number" inputMode="numeric" min={f.min} max={f.max} step="1" value={form[f.key]}
                onChange={(e) => setForm((x) => ({ ...x, [f.key]: e.target.value }))} />
            </label>
          ))}
          <span className="pl-small pl-faint">A new expiry only applies to points earned from now on.</span>
          {err && <span className="pl-err" role="alert">{err}</span>}
          <span className="pl-actions">
            <Button size="sm" variant="secondary" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            <Button size="sm" onClick={save} loading={saving} loadingText="Saving…">{brandId ? `Save for ${brandName || 'this brand'}` : 'Save for all brands'}</Button>
          </span>
        </div>
      )}
    </section>
  );
}

// ── Give / take ──────────────────────────────────────────────────
function GiveTake({ brandId, formRef, onDone }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null); // null = not searched
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [points, setPoints] = useState('');
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (picked) return undefined;
    const term = query.trim();
    if (term.length < 2) { setResults(null); return undefined; }
    let off = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await userService.getCustomerList({ q: term, limit: 8, ...(brandId ? { brandId } : {}) });
        if (!off) setResults((res?.rows || []).filter((r) => r.userId));
      } catch { if (!off) setResults([]); }
      finally { if (!off) setSearching(false); }
    }, 300);
    return () => { off = true; clearTimeout(t); };
  }, [query, brandId, picked]);

  const pick = async (row) => {
    setErr(''); setResults(null);
    setPicked({ id: row.userId, name: row.name, contact: row.contact, points: null });
    try {
      const c = await loyaltyService.customer(row.userId);
      setPicked({ id: c.id, name: c.name, contact: c.contact, points: c.points, brand: c.brand });
    } catch (e) { setErr(e.message); }
  };
  const reset = () => { setPicked(null); setQuery(''); setPoints(''); setReason(''); setErr(''); };
  const n = Number(String(points).replace(/\s/g, ''));
  const valid = picked && Number.isInteger(n) && n !== 0;
  const submit = async (e) => {
    e.preventDefault();
    if (!picked) { setErr('Search and pick a customer first.'); return; }
    if (!Number.isInteger(n) || n === 0) { setErr('Enter whole points — e.g. 200 to give, −50 to take.'); return; }
    if (n < 0 && picked.points != null && picked.points < -n) { setErr(`${picked.name || 'This customer'} only has ${num(picked.points)} points.`); return; }
    if (reason.trim().length < 3) { setErr('Write a short reason, e.g. “Sorry for the late delivery”.'); return; }
    setSaving(true); setErr('');
    try {
      const res = await loyaltyService.adjustPoints({ userId: picked.id, points: n, description: reason.trim(), brandId });
      showSuccess(null, res.message || 'Points updated.');
      reset();
      onDone();
    } catch (e2) { setErr(e2.message); }
    finally { setSaving(false); }
  };

  return (
    <section className="pl-side-card" aria-labelledby="pl-give-h">
      <b id="pl-give-h">Give or take points</b>
      <form className="pl-form" onSubmit={submit} noValidate>
        {!picked ? (
          <div className="pl-picker">
            <input ref={formRef} type="search" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder="Search customer by name or phone" aria-label="Customer" autoComplete="off" />
            {(searching || results) && (
              <ul className="pl-pick-list" aria-live="polite" aria-busy={searching || undefined}
                style={searching && results ? { opacity: 0.6, transition: 'opacity .15s' } : undefined}>
                {searching && !results && [0, 1, 2].map((i) => (
                  <li key={`sk-${i}`} className="pl-small" aria-hidden="true">
                    <Skeleton w={['60%', '48%', '55%'][i]} h={12} /><Skeleton w="35%" h={10} style={{ marginTop: 5 }} />
                  </li>
                ))}
                {searching && !results && <li className="ds-sr-only" role="status">Searching…</li>}
                {!searching && results && results.length === 0 && <li className="pl-faint pl-small">No customer accounts match. Guests who never signed up can’t hold points.</li>}
                {(results || []).map((r) => (
                  <li key={r.key}>
                    <button type="button" onClick={() => pick(r)}>
                      <b>{r.name || 'Customer'}</b>
                      <span className="pl-faint pl-small">{[r.contact, r.brands?.[0]].filter(Boolean).join(' · ')}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="pl-picked">
            <span>
              <b>{picked.name || 'Customer'}</b>
              <span className="pl-faint pl-small">
                {[picked.contact, picked.points == null ? null : `${num(picked.points)} points now`].filter(Boolean).join(' · ')}
                {picked.points == null && !err && (
                  <>{picked.contact ? ' · ' : ''}<Skeleton w={84} h={10} style={{ display: 'inline-block', verticalAlign: 'middle' }} /><span className="ds-sr-only">Loading balance…</span></>
                )}
              </span>
            </span>
            <button type="button" className="pl-link" onClick={reset}>Change</button>
          </div>
        )}
        <div className="pl-row2">
          <input value={points} onChange={(e) => setPoints(e.target.value.replace(/[−–]/g, '-'))} inputMode="numeric"
            placeholder="+200 or −50" aria-label="Points (minus to take)" className="pl-pts" />
          <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={250}
            placeholder="Reason, e.g. Sorry for the late delivery" aria-label="Reason" />
        </div>
        <span className="pl-small pl-faint">The reason is saved in the customer’s points history.</span>
        {err && <span className="pl-err" role="alert">{err}</span>}
        <Button type="submit" size="sm" loading={saving} loadingText="Saving…" disabled={!valid}>
          {valid ? (n > 0 ? `Give ${num(n)} points` : `Take ${num(-n)} points`) : 'Give or take points'}
        </Button>
      </form>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function Loyalty() {
  const qc = useQueryClient();
  const { isAdmin } = useAuth() || {};
  const [brandId, setBrandId] = useState('');
  const [brands, setBrands] = useState([]);
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);
  const giveRef = useRef(null);

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true).then((r) => { if (!off && r?.success) setBrands(r.data || []); }).catch(() => {});
    return () => { off = true; };
  }, []);
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [tab, brandId, q]);

  // A brand change keeps the old totals on screen (dimmed) until the new ones land.
  const summary = useQuery({
    queryKey: ['loyalty', 'summary', brandId],
    queryFn: () => loyaltyService.summary(brandId),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const params = { tab, page, limit: PAGE_SIZE, ...(q ? { q } : {}), ...(brandId ? { brandId } : {}) };
  const list = useQuery({
    queryKey: ['loyalty', 'list', params],
    queryFn: () => loyaltyService.getTransactions(params),
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ['loyalty'] });

  const s = summary.data;
  const rows = list.data?.rows || [];
  const total = list.data?.total || 0;
  const pages = list.data?.pages || 1;
  useEffect(() => { if (list.data && !list.isPlaceholderData && page > pages) setPage(pages); }, [list.data, list.isPlaceholderData, page, pages]);
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);
  const brandOpts = [{ value: '', label: 'All brands' }, ...brands.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))];
  const brandName = brandId ? (brandOpts.find((b) => b.value === brandId)?.label || '') : '';
  const focusGive = () => { giveRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); giveRef.current?.focus({ preventScroll: true }); };

  return (
    <div className="dashboard-sections pl-page">
      <PageHeader
        title="Loyalty points"
        description="Points customers earn on delivered orders."
        actions={(
          <div className="pl-head-tools">
            <Dropdown value={brandId} onChange={(v) => setBrandId(String(v))} options={brandOpts} className="pl-dd" />
            <Button onClick={focusGive}>Give or take points</Button>
          </div>
        )}
      />

      {summary.error && !s ? (
        <ErrorState message={`Couldn’t load the points totals — ${summary.error.message}`} onRetry={() => summary.refetch()} retrying={summary.isFetching} />
      ) : !s ? (
        <SkeletonKpis count={4} label="Loading points totals…" className="pl-kpis" />
      ) : (
        <div style={summary.isPlaceholderData ? DIM : undefined} aria-busy={summary.isPlaceholderData || undefined}>
          <KpiGrid className="pl-kpis">
            <KpiTile label="Points out there" value={num(s.outstanding.points)} sub={`worth ${inr(s.outstanding.value)} at checkout`} />
            <KpiTile label="Earned · 30 d" value={num(s.earned30.points)} sub={`on ${plural(s.earned30.orders, 'delivered order')}`} />
            <KpiTile label="Spent · 30 d" value={num(s.spent30.points)} sub={s.spent30.times ? `${plural(s.spent30.times, 'time')}` : 'none in 30 days'} />
            <KpiTile label="Customers with points" value={num(s.customers.withPoints)} sub={`${num(s.customers.canRedeem100)} have 100+`} />
          </KpiGrid>
        </div>
      )}

      <div className="pl-split">
        <section className="pl-card pl-main" aria-busy={list.isFetching || undefined}>
          <div className="pl-card-head">
            <FilterChips ariaLabel="Type of change" items={TABS} value={tab} onChange={setTab} controls="pl-loy-list" />
            <label className="pl-search">
              {ic(Search01Icon)}
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Customer name, phone or order" aria-label="Search customer" />
            </label>
          </div>
          <div id="pl-loy-list" style={list.isFetching && list.data ? DIM : undefined}>
            {list.isLoading ? (
              <div className="pl-scroll" role="status" aria-busy="true">
                <span className="ds-sr-only">Loading points history…</span>
                <table className="pl-table pl-table--loy" aria-hidden="true">
                  <thead>
                    <tr><th>Customer</th><th>What happened</th><th>Order</th><th className="r">Points</th><th className="r">Balance</th><th>When</th></tr>
                  </thead>
                  <tbody><SkeletonTableRows rows={8} cols={6} /></tbody>
                </table>
              </div>
            ) : list.error && !list.data ? (
              <ErrorState message={`Couldn’t load the points history — ${list.error.message}`} onRetry={() => list.refetch()} retrying={list.isFetching} />
            ) : rows.length === 0 ? (
              <EmptyState compact icon={ic(StarIcon, 22)} title={q ? 'Nothing matches your search' : 'Nothing here yet'}
                description={q ? 'Try a full 10-digit phone number, a name or an order number.' : EMPTY[tab]} />
            ) : (
              <div className="pl-scroll">
                <table className="pl-table pl-table--loy">
                  <thead>
                    <tr><th>Customer</th><th>What happened</th><th>Order</th><th className="r">Points</th><th className="r">Balance</th><th>When</th></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.id}>
                        <td><b>{r.customer}</b>{r.contact && <div className="pl-faint pl-small">{r.contact}</div>}</td>
                        <td className="pl-why">{r.what}{r.reason ? <> — “{r.reason}”</> : null}</td>
                        <td>
                          {r.orderNumber
                            ? <button type="button" className="pl-link pl-mono" onClick={() => openOrder(r.orderNumber)} title="Open this order">{r.orderNumber}</button>
                            : <span className="pl-faint">—</span>}
                        </td>
                        <td className={`r pl-pts-cell ${r.points >= 0 ? 'is-in' : 'is-out'}`}><b>{r.points >= 0 ? `+${num(r.points)}` : `−${num(-r.points)}`}</b></td>
                        <td className="r pl-num">{num(r.balance)}</td>
                        <td className="pl-nowrap pl-faint" title={fullDate(r.at)}>{when(r.at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          <div className="pl-foot">
            <span className="pl-faint">{list.error && list.data ? 'Couldn’t refresh — showing the last list. ' : ''}{brandName ? `${brandName} only.` : 'All brands.'}</span>
            {total > 0 && (
              <span className="pl-pager">
                <span className="pl-num">{num(from)}–{num(to)} of {num(total)}</span>
                <Button size="sm" variant="secondary" disabled={page <= 1 || list.isFetching} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
                <Button size="sm" variant="secondary" disabled={to >= total || list.isFetching} onClick={() => setPage((p) => p + 1)}>Next →</Button>
              </span>
            )}
          </div>
        </section>

        <aside className="pl-aside">
          <RulesCard data={s?.rules} brandId={brandId} brandName={brandName} isAdmin={!!isAdmin} expiryJob={s?.expiryJob} onSaved={refresh} />

          <section className="pl-side-card pl-side-card--warn" aria-labelledby="pl-exp-h">
            <b id="pl-exp-h" className="pl-warn-title">Expiring in the next 30 days</b>
            {!s ? (
              <div className="sk-text" role="status" aria-busy="true">
                <span className="ds-sr-only">Loading expiring points…</span>
                <Skeleton w="92%" h={12} /><Skeleton w="60%" h={12} />
              </div>
            ) : s.expiring30.points > 0 ? (
              <>
                <span className="pl-small"><b>{num(s.expiring30.points)} points</b> for <b>{plural(s.expiring30.customers, 'customer')}</b>. A WhatsApp reminder can bring them back to order before they lose them.</span>
                <Button size="sm" onClick={() => goTo('/dashboard/whatsapp#broadcast-new')}>Send a reminder broadcast</Button>
                <span className="pl-small pl-faint">You’ll pick who gets it on the next page — there’s no “points expiring” group there yet.</span>
              </>
            ) : (
              <span className="pl-small pl-faint">No points expire in the next 30 days.</span>
            )}
          </section>

          <GiveTake brandId={brandId} formRef={giveRef} onDone={refresh} />
        </aside>
      </div>
    </div>
  );
}

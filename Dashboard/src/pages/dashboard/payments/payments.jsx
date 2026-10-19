import { useEffect, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Button, PageHeader, StatusPill, KpiTile, KpiGrid, FilterChips, ConfirmBar, EmptyState, ErrorState, SkeletonRows,
} from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import { paymentService, brandService } from "../../../services";
import { useAuth } from "../../../context/AuthContext";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, CreditCardIcon } from "@hugeicons/core-free-icons";

/* ──────────────────────────────────────────────────────────────
   Payments — money in and out, checked against Razorpay.
   Data (all server-side, Backend services/paymentsAdminService.js):
     GET  /api/payments/admin/summary     tiles + last nightly Razorpay check
     GET  /api/payments/admin/list        tabs, search (order / payment id / phone), paging
     GET  /api/payments/admin/mismatches  pending/failed here but captured at Razorpay
     POST /api/payments/admin/mismatches/fix   "Mark paid & confirm" (admin)
   Gateway fees use the "Payment gateway %" from Revenue & Profit
   (saved in this browser as rp_knobs.gatewayPct; 2% if never set).
   Styles: payLoyalty.css (.pl-*).
   ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;
const PERIODS = [{ value: 1, label: "Today" }, { value: 7, label: "7 days" }, { value: 30, label: "30 days" }];
const TABS = [
  { value: "all", label: "All" }, { value: "paid", label: "Paid" }, { value: "failed", label: "Failed" },
  { value: "pending", label: "Pending" }, { value: "refund", label: "Refunds" }, { value: "cod", label: "COD" },
  { value: "cancelled", label: "Cancelled" },
];
const EMPTY = {
  all: "No payments in this period.",
  paid: "No paid orders in this period.",
  failed: "No failed payments in this period — nice.",
  pending: "Nobody is half-way through paying right now.",
  refund: "No refunds in this period.",
  cod: "No cash-on-delivery orders in this period.",
  cancelled: "No cancelled payments in this period.",
};
// Row kind (from the server) → pill.
const KIND = {
  paid: ["Paid", "done"], cod_paid: ["COD collected", "done"],
  paid_refunded: ["Paid · refunded", "marketing"], paid_part_refunded: ["Paid · part refunded", "marketing"],
  refund: ["Refunded", "marketing"], partial: ["Part refunded", "marketing"],
  refund_failed: ["Refund failed", "problem"], refund_due: ["Refund due", "needs"],
  pending: ["Pending", "needs"], failed: ["Failed", "problem"],
  cod: ["COD — to collect", "progress"], cancelled: ["Cancelled", "neutral"],
};

const num = (n) => Number(n || 0).toLocaleString("en-IN");
const inr = (n) => `₹${num(Math.round(Math.abs(Number(n) || 0)))}`;
const plural = (n, w) => `${num(n)} ${w}${Number(n) === 1 ? "" : "s"}`;
const clock = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const fullDate = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "");
const istDay = (d) => new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
function when(d) {
  if (!d) return "—";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  if (mins < 6 * 60) return `${Math.floor(mins / 60)} h ago`;
  const today = istDay(Date.now());
  if (istDay(d) === today) return `Today ${clock(d)}`;
  if (istDay(d) === istDay(Date.now() - 86400000)) return `Yesterday ${clock(d)}`;
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
function gatewayPct() {
  try {
    const v = Number(JSON.parse(localStorage.getItem("rp_knobs") || "{}").gatewayPct);
    return Number.isFinite(v) && v >= 0 && v <= 10 ? v : 2;
  } catch { return 2; }
}
function goToView(view) {
  window.history.pushState({}, "", `/dashboard/${view}`);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
function openOrder(orderNumber) {
  if (!orderNumber) return;
  try { sessionStorage.setItem("obz-orders-search", orderNumber); } catch { /* storage blocked */ }
  goToView("orders");
}
const ic = (icon, size = 16) => <HugeiconsIcon icon={icon} size={size} strokeWidth={2} aria-hidden="true" />;

// ── Tiles ────────────────────────────────────────────────────────
function Tiles({ s, error, onRetry, retrying }) {
  if (error && !s) return <ErrorState message={`Couldn’t load the payment totals — ${error.message}`} onRetry={onRetry} retrying={retrying} />;
  const pct = gatewayPct();
  const co = s?.collectedOnline;
  let split = "loading…";
  if (co) {
    if (!co.amount) split = "no online payments";
    else if (!co.split.length) split = "UPI / card split not known yet";
    else {
      const top = co.split.slice(0, 2).map((m) => `${m.label} ${m.pct}%`);
      const rest = co.split.slice(2).reduce((t, m) => t + m.pct, 0);
      split = [...top, rest ? `other ${rest}%` : null].filter(Boolean).join(" · ") + (co.knownShare < 90 ? ` (of ${co.knownShare}% known)` : "");
    }
  }
  const f = s?.failed;
  const retried = f && f.orders ? Math.round((f.retriedPaid / f.orders) * 100) : 0;
  return (
    <KpiGrid className="pl-kpis">
      <KpiTile label="Collected online" value={co ? inr(co.amount) : "–"} sub={split} />
      <KpiTile label="COD to collect" value={s ? inr(s.codToCollect.amount) : "–"}
        sub={s ? `${plural(s.codToCollect.orders, "order")} with couriers right now` : ""} />
      <KpiTile label="Refunded" value={s ? inr(s.refunded.amount) : "–"} tone="marketing"
        sub={s ? `${plural(s.refunded.count, "refund")}${s.refunded.owed ? ` · ${num(s.refunded.owed)} still owed` : ""}` : ""} />
      <KpiTile label="Failed payments" value={f ? `${f.pct}%` : "–"} tone={f && f.pct >= 10 ? "problem" : "needs"}
        sub={f ? (f.attempts ? `${num(f.attempts)} ${f.attempts === 1 ? "try" : "tries"} · ${retried}% retried and paid` : "none in this period") : ""} />
      <KpiTile label="Gateway fees" value={co ? inr((co.amount * pct) / 100) : "–"}
        sub={`about ${pct}% of online · from Revenue & Profit`} />
    </KpiGrid>
  );
}

// ── "Doesn't match Razorpay" ─────────────────────────────────────
function Mismatches({ brandId, isAdmin }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);       // item key or 'all'
  const [confirm, setConfirm] = useState(null); // { kind: 'all' } | { kind: 'refund', item }
  const q = useQuery({
    queryKey: ["payments", "mismatches", brandId],
    queryFn: () => paymentService.mismatches({ brandId }),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
  const recheck = async () => {
    try {
      const fresh = await paymentService.mismatches({ brandId, refresh: true });
      qc.setQueryData(["payments", "mismatches", brandId], fresh);
    } catch (e) { showError(null, `Couldn’t check with Razorpay — ${e.message}`); }
  };
  const afterFix = () => {
    qc.invalidateQueries({ queryKey: ["payments", "mismatches"] });
    qc.invalidateQueries({ queryKey: ["payments", "list"] });
    qc.invalidateQueries({ queryKey: ["payments", "summary"] });
  };
  const bodyFor = (it, action) => (it.orderId ? { orderId: it.orderId } : { paymentId: it.paymentId, action });
  const fixOne = async (it, action = "create") => {
    setBusy(it.key);
    try {
      const r = await paymentService.fixMismatch(bodyFor(it, action));
      showSuccess(null, r.message);
      afterFix();
    } catch (e) { showError(null, e.message); }
    finally { setBusy(null); setConfirm(null); }
  };
  const fixable = (q.data?.items || []).filter((it) => it.orderId || it.canCreate);
  const fixAll = async () => {
    setBusy("all");
    let done = 0; const failed = [];
    for (const it of fixable) {
      try { await paymentService.fixMismatch(bodyFor(it, "create")); done++; }
      catch (e) { failed.push(`${it.orderNumber || "payment"}: ${e.message}`); }
    }
    if (done) showSuccess(null, `Fixed ${plural(done, "payment")}.`);
    if (failed.length) showError(null, failed.slice(0, 2).join(" · "));
    setBusy(null); setConfirm(null);
    afterFix();
  };

  if (q.isLoading) {
    return <section className="pl-mm pl-mm--quiet" aria-busy="true"><span className="pl-faint">Checking recent unpaid payments with Razorpay…</span></section>;
  }
  if (q.error && !q.data) {
    return <ErrorState message={`Couldn’t check payments with Razorpay — ${q.error.message}`} onRetry={() => q.refetch()} retrying={q.isFetching} />;
  }
  const d = q.data || {};
  const items = d.items || [];
  const checked = d.checkedAt ? when(d.checkedAt) : "";
  const foot = (
    <span className="pl-faint pl-small">
      {d.couldNotCheck ? <>Couldn’t check {plural(d.couldNotCheck, "payment")} with Razorpay{d.errorHint ? ` (${d.errorHint})` : ""}. </> : null}
      Checked {checked} · <button type="button" className="pl-link" onClick={recheck}>Check again</button>
    </span>
  );
  if (!items.length) {
    return (
      <section className="pl-mm pl-mm--quiet">
        <span className="pl-small">{d.checked ? `All ${plural(d.checked, "recent unpaid payment")} match Razorpay.` : "No unpaid online payments in the last 3 days to check."}</span>
        {foot}
      </section>
    );
  }
  return (
    <section className="pl-mm" aria-labelledby="pl-mm-title">
      <div className="pl-mm-head">
        <div className="pl-mm-text">
          <b id="pl-mm-title" className="pl-mm-title">{plural(items.length, "payment")} {items.length === 1 ? "doesn’t" : "don’t"} match Razorpay</b>
          <span className="pl-faint pl-small">Paid at Razorpay but not “paid” here — the customer paid and is waiting.</span>
        </div>
        {isAdmin && fixable.length > 1 && !confirm && (
          <Button size="sm" onClick={() => setConfirm({ kind: "all" })} disabled={!!busy}>Fix all {fixable.length}</Button>
        )}
      </div>
      {confirm?.kind === "all" && (
        <ConfirmBar tone="primary" busy={busy === "all"} confirmLabel={`Fix ${fixable.length}`} cancelLabel="Not now"
          message={<>Mark {plural(fixable.length, "payment")} paid and confirm the orders? Orders that were auto-cancelled are re-opened if the items are still in stock.{fixable.length < items.length ? " Payments that need a refund are left for you." : ""}</>}
          onConfirm={fixAll} onCancel={() => setConfirm(null)} />
      )}
      <div className="pl-scroll">
        <table className="pl-table pl-table--mm">
          <tbody>
            {items.map((it) => (
              <tr key={it.key}>
                <td>
                  <b>{it.orderNumber || "No order"}</b>{it.customer ? ` · ${it.customer}` : ""}
                  {it.brand && <div className="pl-faint pl-small">{it.brand}</div>}
                </td>
                <td className="pl-nowrap">{inr(it.amount)} · {it.methodLabel}</td>
                <td className="pl-why">
                  <span className="pl-faint">
                    {it.capturedAt ? `Razorpay: captured ${when(it.capturedAt)}` : "Razorpay: captured"} · here: {it.here === "no_order" ? "no order" : it.here}
                  </span>
                  {it.note && <div className="pl-small">{it.note}</div>}
                  {confirm?.kind === "refund" && confirm.item.key === it.key && (
                    <ConfirmBar busy={busy === it.key} confirmLabel={`Refund ${inr(it.amount)}`} cancelLabel="Keep"
                      message={<>Send {inr(it.amount)} back to the customer’s original payment method?</>}
                      onConfirm={() => fixOne(it, "refund")} onCancel={() => setConfirm(null)} />
                  )}
                </td>
                <td className="r">
                  {isAdmin ? (
                    <span className="pl-actions">
                      {it.orderId && (
                        <Button size="sm" variant="secondary" loading={busy === it.key} loadingText="Fixing…" disabled={!!busy && busy !== it.key}
                          onClick={() => fixOne(it)}>Mark paid &amp; confirm</Button>
                      )}
                      {!it.orderId && it.canCreate && (
                        <Button size="sm" variant="secondary" loading={busy === it.key} loadingText="Creating…" disabled={!!busy && busy !== it.key}
                          onClick={() => fixOne(it, "create")}>Create the order</Button>
                      )}
                      {!it.orderId && (
                        <Button size="sm" variant="quiet" disabled={!!busy} onClick={() => setConfirm({ kind: "refund", item: it })}>Refund</Button>
                      )}
                      {it.orderNumber && <Button size="sm" variant="quiet" onClick={() => openOrder(it.orderNumber)}>Open order</Button>}
                    </span>
                  ) : (
                    it.orderNumber ? <Button size="sm" variant="secondary" onClick={() => openOrder(it.orderNumber)}>Open order</Button> : null
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="pl-mm-foot">
        {!isAdmin && <span className="pl-small">Ask an admin to fix these.</span>}
        {foot}
      </div>
    </section>
  );
}

// ── Page ─────────────────────────────────────────────────────────
export default function Payments() {
  const { isAdmin } = useAuth() || {};
  const [period, setPeriod] = useState(7);
  const [tab, setTab] = useState("all");
  const [brandId, setBrandId] = useState("");
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true).then((r) => { if (!off && r?.success) setBrands(r.data || []); }).catch(() => {});
    return () => { off = true; };
  }, []);
  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [period, tab, brandId, q]);

  const summary = useQuery({
    queryKey: ["payments", "summary", period, brandId],
    queryFn: () => paymentService.summary({ period, brandId: brandId || undefined }),
    staleTime: 60 * 1000,
  });
  const params = { period, tab, page, limit: PAGE_SIZE, ...(q ? { q } : {}), ...(brandId ? { brandId } : {}) };
  const list = useQuery({
    queryKey: ["payments", "list", params],
    queryFn: () => paymentService.list(params),
    placeholderData: keepPreviousData,
    staleTime: 20 * 1000,
  });
  const rows = list.data?.rows || [];
  const total = list.data?.total || 0;
  const pages = list.data?.pages || 1;
  useEffect(() => { if (list.data && !list.isPlaceholderData && page > pages) setPage(pages); }, [list.data, list.isPlaceholderData, page, pages]);
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);

  const s = summary.data;
  const nightly = s?.nightlyCheck;
  const brandOpts = [{ value: "", label: "All brands" }, ...brands.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))];

  return (
    <div className="dashboard-sections pl-page">
      <PageHeader
        title="Payments"
        description="Money in and out, checked against Razorpay every night at 3 am."
        actions={(
          <div className="pl-head-tools">
            <Dropdown value={brandId} onChange={(v) => setBrandId(String(v))} options={brandOpts} className="pl-dd" />
            <FilterChips ariaLabel="Period" items={PERIODS} value={period} onChange={setPeriod} />
          </div>
        )}
      >
        <p className="pl-faint pl-small pl-nightly">
          {!s ? " " : nightly
            ? <>Last Razorpay check ({fullDate(nightly.at)}): {nightly.summary || (nightly.status === "failed" ? "didn’t finish" : "done")}{nightly.status === "failed" && nightly.error ? ` — ${nightly.error.split("\n")[0]}` : ""}.{s.fixedThisWeek ? ` ${plural(s.fixedThisWeek, "order")} fixed from Razorpay this week.` : ""}</>
            : "The nightly Razorpay check hasn’t run yet."}
        </p>
      </PageHeader>

      <Tiles s={s} error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} />

      <Mismatches brandId={brandId} isAdmin={!!isAdmin} />

      <div className="pl-toolbar">
        <FilterChips ariaLabel="Payment status" items={TABS} value={tab} onChange={setTab} controls="pl-pay-list" />
        <label className="pl-search">
          {ic(Search01Icon)}
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Order, payment ID or phone" aria-label="Search payments" />
        </label>
      </div>

      <section id="pl-pay-list" className="pl-card" aria-busy={list.isFetching || undefined}>
        {list.isLoading ? (
          <SkeletonRows rows={6} label="Loading payments…" />
        ) : list.error && !list.data ? (
          <ErrorState message={`Couldn’t load payments — ${list.error.message}`} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : rows.length === 0 ? (
          <EmptyState compact icon={ic(CreditCardIcon, 22)}
            title={q ? "No payments match your search" : "Nothing here"}
            description={q ? "Try the full order number, a Razorpay payment ID (pay_…) or a 10-digit phone number." : EMPTY[tab]} />
        ) : (
          <div className="pl-scroll">
            <table className="pl-table pl-table--pay">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Method</th><th className="r">Amount</th><th>Status</th><th>Why</th><th>When</th><th aria-label="Actions" /></tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const [label, tone] = KIND[r.kind] || [r.kind, "neutral"];
                  return (
                    <tr key={r.key}>
                      <td>
                        <b>{r.orderNumber || <span className="pl-faint">No order yet</span>}</b>
                        {r.ref && <div className="pl-mono pl-faint" title={r.ref}>{r.ref}</div>}
                      </td>
                      <td>{r.customer || <span className="pl-faint">—</span>}{r.brand && !brandId && <div className="pl-faint pl-small">{r.brand}</div>}</td>
                      <td className="pl-nowrap">{r.methodLabel}</td>
                      <td className={`r pl-nowrap pl-amt${r.amount < 0 ? " is-out" : ""}`}><b>{r.amount < 0 ? `−${inr(r.amount)}` : inr(r.amount)}</b></td>
                      <td><StatusPill tone={tone} size="sm">{label}</StatusPill></td>
                      <td className="pl-why">{r.why || <span className="pl-faint">—</span>}</td>
                      <td className="pl-nowrap pl-faint" title={fullDate(r.at)}>{when(r.at)}</td>
                      <td className="r">
                        {r.orderNumber && <Button size="sm" variant="secondary" onClick={() => openOrder(r.orderNumber)}>Open order</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="pl-foot">
          <span className="pl-faint">
            {list.error && list.data ? "Couldn’t refresh — showing the last list. " : ""}
            {list.data?.searchedAllDates ? "Searching all dates." : `${period === 1 ? "Today" : `Last ${period} days`}${brandId ? "" : ", all brands"}.`}
          </span>
          {total > 0 && (
            <span className="pl-pager">
              <span className="pl-num">{num(from)}–{num(to)} of {num(total)}</span>
              <Button size="sm" variant="secondary" disabled={page <= 1 || list.isFetching} onClick={() => setPage((p) => p - 1)}>← Prev</Button>
              <Button size="sm" variant="secondary" disabled={to >= total || list.isFetching} onClick={() => setPage((p) => p + 1)}>Next →</Button>
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Button, PageHeader, StatusPill, KpiTile, KpiGrid, FilterChips, ConfirmBar, EmptyState, ErrorState,
  Skeleton, SkeletonKpis, SkeletonTableRows, Input,
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
const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });
const inr = (n) => rupees.format(Math.abs(Number(n) || 0));
const paymentAmount = (payment) => payment.currency === "INR"
  ? inr(payment.amount) : `${payment.amount ?? "—"} ${payment.currency || ""}`;
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
const DIM = { opacity: 0.6, transition: "opacity .15s" };

function RazorpayLookup({ brands, period, isAdmin }) {
  const qc = useQueryClient();
  const [reference, setReference] = useState("");
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [shiprocketBrand, setShiprocketBrand] = useState("");
  const [shiprocketOrderId, setShiprocketOrderId] = useState("");
  const [scan, setScan] = useState(null);
  const brandName = (id) => {
    const brand = brands.find((item) => String(item.id) === String(id));
    return brand?.display_name || brand?.name || "Unknown";
  };

  useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);
  const currentScan = scan?.period === period ? scan : null;
  const resetResult = () => {
    setResult(null); setError(""); setConfirm(false);
    setShiprocketBrand(""); setShiprocketOrderId("");
  };
  const check = async (paymentId) => {
    if (!/^pay_[a-zA-Z0-9]{6,64}$/.test(paymentId) || busy) return;
    setReference(paymentId);
    resetResult();
    setBusy("check");
    try {
      const payment = await paymentService.checkRazorpayPayment(paymentId);
      setResult(payment);
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };
  const scanForMissingOrders = async (continueScan = false) => {
    if (busy) return;
    const previous = continueScan ? currentScan : null;
    setBusy("scan");
    setError("");
    try {
      const fresh = await paymentService.findMissingRazorpayOrders({
        period,
        ...(previous ? { offset: previous.nextOffset, until: previous.until } : {}),
      });
      const items = new Map((previous?.items || []).map((item) => [item.paymentId, item]));
      fresh.items.forEach((item) => items.set(item.paymentId, item));
      setScan({ ...fresh, items: [...items.values()], checked: fresh.checked + (previous?.checked || 0), period });
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };
  const canImportShiprocket = isAdmin && result?.remote.status === "captured" && !result.order && !result.canCreate;
  const recover = async () => {
    const shiprocket = confirm === "shiprocket"
      ? { brand: shiprocketBrand, orderId: shiprocketOrderId.trim() }
      : null;
    if (!isAdmin || busy || (shiprocket
      ? !canImportShiprocket || !shiprocket.brand || !shiprocket.orderId
      : !(result?.canCreate || result?.canLink))) return;
    setBusy("recover");
    setError("");
    try {
      const recovered = await paymentService.recoverRazorpayPayment(result.remote.id, shiprocket);
      setResult({ ...result, brandId: recovered.order?.brand_id ?? result.brandId, order: { ...result.order, ...recovered.order }, canCreate: false, canLink: false, reason: null });
      setScan((previous) => previous && {
        ...previous, items: previous.items.filter((item) => item.paymentId !== result.remote.id),
      });
      showSuccess(null, recovered.message);
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (e) { setError(e.message); }
    finally { setBusy(null); setConfirm(false); }
  };

  return (
    <section className="pl-card pl-rzp" id="razorpay-check" aria-labelledby="pl-rzp-title">
      <header className="pl-rzp__heading">
        <h2 id="pl-rzp-title">Razorpay reconciliation</h2>
        <p className="pl-faint pl-small">Check the shared Razorpay account against orders from all brands.</p>
      </header>
      <div className="pl-rzp__tools">
        <form className="pl-rzp__form" onSubmit={(event) => { event.preventDefault(); check(reference.trim()); }}>
          <Input label="Payment ID" name="rzp-lookup-reference" value={reference} placeholder="pay_…" maxLength={68}
            autoComplete="off" spellCheck={false} disabled={!!busy} required pattern="pay_[a-zA-Z0-9]{6,64}"
            onChange={(event) => { setReference(event.target.value); resetResult(); }} />
          <Button type="submit" loading={busy === "check"} loadingText="Checking…" disabled={!reference.trim() || !!busy}>Check payment</Button>
        </form>
        <div className="pl-rzp__scan">
          <div>
            <h3>Missing orders</h3>
            <p className="pl-faint pl-small">{period === 1 ? "Today" : `Last ${period} days`}</p>
          </div>
          <Button variant="secondary" onClick={() => scanForMissingOrders()}
            disabled={!!busy} loading={busy === "scan" && !currentScan} loadingText="Scanning…">
            {currentScan ? "Start a new scan" : "Find missing orders"}
          </Button>
        </div>
      </div>
      {error && <p role="alert" className="pl-rzp__error">{error}</p>}
      {result && (
        <div className="pl-rzp__result" ref={resultRef} tabIndex={-1}>
          <strong>{result.order ? `Order #${result.order.order_number}` : "No order found"}</strong>
          <div>Razorpay: {result.remote.status} · {paymentAmount(result.remote)}</div>
          <span>Brand {brandName(result.brandId)}</span>
          <span>Payment ID <code>{result.remote.id}</code></span>
          {result.remote.orderId && <span>Razorpay order <code>{result.remote.orderId}</code></span>}
          {result.order?.payment_id && result.order.payment_id !== result.remote.id && (
            <span>Payment ID on order <code>{result.order.payment_id}</code></span>
          )}
          {result.order?.razorpay_order_id && result.order.razorpay_order_id !== result.remote.orderId && (
            <span>Saved Razorpay order <code>{result.order.razorpay_order_id}</code></span>
          )}
          {result.order?.amount_paid != null && result.remote.currency === "INR" && result.order.amount_paid !== result.remote.amount && (
            <span>Saved payment amount {inr(result.order.amount_paid)}</span>
          )}
          {result.order?.payment_status && <span>Order payment: {result.order.payment_status}</span>}
          {result.reason && <p>{result.reason}</p>}
          {result.order && <Button size="sm" variant="secondary" onClick={() => openOrder(result.order.order_number)}>Open order</Button>}
          {(result.canCreate || result.canLink) && !isAdmin && <p>Ask an admin to {result.canLink ? "save the payment ID" : "recover this order"}.</p>}
          {(result.canCreate || result.canLink) && isAdmin && (!confirm
            ? <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => setConfirm(true)}>{result.canLink ? "Save payment ID" : "Recover order"}</Button>
            : <ConfirmBar tone="primary" busy={busy === "recover"} confirmLabel={result.canLink ? "Save payment ID" : "Recover order"}
              message={result.canLink ? "Save the verified Razorpay payment ID on this paid order?" : "Create the paid order from the saved checkout and continue with fulfillment?"}
              onConfirm={recover} onCancel={() => setConfirm(false)} />)}
          {canImportShiprocket && (
            <>
              <form className="pl-rzp__form pl-rzp__recover" onSubmit={(event) => {
                event.preventDefault();
                if (shiprocketBrand && shiprocketOrderId.trim()) setConfirm("shiprocket");
              }}>
                <Input type="select" name="shiprocket-recover-store" label="Store" value={shiprocketBrand}
                  disabled={!!busy} options={brands.filter((brand) => brand.status === "active" && brand.slug)
                    .map((brand) => ({ value: brand.slug, label: brand.display_name || brand.name }))}
                  onChange={(event) => { setShiprocketBrand(event.target.value); setConfirm(false); }} />
                <Input name="shiprocket-recover-order" label="Shiprocket order ID" value={shiprocketOrderId} maxLength={100} required
                  disabled={!!busy} onChange={(event) => { setShiprocketOrderId(event.target.value); setConfirm(false); }} />
                <Button type="submit" variant="secondary" disabled={!!busy || !shiprocketBrand || !shiprocketOrderId.trim()}>Recover Shiprocket order</Button>
              </form>
              {confirm === "shiprocket" && (
                <ConfirmBar tone="primary" busy={busy === "recover"} confirmLabel="Verify and create order"
                  message="Check the Shiprocket order against the captured payment and create the order if they match?"
                  onConfirm={recover} onCancel={() => setConfirm(false)} />
              )}
            </>
          )}
        </div>
      )}
      {currentScan && (
        <div className="pl-rzp__result">
          <p role="status" className="pl-small">{plural(currentScan.checked, "payment")} checked · {plural(currentScan.items.length, "payment")} to review</p>
          {currentScan.items.length > 0 && (
            <div className="pl-scroll pl-rzp__scan-table">
              <table className="pl-table" aria-label="Captured Razorpay payments to review">
                <thead><tr><th>Payment ID</th><th>Amount</th><th>When</th><th>Brand</th><th>Payment record</th><th aria-label="Actions" /></tr></thead>
                <tbody>
                  {currentScan.items.map((item) => (
                    <tr key={item.paymentId}>
                      <td><code>{item.paymentId}</code></td><td className="pl-nowrap">{paymentAmount(item)}</td>
                      <td>{fullDate(item.at) || "—"}</td>
                      <td>{brandName(item.brandId)}</td>
                      <td>{item.matchIssue || (item.hasLocalPayment ? "Saved locally" : "Razorpay only")}</td>
                      <td><Button size="sm" variant="secondary" disabled={!!busy} onClick={() => check(item.paymentId)}>Review payment</Button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {currentScan.nextOffset != null && (
            <Button size="sm" variant="secondary" onClick={() => scanForMissingOrders(true)}
              loading={busy === "scan"} loadingText="Scanning…" disabled={!!busy}>Scan next batch</Button>
          )}
        </div>
      )}
      <div className="pl-rzp__recent">
        <Mismatches isAdmin={isAdmin} />
      </div>
    </section>
  );
}

function Tiles({ s, error, onRetry, retrying, stale }) {
  if (error && !s) return <ErrorState message={`Couldn’t load the payment totals — ${error.message}`} onRetry={onRetry} retrying={retrying} />;
  if (!s) return <SkeletonKpis count={5} label="Loading payment totals…" className="pl-kpis" />;
  const pct = gatewayPct();
  const co = s?.collectedOnline;
  let split = "";
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
    <div style={stale ? DIM : undefined} aria-busy={stale || undefined}>
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
    </div>
  );
}

// ── "Doesn't match Razorpay" ─────────────────────────────────────
function Mismatches({ isAdmin }) {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(null);       // item key or 'all'
  const [confirm, setConfirm] = useState(null); // { kind: 'all' } | { kind: 'refund', item }
  const q = useQuery({
    queryKey: ["payments", "mismatches"],
    queryFn: () => paymentService.mismatches({}),
    staleTime: 5 * 60 * 1000,
    retry: 0,
  });
  const recheck = async () => {
    try {
      const fresh = await paymentService.mismatches({ refresh: true });
      qc.setQueryData(["payments", "mismatches"], fresh);
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
    return (
      <section className="pl-mm pl-mm--quiet" role="status" aria-busy="true">
        <span className="ds-sr-only">Checking recent unpaid payments with Razorpay…</span>
        <Skeleton w="min(360px, 70%)" h={12} />
        <Skeleton w="min(220px, 45%)" h={10} />
      </section>
    );
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
                  {it.razorpayPaymentId && <code className="pl-small">{it.razorpayPaymentId}</code>}
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

  // Period / brand change keeps the old totals on screen (dimmed) until the new ones land.
  const summary = useQuery({
    queryKey: ["payments", "summary", period, brandId],
    queryFn: () => paymentService.summary({ period, brandId: brandId || undefined }),
    placeholderData: keepPreviousData,
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
          {!s ? <Skeleton w="min(420px, 80%)" h={11} style={{ display: "inline-block", verticalAlign: "middle" }} /> : nightly
            ? <>Last Razorpay check ({fullDate(nightly.at)}): {nightly.summary || (nightly.status === "failed" ? "didn’t finish" : "done")}{nightly.status === "failed" && nightly.error ? ` — ${nightly.error.split("\n")[0]}` : ""}.{s.fixedThisWeek ? ` ${plural(s.fixedThisWeek, "order")} fixed from Razorpay this week.` : ""}</>
            : "The nightly Razorpay check hasn’t run yet."}
        </p>
      </PageHeader>

      <Tiles s={s} error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} stale={summary.isPlaceholderData} />

      <RazorpayLookup brands={brands} period={period} isAdmin={!!isAdmin} />

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
          <div className="pl-scroll" role="status" aria-busy="true">
            <span className="ds-sr-only">Loading payments…</span>
            <table className="pl-table pl-table--pay" aria-hidden="true">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Method</th><th className="r">Amount</th><th>Status</th><th>Why</th><th>When</th><th /></tr>
              </thead>
              <tbody><SkeletonTableRows rows={8} cols={8} /></tbody>
            </table>
          </div>
        ) : list.error && !list.data ? (
          <ErrorState message={`Couldn’t load payments — ${list.error.message}`} onRetry={() => list.refetch()} retrying={list.isFetching} />
        ) : rows.length === 0 ? (
          <EmptyState compact icon={ic(CreditCardIcon, 22)}
            title={q ? "No payments match your search" : "Nothing here"}
            description={q ? "Try the full order number, a Razorpay payment ID (pay_…) or a 10-digit phone number." : EMPTY[tab]} />
        ) : (
          <div className="pl-scroll" style={list.isFetching ? DIM : undefined}>
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

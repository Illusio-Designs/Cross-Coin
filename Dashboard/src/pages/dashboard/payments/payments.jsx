import { browserCostRates } from "../../../lib/reportCostRates";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  Button, PageHeader, StatusPill, KpiTile, KpiGrid, FilterChips, ConfirmBar, EmptyState, ErrorState,
  Skeleton, SkeletonKpis, SkeletonTableRows, Input, DateRangePicker,
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
   (shared profit rates, with the legacy browser rate as a fallback).
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
const PAYMENT_METHOD_LABEL = {
  upi: "UPI", card: "Card", netbanking: "Netbanking", wallet: "Wallet", emi: "EMI",
  cardless_emi: "Cardless EMI", paylater: "Pay later", bank_transfer: "Bank transfer", other: "Other",
};
const DIM = { opacity: 0.6, transition: "opacity .15s" };

function PaymentRecoveryCard({ item, brand, isAdmin, busy, onCreate, onReview }) {
  const [confirm, setConfirm] = useState(false);
  const { verification, recovery } = item;
  const [label, tone] = verification === "verified" ? ["Verified checkout", "done"]
    : verification === "checking" ? ["Checking Shiprocket", "progress"]
      : [item.kind === "conflict" ? "Payment conflict" : "Needs review", "needs"];
  return (
    <li className="pl-rzp__scan-card">
      <div className="pl-rzp__scan-head">
        <code>{item.paymentId}</code>
        <strong>{paymentAmount(item)}</strong>
      </div>
      <p className="pl-small pl-faint">
        {brand}{item.method && ` · ${PAYMENT_METHOD_LABEL[item.method] || "Other"}`} · {fullDate(item.at) || "Unknown time"}
      </p>
      <div className="pl-rzp__scan-status">
        <StatusPill tone={tone} size="sm">{label}</StatusPill>
        {verification === "verified" && (
          <span className="pl-small">{plural(item.verified.itemCount, "item")} · <code>{item.verified.checkoutRef}</code></span>
        )}
      </div>
      {item.reason && <p className="pl-small">{item.reason}</p>}
      {item.checkoutRef && verification !== "verified" && (
        <p className="pl-small pl-faint">Checkout <code>{item.checkoutRef}</code></p>
      )}
      {recovery?.updatedAt && (
        <p className="pl-small pl-faint">
          Recovery updated {fullDate(recovery.updatedAt)}
          {recovery.nextAttemptAt && ` · Next retry ${fullDate(recovery.nextAttemptAt)}`}
        </p>
      )}
      {recovery?.reason && verification !== "verified" && recovery.reason !== item.reason &&
        <p className="pl-small pl-faint">{recovery.reason}</p>}
      {isAdmin && verification === "verified" && (confirm
        ? <ConfirmBar tone="primary" busy={!!busy} confirmLabel="Create order" message="Create the paid order from this verified checkout?"
          onConfirm={() => onCreate(item).finally(() => setConfirm(false))} onCancel={() => setConfirm(false)} />
        : <Button size="sm" disabled={!!busy} onClick={() => setConfirm(true)}>Create order</Button>)}
      {verification === "review" &&
        <Button size="sm" variant="secondary" disabled={!!busy} onClick={() => onReview(item.paymentId)}>Review payment</Button>}
    </li>
  );
}

function MissingRazorpayOrders({ brands, isAdmin }) {
  const qc = useQueryClient();
  const [result, setResult] = useState(null);
  const resultRef = useRef(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(false);
  const [scan, setScan] = useState(null);
  const [date, setDate] = useState(() => istDay(Date.now()));
  const [checkoutHint, setCheckoutHint] = useState({ brandId: "", ref: "" });
  const [verifiedLookup, setVerifiedLookup] = useState(null);
  const scanRequest = useRef(null);
  const brandName = (id) => {
    const brand = brands.find((item) => String(item.id) === String(id));
    return brand?.display_name || brand?.name || "Unknown";
  };

  useEffect(() => { if (result) resultRef.current?.focus(); }, [result]);
  useEffect(() => () => scanRequest.current?.abort(), []);
  const currentScan = scan?.date === date ? scan : null;
  const resetResult = () => {
    setResult(null); setError(""); setConfirm(false);
    setCheckoutHint({ brandId: "", ref: "" });
    setVerifiedLookup(null);
  };
  const check = async (paymentId) => {
    if (!/^pay_[a-zA-Z0-9]{6,64}$/.test(paymentId) || busy) return;
    resetResult();
    setBusy("check");
    try {
      const payment = await paymentService.checkRazorpayPayment(paymentId, date);
      setResult(payment);
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };
  const removeMatchedPayment = (paymentId, createdOrder) => {
    setScan((previous) => {
      const matched = previous?.items.find((item) => item.paymentId === paymentId);
      if (!matched) return previous;
      const items = previous.items.filter((item) => item.paymentId !== paymentId);
      const counter = matched.kind === "conflict" ? "conflicts" : "missing";
      return { ...previous, items, lastCreatedOrder: createdOrder || previous.lastCreatedOrder,
        totals: { ...previous.totals, matched: previous.totals.matched + 1, [counter]: previous.totals[counter] - 1 } };
    });
  };
  const updateScanItem = (paymentId, changes) => {
    setScan((previous) => previous && {
      ...previous, items: previous.items.map((item) => item.paymentId === paymentId ? { ...item, ...changes } : item),
    });
  };
  const verifyItem = async (item, selectedDate, signal) => {
    try {
      const verified = await paymentService.recoverRazorpayPayment(item.paymentId, {
        verifyOnly: true, ref: item.checkoutRef, brandId: item.checkoutBrandId, date: selectedDate,
      }, signal);
      if (signal?.aborted) return;
      if (verified.order) removeMatchedPayment(item.paymentId);
      else updateScanItem(item.paymentId, { verification: "verified", reason: null, verified });
    } catch (e) {
      if (!signal?.aborted) updateScanItem(item.paymentId, { verification: "review", reason: e.message, verified: null });
    }
  };
  const scanForMissingOrders = async () => {
    if (busy || !date) return;
    scanRequest.current?.abort();
    const request = new AbortController();
    scanRequest.current = request;
    setBusy("scan");
    resetResult();
    setScan(null);
    let eligible = [];
    try {
      const fresh = await paymentService.findMissingRazorpayOrders(date, request.signal);
      if (request.signal.aborted) return;
      if (fresh.date !== date) throw new Error("The API did not confirm the selected date. Try the date check again.");
      eligible = isAdmin ? fresh.items.filter((item) => item.canVerify) : [];
      setScan({ ...fresh, date, items: fresh.items.map((item) => ({
        ...item, verification: isAdmin && item.canVerify ? "checking" : "review",
      })) });
    } catch (e) {
      if (!request.signal.aborted) setError(e.message);
    } finally {
      if (!request.signal.aborted) setBusy(null);
    }
    let index = 0;
    const verifyNext = async () => {
      while (!request.signal.aborted && index < eligible.length) {
        const item = eligible[index++];
        await verifyItem(item, date, request.signal);
      }
    };
    await Promise.all(Array.from({ length: Math.min(4, eligible.length) }, verifyNext));
  };
  const canImportShiprocket = isAdmin && result?.remote.status === "captured" && !result.order && !result.canCreate;
  const verifyLookupCheckout = async () => {
    if (!canImportShiprocket || busy) return;
    setBusy("verify-lookup");
    setError("");
    try {
      const verified = await paymentService.recoverRazorpayPayment(result.remote.id, {
        ...checkoutHint, ref: checkoutHint.ref.trim(), verifyOnly: true,
        date: result.remote.at ? istDay(Date.parse(result.remote.at)) : date,
      });
      if (verified.order) {
        setResult({ ...result, order: verified.order, brandId: verified.order.brand_id ?? result.brandId, reason: null });
        removeMatchedPayment(result.remote.id);
      } else {
        setVerifiedLookup(verified);
      }
    } catch (e) { setError(e.message); }
    finally { setBusy(null); }
  };
  const recover = async () => {
    const shiprocket = confirm === "shiprocket";
    if (!isAdmin || busy || (shiprocket ? !canImportShiprocket || !verifiedLookup?.checkoutRef : !(result?.canCreate || result?.canLink))) return;
    setBusy("recover");
    setError("");
    try {
      const recovered = await paymentService.recoverRazorpayPayment(result.remote.id,
        shiprocket ? { ref: verifiedLookup.checkoutRef, brandId: verifiedLookup.brandId,
          date: result.remote.at ? istDay(Date.parse(result.remote.at)) : date } : null);
      setResult({ ...result, brandId: recovered.order?.brand_id ?? result.brandId, order: { ...result.order, ...recovered.order }, canCreate: false, canLink: false, reason: null });
      if (recovered.order?.order_number) removeMatchedPayment(result.remote.id, recovered.order.order_number);
      showSuccess(null, recovered.message);
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (e) { setError(e.message); if (shiprocket) setVerifiedLookup(null); }
    finally { setBusy(null); setConfirm(false); }
  };

  const createVerifiedOrder = async (item) => {
    if (!isAdmin || busy || !item.verified?.checkoutRef) return;
    setBusy(item.paymentId);
    setError("");
    try {
      const recovery = await paymentService.recoverRazorpayPayment(item.paymentId, {
        ref: item.verified.checkoutRef, brandId: item.verified.brandId, date,
      });
      removeMatchedPayment(item.paymentId, recovery.order?.order_number);
      showSuccess(null, recovery.message);
      qc.invalidateQueries({ queryKey: ["payments"] });
    } catch (e) {
      updateScanItem(item.paymentId, { verification: "review", reason: e.message, verified: null });
    } finally { setBusy(null); }
  };

  return (
    <section className="pl-card pl-rzp" id="razorpay-check" aria-labelledby="pl-rzp-title">
      <header className="pl-rzp__heading">
        <h2 id="pl-rzp-title">Missing Razorpay orders</h2>
        <p className="pl-faint pl-small">Find captured payments with missing orders across all brands.</p>
      </header>
      <form className="pl-rzp__form" onSubmit={(event) => { event.preventDefault(); scanForMissingOrders(); }}>
        <DateRangePicker label="Missing orders date (IST)" inline single showIcon={false} startDate={date}
          maxDate={istDay(Date.now())} disabled={!!busy} className="pl-rzp__date"
          onStartChange={(selectedDate) => {
            if (selectedDate === date) return;
            scanRequest.current?.abort();
            setDate(selectedDate);
            setScan(null);
            resetResult();
          }} />
        <Button type="submit" disabled={!!busy || !date}
          loading={busy === "scan"} loadingText="Checking Razorpay…">Find missing orders</Button>
      </form>
      {error && <p role="alert" className="pl-rzp__error">{error}</p>}
      {currentScan && (
        <div className="pl-rzp__result">
          <div className="pl-rzp__scan-counts" role="status">
            <span><b>{num(currentScan.totals.captured)}</b> Captured</span>
            <span><b>{num(currentScan.totals.matched)}</b> Matched</span>
            <span className={currentScan.totals.missing > 0 ? "needs-review" : undefined}><b>{num(currentScan.totals.missing)}</b> Missing</span>
            <span className={currentScan.totals.conflicts > 0 ? "has-conflicts" : undefined}><b>{num(currentScan.totals.conflicts)}</b> Conflicts</span>
          </div>
          {currentScan.lastCreatedOrder && (
            <Button size="sm" variant="secondary" onClick={() => openOrder(currentScan.lastCreatedOrder)}>
              Open order {currentScan.lastCreatedOrder}
            </Button>
          )}
          {!currentScan.items.length && <p className="pl-small pl-faint">No missing orders or payment conflicts for this day.</p>}
          {currentScan.items.length > 0 && (
            <ul className="pl-rzp__scan-list" aria-label="Razorpay payments that need review">
              {currentScan.items.map((item) => (
                <PaymentRecoveryCard key={item.paymentId} item={item}
                  brand={brandName(item.verified?.orderBrandId ?? item.brandId ?? item.checkoutBrandId)}
                  isAdmin={isAdmin} busy={busy} onCreate={createVerifiedOrder} onReview={check} />
              ))}
            </ul>
          )}
        </div>
      )}
      {result && (
        <div className="pl-rzp__result" ref={resultRef} tabIndex={-1}>
          <strong>{result.order ? `Order #${result.order.order_number}` : "No order found"}</strong>
          <div>Razorpay: {result.remote.status} · {paymentAmount(result.remote)}
            {result.remote.method && ` · ${PAYMENT_METHOD_LABEL[result.remote.method] || "Other"}`}
          </div>
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
              <div className="pl-rzp__form">
                <Input type="select" name="recovery-store" label="Store for a known checkout" value={checkoutHint.brandId}
                  onChange={(event) => { setConfirm(false); setVerifiedLookup(null); setCheckoutHint({ ...checkoutHint, brandId: event.target.value }); }}
                  options={brands.filter((brand) => brand.status === "active").map((brand) => (
                    { value: String(brand.id), label: brand.display_name || brand.name }
                  ))} disabled={!!busy} />
                <Input name="recovery-checkout-reference" label="Shiprocket checkout reference" value={checkoutHint.ref}
                  onChange={(event) => { setConfirm(false); setVerifiedLookup(null); setCheckoutHint({ ...checkoutHint, ref: event.target.value }); }}
                  placeholder="Optional if checkout was recorded" maxLength={96} disabled={!!busy} />
              </div>
              {verifiedLookup?.checkoutRef ? (
                <>
                  <div>Verified checkout <code>{verifiedLookup.checkoutRef}</code></div>
                  {!confirm ? <Button size="sm" disabled={!!busy} onClick={() => setConfirm("shiprocket")}>Create order</Button>
                    : <ConfirmBar tone="primary" busy={busy === "recover"} confirmLabel="Create order"
                      message="Create this paid order from the verified Shiprocket checkout?"
                      onConfirm={recover} onCancel={() => setConfirm(false)} />}
                </>
              ) : (
                <Button size="sm" variant="secondary" disabled={!!busy || (!!checkoutHint.ref.trim() !== !!checkoutHint.brandId)}
                  loading={busy === "verify-lookup"} onClick={verifyLookupCheckout}>Verify checkout</Button>
              )}
            </>
          )}
        </div>
      )}
    </section>
  );
}

function DesktopMismatches({ isAdmin }) {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(max-width: 740px)");
    const update = () => setDesktop(!media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return desktop && <Mismatches isAdmin={isAdmin} />;
}

const COD_REMITTANCE_LABEL = {
  matched: "Matched", missing: "Order missing", conflict: "Conflicting records",
  not_cod: "Order is prepaid", amount_mismatch: "Amount mismatch",
};

function codRemittanceIssue(report) {
  if (report?.issues?.includes("access_denied")) return "iThink denied access to the remittance. Check the account credentials and remittance access.";
  if (report?.issues?.includes("timeout")) return "iThink took too long to respond. Try checking the remittance again.";
  return null;
}

function CodRemittance() {
  const [date, setDate] = useState(() => istDay(Date.now()));
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState("");
  const check = async (event) => {
    event.preventDefault();
    if (!date || busy) return;
    setBusy(true);
    setReport(null);
    setError("");
    try {
      const result = await paymentService.getCodRemittance(date);
      if (result.date !== date) throw new Error("The API did not confirm the remittance date.");
      setReport(result);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  return (
    <section className="pl-card pl-rzp" aria-labelledby="cod-remittance-title">
      <header className="pl-rzp__heading">
        <h2 id="cod-remittance-title">COD reconciliation</h2>
        <p className="pl-faint pl-small">Match iThink remittance shipments to website orders across all brands by AWB.</p>
      </header>
      <form className="pl-rzp__form" onSubmit={check}>
        <DateRangePicker label="Remittance date (IST)" className="pl-rzp__date" inline single showIcon={false}
          startDate={date} maxDate={istDay(Date.now())} disabled={busy}
          onStartChange={(value) => { if (value !== date) { setDate(value); setReport(null); setError(""); } }} />
        <Button type="submit" variant="secondary" loading={busy} loadingText="Checking iThink…" disabled={!date}>Check remittance</Button>
      </form>
      {error && <p role="alert" className="pl-rzp__error">{error}</p>}
      {report?.status === "not_configured" && <p role="status">Connect iThink credentials in Brand settings to check remittances.</p>}
      {report?.status === "unavailable" && <p role="alert">{codRemittanceIssue(report) || "iThink could not load this remittance. Try again."}</p>}
      {(report?.status === "ok" || report?.status === "partial") && (
        <div className="pl-rzp__result">
          {report.status === "partial" && <p role="alert">
            Showing partial remittance data. {codRemittanceIssue(report) || "Some iThink reports could not be loaded."}
          </p>}
          <p className="pl-small" role="status">
            {report.shipmentsAvailable === false ? "Shipment details unavailable"
              : `${plural(report.rows.length, "shipment")} · ${num(report.matched)} matched · ${num(report.rows.length - report.matched)} need review`}
            {report.netRemittedPaise != null && ` · Net remitted ${rupees.format(report.netRemittedPaise / 100)}`}
          </p>
          {!report.rows.length && report.status === "ok" && <p className="pl-small">No shipments reported for this remittance date.</p>}
          {report.rows.length > 0 && (
            <div className="pl-scroll pl-rzp__scan-table">
              <table className="pl-table" aria-label="iThink COD remittance">
                <thead><tr><th>AWB</th><th>Website order</th><th>Courier amount</th><th>Order amount</th><th>Status</th></tr></thead>
                <tbody>{report.rows.map((row) => (
                  <tr key={row.awb}>
                    <td><code>{row.awb}</code></td>
                    <td>{row.orderNumber ? <Button size="sm" variant="quiet" onClick={() => openOrder(row.orderNumber)}>{row.orderNumber}</Button> : "—"}</td>
                    <td>{row.amountPaise == null ? "—" : rupees.format(row.amountPaise / 100)}</td>
                    <td>{row.expectedPaise == null ? "—" : inr(row.expectedPaise / 100)}</td>
                    <td>{COD_REMITTANCE_LABEL[row.status]}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function Tiles({ s, error, onRetry, retrying, stale }) {
  if (error && !s) return <ErrorState message={`Couldn’t load the payment totals — ${error.message}`} onRetry={onRetry} retrying={retrying} />;
  if (!s) return <SkeletonKpis count={5} label="Loading payment totals…" className="pl-kpis" />;
  const pct = s.gatewayPct ?? browserCostRates().gatewayPct;
  const co = s?.collectedOnline;
  const cod = s?.codToCollect;
  const refunded = s?.refunded;
  let split = "";
  if (co) {
    if (!co.amount) split = "no online payments";
    else if (!co.split?.length) split = "UPI / card split not known yet";
    else {
      const top = co.split.slice(0, 2).map((m) => `${m.label} ${m.pct}%`);
      const rest = co.split.slice(2).reduce((t, m) => t + m.pct, 0);
      split = [...top, rest ? `other ${rest}%` : null].filter(Boolean).join(" · ") + (co.knownShare < 90 ? ` (of ${co.knownShare}% known)` : "");
    }
  }
  const f = s?.failed;
  const failedPct = Number.isFinite(f?.pct) ? f.pct : null;
  const retried = f && f.orders ? Math.round((f.retriedPaid / f.orders) * 100) : 0;
  return (
    <div style={stale ? DIM : undefined} aria-busy={stale || undefined}>
    <KpiGrid className="pl-kpis">
      <KpiTile label="Collected online" value={co ? inr(co.amount) : "–"} sub={split} />
      <KpiTile label="COD to collect" value={cod ? inr(cod.amount) : "–"}
        sub={cod ? `${plural(cod.orders, "order")} with couriers right now` : ""} />
      <KpiTile label="Refunded" value={refunded ? inr(refunded.amount) : "–"} tone="marketing"
        sub={refunded ? `${plural(refunded.count, "refund")}${refunded.owed ? ` · ${num(refunded.owed)} still owed` : ""}` : ""} />
      <KpiTile label="Failed payments" value={failedPct == null ? "–" : `${failedPct}%`}
        tone={failedPct >= 10 ? "problem" : failedPct > 0 ? "needs" : undefined}
        sub={f ? (f.attempts ? `${num(f.attempts)} ${f.attempts === 1 ? "try" : "tries"} · ${retried}% retried and paid` : "none in this period") : ""} />
      <KpiTile label="Gateway fees" value={co ? inr((co.amount * pct) / 100) : "–"}
        sub={`Estimated at ${pct}% of online payments`} />
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
const PAYMENT_VIEWS = [
  { value: "activity", label: "Payment activity", hash: "#payment-activity" },
  { value: "prepaid", label: "Missing orders", hash: "#razorpay-check" },
  { value: "cod", label: "COD reconciliation", hash: "#cod-reconciliation" },
];
const viewFromLocation = () => typeof window === "undefined" ? "activity"
  : PAYMENT_VIEWS.find(({ hash }) => hash === window.location.hash)?.value || "activity";

export default function Payments() {
  const { isAdmin } = useAuth() || {};
  const [view, setView] = useState(viewFromLocation);
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

  useEffect(() => {
    const syncView = () => setView(viewFromLocation());
    window.addEventListener("hashchange", syncView);
    window.addEventListener("popstate", syncView);
    return () => {
      window.removeEventListener("hashchange", syncView);
      window.removeEventListener("popstate", syncView);
    };
  }, []);
  const changeView = (value) => {
    setView(value);
    const hash = PAYMENT_VIEWS.find((item) => item.value === value).hash;
    window.history.replaceState(window.history.state, "", hash);
  };

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
      />
      <FilterChips ariaLabel="Payments view" items={PAYMENT_VIEWS}
        value={view} onChange={changeView} controls="pl-workspace" />

      <div id="pl-workspace" role="tabpanel" aria-label={PAYMENT_VIEWS.find((item) => item.value === view)?.label}>
        <div className="pl-view" hidden={view !== "prepaid"}>
          <MissingRazorpayOrders brands={brands} isAdmin={!!isAdmin} />
          <DesktopMismatches isAdmin={!!isAdmin} />
          <p className="pl-faint pl-small pl-nightly">
            {nightly
              ? <>Last Razorpay check ({fullDate(nightly.at)}): {nightly.summary || (nightly.status === "failed" ? "didn’t finish" : "done")}{nightly.status === "failed" && nightly.error ? ` — ${nightly.error.split("\n")[0]}` : ""}.{s.fixedThisWeek ? ` ${plural(s.fixedThisWeek, "order")} fixed from Razorpay this week.` : ""}</>
              : s ? "The nightly Razorpay check hasn’t run yet." : null}
          </p>
        </div>
        <div className="pl-view" hidden={view !== "cod"}>
          <CodRemittance />
        </div>
        <div className="pl-view" hidden={view !== "activity"}>
          <div className="pl-head-tools" role="group" aria-label="Payment activity filters">
            <Dropdown ariaLabel="Brand" value={brandId} onChange={(v) => setBrandId(String(v))} options={brandOpts} className="pl-dd" />
            <FilterChips ariaLabel="Period" items={PERIODS} value={period} onChange={setPeriod} />
          </div>
          <Tiles s={s} error={summary.error} onRetry={() => summary.refetch()} retrying={summary.isFetching} stale={summary.isPlaceholderData} />

          <h2 className="pl-section-title" id="pl-pay-title">Transactions</h2>
          <div className="pl-toolbar">
            <FilterChips ariaLabel="Payment status" items={TABS} value={tab} onChange={setTab} controls="pl-pay-list" />
            <label className="pl-search">
              {ic(Search01Icon)}
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Order, payment ID or phone" aria-label="Search payments" />
            </label>
          </div>

          <section id="pl-pay-list" className="pl-card" aria-labelledby="pl-pay-title" aria-busy={list.isFetching || undefined}>
            {list.isLoading ? (
              <div className="pl-scroll" role="status" aria-busy="true">
                <span className="ds-sr-only">Loading payments…</span>
                <table className="pl-table pl-table--pay ds-mobile-rows" aria-hidden="true">
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
                <table className="pl-table pl-table--pay ds-mobile-rows" role="table">
                  <thead>
                    <tr><th>Order</th><th>Customer</th><th>Method</th><th className="r">Amount</th><th>Status</th><th>Why</th><th>When</th><th aria-label="Actions" /></tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const [label, tone] = KIND[r.kind] || [r.kind, "neutral"];
                      return (
                        <tr key={r.key}>
                          <td className="ds-mobile-span">
                            <b>{r.orderNumber || <span className="pl-faint">No order yet</span>}</b>
                            {r.ref && <div className="pl-mono pl-faint" title={r.ref}>{r.ref}</div>}
                          </td>
                          <td data-mobile-label="Customer">{r.customer || <span className="pl-faint">—</span>}{r.brand && !brandId && <div className="pl-faint pl-small">{r.brand}</div>}</td>
                          <td data-mobile-label="Method" className="pl-nowrap">{r.methodLabel}</td>
                          <td data-mobile-label="Amount" className={`r pl-nowrap pl-amt${r.amount < 0 ? " is-out" : ""}`}><b>{r.amount < 0 ? `−${inr(r.amount)}` : inr(r.amount)}</b></td>
                          <td data-mobile-label="Status"><StatusPill tone={tone} size="sm">{label}</StatusPill></td>
                          <td className="pl-why" data-mobile-label="Details">{r.why || <span className="pl-faint">—</span>}</td>
                          <td className="pl-nowrap pl-faint" data-mobile-label="When" title={fullDate(r.at)}>{when(r.at)}</td>
                          <td className="r ds-mobile-span ds-mobile-actions">
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
      </div>
    </div>
  );
}

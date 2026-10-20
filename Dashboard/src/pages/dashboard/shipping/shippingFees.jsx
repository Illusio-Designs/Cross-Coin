import { Fragment, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { PageHeader, StatusPill, KpiTile, KpiGrid, FilterChips, EmptyState, ErrorState, Skeleton, SkeletonKpis, SkeletonTableRows } from "../../../components/ui";
import Dropdown from "../../../components/ui/Dropdown";
import { shippingFeeService, orderService } from "../../../services";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { HugeiconsIcon } from "@hugeicons/react";
import { Search01Icon, DeliveryTruck01Icon } from "@hugeicons/core-free-icons";

/* ──────────────────────────────────────────────────────────────
   Shipping & courier — what shoppers pay for delivery on each store,
   and what the courier (iThink) is telling us.

   Fees: GET /api/shipping-fees/admin/overview, saved per brand with
   PUT /api/shipping-fees/admin/brand/:id. These are exactly what the
   checkout reads: the brand's shipping_fees rows (prepaid / COD), the
   FREE_SHIPPING_THRESHOLD setting (COD ships free at/above it) and
   COD_MAX_ORDER_VALUE (COD refused above it).
   Log: GET /api/orders/shipping/webhook-events (server-side filter,
   search and paging); "Process again" replays a stored update.
   The old 'webhook-events' view renders this page with focus="log".
   Styles: opsSettings.css (.oss-*).
   ────────────────────────────────────────────────────────────── */

const PAGE_SIZE = 25;
const WEBHOOK_URL = "https://api.crosscoin.in/api/orders/shipping/webhook";
const UNMATCHED = "ignored: no matching order";
const PROBLEM_STATUSES = ["undelivered", "rto", "rto delivered"];

const num = (v) => (Number(v) || 0).toLocaleString("en-IN");
const inr = (v) => `₹${(Number(v) || 0).toLocaleString("en-IN")}`;
const timeAgo = (d) => {
  if (!d) return "";
  const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} h ago`;
  const days = Math.floor(h / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
};
const when = (d) => {
  if (!d) return "—";
  const t = new Date(d);
  const today = new Date().toDateString() === t.toDateString();
  return today
    ? t.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })
    : t.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};
const STATUS_WORDS = {
  delivered: "Delivered", "out for delivery": "Out for delivery", "in transit": "In transit", shipped: "Shipped",
  manifested: "Ready for pickup", "pickup initiated": "Picked up", booked: "Booked", undelivered: "Delivery failed",
  rto: "Returning to us", "rto delivered": "Returned to us", cancelled: "Cancelled", "order cancelled": "Cancelled",
  processing: "Processing", confirmed: "Confirmed", pending: "Pending",
};
const statusWord = (s) => STATUS_WORDS[String(s || "").toLowerCase()] || (s ? String(s) : "—");

// ── Fee rules → the exact words the storefront cart shows ──────────────
const feeWord = (row) => (!row || !row.fee ? "FREE" : inr(row.fee));
function shopperLines(b) {
  // No rows at all → every storefront falls back to "both options FREE".
  if (!b.prepaid && !b.cod) return ["UPI / Card (Prepaid) FREE · Cash on Delivery FREE (no fees set — the cart uses its built-in defaults)"];
  const parts = [];
  if (b.prepaid || !b.cod) parts.push(`UPI / Card (Prepaid) ${feeWord(b.prepaid)}`);
  if (b.cod) {
    let cod = `Cash on Delivery ${feeWord(b.cod)}`;
    if (b.cod.fee > 0 && b.freeOver.value > 0) cod += ` — FREE when the cart is ${inr(b.freeOver.value)} or more`;
    parts.push(cod);
  } else if (b.prepaid) {
    parts.push("no Cash on Delivery option");
  }
  const lines = [parts.join(" · ")];
  if (b.cod && b.codMax.value > 0) lines.push(`Above ${inr(b.codMax.value)}: “COD is not available for orders above ₹${b.codMax.value}. Please pay online.”`);
  return lines;
}
const sourceNote = (src) => (src === "default" ? "built-in default" : src === "server" ? "shared server value" : "");

function FeeCard({ b, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const start = () => {
    setForm({
      prepaidFee: String(b.prepaid?.fee ?? 0),
      offerCod: !!b.cod || !b.prepaid,
      codFee: String(b.cod?.fee ?? 0),
      freeOver: String(b.freeOver.value || 0),
      codMax: String(b.codMax.value || 0),
    });
    setErrors({});
    setEditing(true);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const errs = {};
    for (const k of ["prepaidFee", "codFee", "freeOver", "codMax"]) {
      if (k === "codFee" && !form.offerCod) continue;
      const n = Number(form[k]);
      if (form[k] === "" || !Number.isFinite(n) || n < 0) errs[k] = "Enter an amount (0 or more).";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = { prepaidFee: Number(form.prepaidFee), offerCod: form.offerCod, freeOver: Number(form.freeOver), codMax: Number(form.codMax) };
      if (form.offerCod) body.codFee = Number(form.codFee);
      const res = await shippingFeeService.saveBrandRules(b.id, body);
      showSuccess("shippingSaved", `Delivery rules saved for ${b.name}`);
      setEditing(false);
      onSaved(res);
    } catch (err) {
      if (err?.errors) setErrors(err.errors);
      showError("shippingSaveFailed", err?.message || "Couldn’t save — try again.");
    } finally {
      setSaving(false);
    }
  };

  const field = (k, label, hint) => (
    <label className={`oss-field${errors[k] ? " is-bad" : ""}`}>
      <span>{label}</span>
      <span className="oss-money"><span aria-hidden="true">₹</span>
        <input inputMode="decimal" value={form[k]} onChange={set(k)} aria-invalid={!!errors[k]} />
      </span>
      {(errors[k] || hint) && <small>{errors[k] || hint}</small>}
    </label>
  );

  return (
    <article className="oss-card oss-fee">
      <header className="oss-card-head">
        <b>{b.name}</b>
        {b.status !== "active" && <StatusPill tone="neutral" size="sm">Inactive</StatusPill>}
        {!editing && <button type="button" className="oss-btn oss-btn--sm" onClick={start}>Edit</button>}
      </header>
      {editing ? (
        <form className="oss-fee-form" onSubmit={save}>
          {field("prepaidFee", "Prepaid delivery", "0 = free")}
          <label className="oss-check">
            <input type="checkbox" checked={form.offerCod} onChange={set("offerCod")} />
            <span>Offer Cash on Delivery at checkout</span>
          </label>
          {form.offerCod && field("codFee", "COD delivery", "0 = free")}
          {field("freeOver", "COD free when the cart is over", "0 = no free-delivery offer")}
          {field("codMax", "COD allowed up to", "Bigger orders must pay online")}
          <div className="oss-row-end">
            <button type="button" className="oss-btn oss-btn--quiet" onClick={() => setEditing(false)} disabled={saving}>Cancel</button>
            <button type="submit" className="oss-btn oss-btn--main" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
          </div>
        </form>
      ) : (
        <>
          <dl className="oss-kv">
            <dt>Prepaid delivery</dt><dd>{b.prepaid ? feeWord(b.prepaid) : <span className="mut">FREE (not set)</span>}</dd>
            <dt>COD delivery</dt><dd>{b.cod ? feeWord(b.cod) : b.prepaid ? <span className="mut">Not offered</span> : <span className="mut">FREE (not set)</span>}</dd>
            <dt>COD free over</dt>
            <dd>{b.freeOver.value > 0 ? inr(b.freeOver.value) : <span className="mut">Off</span>}{sourceNote(b.freeOver.source) && <small className="mut"> · {sourceNote(b.freeOver.source)}</small>}</dd>
            <dt>COD allowed up to</dt>
            <dd>{b.cod || !b.prepaid ? inr(b.codMax.value) : "—"}{(b.cod || !b.prepaid) && sourceNote(b.codMax.source) && <small className="mut"> · {sourceNote(b.codMax.source)}</small>}</dd>
          </dl>
          <div className="oss-shopper">
            <span className="oss-label">Shopper sees</span>
            {shopperLines(b).map((l) => <span key={l}>{l}</span>)}
          </div>
        </>
      )}
    </article>
  );
}

// What we did with one courier update, in plain words + a tone.
function outcome(e) {
  if (e.processing_error === UNMATCHED) return { text: "No order has this AWB", tone: "problem", retry: true };
  if (e.processing_error) return { text: `Couldn’t apply it — ${String(e.processing_error).slice(0, 80)}`, tone: "problem", retry: true };
  if (!Number(e.processed)) return { text: "Not processed yet", tone: "needs", retry: true };
  if (e.return_number) return { text: `Return ${e.return_number} updated`, tone: "progress", retry: false };
  const problem = PROBLEM_STATUSES.includes(String(e.mapped_status || "").toLowerCase());
  return {
    text: e.order_status ? `Order is now “${statusWord(e.order_status)}”` : `Saved as “${statusWord(e.mapped_status)}”`,
    tone: problem ? "needs" : "done",
    retry: problem,
  };
}

function openOrder(orderNumber) {
  try { sessionStorage.setItem("obz-orders-search", orderNumber); } catch { /* storage blocked */ }
  window.history.pushState({}, "", "/dashboard/orders");
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function CourierLog({ summary, brands, logRef }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [brandId, setBrandId] = useState("");
  const [page, setPage] = useState(1);
  const [replaying, setReplaying] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { const t = setTimeout(() => setQ(search.trim()), 350); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [filter, q, brandId]);

  const params = { page, pageSize: PAGE_SIZE, filter, q: q || undefined, brandId: brandId || undefined };
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ["courierLog", params],
    queryFn: () => orderService.getShippingWebhookEvents(params),
    placeholderData: keepPreviousData,
    staleTime: 15 * 1000,
  });
  const rows = data?.events || [];
  const total = data?.total || 0;
  const from = total ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = Math.min(total, page * PAGE_SIZE);
  const s = data?.summary || summary || {};

  const replay = async (id) => {
    setReplaying(id);
    try {
      const r = await orderService.replayWebhookEvent(id);
      showSuccess("webhookReplayed", r?.message || "Processed again");
      queryClient.invalidateQueries({ queryKey: ["courierLog"] });
      queryClient.invalidateQueries({ queryKey: ["shippingOverview"] });
    } catch (err) {
      showError("webhookReplayFailed", err?.message || err?.error || "Couldn’t process it again.");
    } finally {
      setReplaying(null);
    }
  };
  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(WEBHOOK_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard blocked */ }
  };

  return (
    <section className="rep-panel rep-panel--flush oss-log" ref={logRef} id="courier-updates" aria-label="Courier updates">
      <div className="oss-log-head">
        <b className="oss-h2">Courier updates</b>
        <div className="oss-log-tools">
          <FilterChips
            ariaLabel="Which updates"
            controls="courier-updates-table"
            value={filter}
            onChange={setFilter}
            items={[
              { value: "all", label: "All", count: s.total },
              { value: "problems", label: "Problems only", count: s.problems },
              { value: "unmatched", label: "Couldn’t match", count: s.unmatched },
            ]}
          />
          {brands.length > 1 && (
            <Dropdown
              value={brandId || "all"}
              onChange={(v) => setBrandId(v === "all" ? "" : v)}
              options={[{ value: "all", label: "All brands" }, ...brands.map((b) => ({ value: String(b.id), label: b.name }))]}
              className="oss-dd"
            />
          )}
          <label className="oss-search">
            <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
            <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="AWB or order number" aria-label="Search by AWB or order number" />
          </label>
        </div>
      </div>

      {isLoading ? (
        <div className="rep-tbl-wrap oss-tbl" role="status" aria-busy="true">
          <span className="ds-sr-only">Loading courier updates…</span>
          <table className="rep-table" aria-hidden="true">
            <thead><tr><th>When</th><th>AWB · order</th><th>Courier said</th><th>We did</th><th /></tr></thead>
            <tbody><SkeletonTableRows rows={8} cols={5} /></tbody>
          </table>
        </div>
      ) : error && !data ? (
        <ErrorState message={`Couldn’t load courier updates — ${error?.message || "the server didn’t answer"}.`} onRetry={refetch} retrying={isFetching} />
      ) : rows.length === 0 ? (
        <EmptyState
          compact
          icon={<HugeiconsIcon icon={DeliveryTruck01Icon} size={22} strokeWidth={2} />}
          title={q ? "No update matches that AWB or order" : filter === "all" ? "No courier updates yet" : filter === "problems" ? "No problems — every update went through" : "Every update matched an order"}
          description={q ? "Try the full AWB or order number." : filter === "all" ? "Once iThink sends a status, it shows here within seconds." : (brandId ? "For this brand." : "")}
        />
      ) : (
        <div className={`rep-tbl-wrap oss-tbl${isFetching ? " is-busy" : ""}`} id="courier-updates-table" aria-busy={isFetching || undefined}>
          <table className="rep-table">
            <thead><tr><th>When</th><th>AWB · order</th><th>Courier said</th><th>We did</th><th aria-label="Actions" /></tr></thead>
            <tbody>
              {rows.map((e) => {
                const o = outcome(e);
                return (
                  <tr key={e.id}>
                    <td className="oss-nowrap mut" title={new Date(e.createdAt).toLocaleString("en-IN")}>{when(e.createdAt)}</td>
                    <td>
                      <b className="oss-mono">{e.waybill || "—"}</b>
                      <div className="oss-sub">
                        {e.order_number
                          ? <button type="button" className="oss-link" onClick={() => openOrder(e.order_number)}>{e.order_number}</button>
                          : e.return_number ? `Return ${e.return_number}` : (e.order_ref || "no order")}
                      </div>
                    </td>
                    <td>{e.courier_status || "—"}</td>
                    <td><StatusPill tone={o.tone} size="sm">{o.text}</StatusPill></td>
                    <td className="r">
                      {o.retry && (
                        <button type="button" className="oss-btn oss-btn--sm" disabled={replaying === e.id}
                          title="Run this update through again, e.g. after fixing the order’s AWB"
                          onClick={() => replay(e.id)}>{replaying === e.id ? "Processing…" : "Process again"}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="oss-foot">
        <span className="mut">{error && data ? "Couldn’t refresh — showing the last list. " : ""}Searched on the server.</span>
        {total > 0 && (
          <span className="oss-pager">
            <span className="num">{num(from)}–{num(to)} of {num(total)}</span>
            <button type="button" className="oss-btn oss-btn--sm" disabled={page <= 1 || isFetching} onClick={() => setPage((p) => p - 1)}>← Prev</button>
            <button type="button" className="oss-btn oss-btn--sm" disabled={to >= total || isFetching} onClick={() => setPage((p) => p + 1)}>Next →</button>
          </span>
        )}
      </div>
      <details className="oss-help">
        <summary>Nothing arriving? The address iThink must send updates to</summary>
        <div className="oss-help-body">
          <code>{WEBHOOK_URL}</code>
          <button type="button" className="oss-btn oss-btn--sm" onClick={copyUrl}>{copied ? "Copied" : "Copy"}</button>
          <span className="mut">Give this to iThink as the order-status callback. Until updates arrive, statuses only refresh in the twice-daily sync (6 AM / 6 PM).</span>
        </div>
      </details>
    </section>
  );
}

export default function ShippingFees({ focus }) {
  const queryClient = useQueryClient();
  const logRef = useRef(null);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["shippingOverview"],
    queryFn: shippingFeeService.getAdminOverview,
    staleTime: 30 * 1000,
  });

  // Old "Courier Webhooks" view lands on the log.
  useEffect(() => {
    if (focus === "log" && logRef.current) logRef.current.scrollIntoView({ block: "start" });
  }, [focus, isLoading]);

  const brands = data?.brands || [];
  const wh = data?.webhooks || {};
  const connected = brands.filter((b) => b.courier.connected);
  const missing = brands.filter((b) => !b.courier.connected && b.status === "active");

  return (
    <div className="dashboard-sections obz-rep oss">
      <PageHeader title="Shipping & courier" description="What shoppers pay for delivery on each store, and what the courier is telling us." />

      {isLoading ? (
        <>
          <section className="oss-cards" role="status" aria-busy="true">
            <span className="ds-sr-only">Loading delivery fees…</span>
            {[0, 1, 2].map((i) => (
              <article key={i} className="oss-card oss-fee" aria-hidden="true">
                <header className="oss-card-head"><Skeleton w={110 + i * 20} h={15} style={{ marginRight: "auto" }} /><Skeleton w={48} h={26} r={8} /></header>
                <dl className="oss-kv">
                  {["Prepaid delivery", "COD delivery", "COD free over", "COD allowed up to"].map((k) => (
                    <Fragment key={k}><dt>{k}</dt><dd><Skeleton w={70} h={12} style={{ marginLeft: "auto" }} /></dd></Fragment>
                  ))}
                </dl>
                <div className="oss-shopper">
                  <span className="oss-label">Shopper sees</span>
                  <Skeleton w="85%" h={11} /><Skeleton w="65%" h={11} />
                </div>
              </article>
            ))}
          </section>
          <SkeletonKpis count={3} label="Loading courier status…" className="oss-tiles" />
        </>
      ) : error && !data ? (
        <ErrorState message={`Couldn’t load delivery fees — ${error?.message || "the server didn’t answer"}.`} onRetry={refetch} retrying={isFetching} />
      ) : (
        <>
          <section className="oss-cards" aria-label="Delivery fees per store">
            {brands.map((b) => (
              <FeeCard key={b.id} b={b} onSaved={(res) => queryClient.setQueryData(["shippingOverview"], res)} />
            ))}
            {brands.length === 0 && <EmptyState title="No stores yet" description="Add a brand on the Brands page first." />}
          </section>

          <KpiGrid className="oss-tiles">
            <KpiTile
              label="Courier account"
              value={<span className="oss-dotline"><span className={`oss-dot ${missing.length ? "is-warn" : "is-ok"}`} aria-hidden="true" />iThink · {missing.length ? `${connected.length} of ${brands.length} stores connected` : "connected"}</span>}
              sub={missing.length ? `Not connected: ${missing.map((b) => b.name).join(", ")} — add keys on Brands → Store` : `${brands.length} store${brands.length === 1 ? "" : "s"} can book pickups`}
            />
            <KpiTile
              label="Last update from courier"
              value={wh.lastReceivedAt ? timeAgo(wh.lastReceivedAt) : "Never"}
              tone={wh.lastReceivedAt ? undefined : "needs"}
              sub={wh.lastReceivedAt ? `${num(wh.today)} update${wh.today === 1 ? "" : "s"} today` : "iThink hasn’t sent anything yet — see the address below"}
            />
            <KpiTile
              label="Couldn’t match"
              value={`${num(wh.unmatched7d)} update${wh.unmatched7d === 1 ? "" : "s"}`}
              tone={wh.unmatched7d ? "needs" : undefined}
              sub="last 7 days · AWB not found on any order"
            />
          </KpiGrid>
        </>
      )}

      <CourierLog summary={wh} brands={brands} logRef={logRef} />
    </div>
  );
}

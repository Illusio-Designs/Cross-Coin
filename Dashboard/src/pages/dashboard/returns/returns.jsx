import { useState, useEffect } from "react";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { Button, Table, Modal } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, EmptyState, FilterBar } from "../../../components/Dashboard/primitives";
import { PromptModal } from "../../../components/common/AlertModal";
import Loader from "../../../components/common/Loader";
import { returnService } from "../../../services";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, Package01Icon } from "@hugeicons/core-free-icons";

const IC = {
  view: <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  box: <HugeiconsIcon icon={Package01Icon} size={20} strokeWidth={2} />,
};

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const copyText = async (t) => {
  try { await navigator.clipboard.writeText(String(t)); showSuccess("copied", "Copied"); }
  catch (_) { showError("copyFailed", "Couldn't copy — select the text instead"); }
};
const REASONS = {
  damaged: "Damaged / leaking", defective: "Defective", wrong: "Wrong product",
  notdesc: "Not as described", changed: "Changed mind", other: "Other",
};
// Token pairs (bg / fg / border) so the pills read in light and dark themes.
const tone = (t) => ({ bg: `var(--ds-color-${t}-bg)`, fg: `var(--ds-color-${t})`, bd: `var(--ds-color-${t}-bd)` });
const STATUS = {
  requested: { label: "Requested", ...tone("info") },
  under_review: { label: "Under review", ...tone("warn") },
  approved: { label: "Approved", ...tone("success") },
  pickup_scheduled: { label: "Pickup scheduled", ...tone("info") },
  picked_up: { label: "Picked up", ...tone("info") },
  received: { label: "Received", ...tone("accent2") },
  refunded: { label: "Refunded", ...tone("success") },
  rejected: { label: "Rejected", ...tone("danger") },
};
const Badge = ({ s }) => {
  const m = STATUS[s] || STATUS.requested;
  return <span style={{ background: m.bg, color: m.fg, border: `1px solid ${m.bd}`, padding: "3px 10px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600 }}>{m.label}</span>;
};
// Grouped filters ("review" / "pickup") are expanded server-side; each chip
// also shows its count from the backend's per-status totals.
const FILTERS = [
  ["", "All", null],
  ["review", "To review", ["requested", "under_review"]],
  ["pickup", "In pickup", ["approved", "pickup_scheduled", "picked_up"]],
  ["received", "Received", ["received"]],
  ["refunded", "Refunded", ["refunded"]],
  ["rejected", "Rejected", ["rejected"]],
];
// Stages where the admin still decides the refund amount (before approving).
const REVIEW = ["requested", "under_review"];
// Approved but the parcel is not back yet.
const IN_TRANSIT = ["approved", "pickup_scheduled", "picked_up"];

export default function Returns({ embedded = false }) {
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [rejectOpen, setRejectOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [refundAmt, setRefundAmt] = useState(0);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [restock, setRestock] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["returns", "admin", statusFilter, debouncedSearch],
    queryFn: () => returnService.getReturns({
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
    }),
    staleTime: 30 * 1000,
    placeholderData: keepPreviousData,
  });
  const rows = data?.returns || [];

  // Tiles use the backend's per-status totals (independent of the active
  // filter / search), not the rows currently on screen.
  const statusCounts = data?.statusCounts || {};
  const countOf = (list) => (list || []).reduce((n, s) => n + (Number(statusCounts[s]) || 0), 0);
  const pending = countOf(["requested", "under_review"]);
  const refunded = countOf(["refunded"]);
  const totalCount = Object.values(statusCounts).reduce((n, v) => n + (Number(v) || 0), 0);

  const eligible = Number(detail?.requested_amount) || 0;
  const isPrepaid = detail && !detail.is_cod;
  const deducted = Math.max(0, eligible - Number(refundAmt || 0));

  const openDetail = async (id) => {
    setMsg(null); setBusy(true);
    try {
      const d = await returnService.getReturn(id);
      setDetail(d); setRefundAmt(Number(d.refund_amount ?? d.requested_amount) || 0);
      setAdminNote(d.admin_note || ""); setRestock(true); setOpen(true);
    } catch (e) { showError("returnLoad", e.message || "Couldn't load this return"); }
    finally { setBusy(false); }
  };

  const refresh = async () => { await refetch(); if (detail) { try { setDetail(await returnService.getReturn(detail.id)); } catch (_) {} } };

  const doApprove = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await returnService.approve(detail.id, { admin_note: adminNote });
      setMsg({ type: "ok", text: res.message || "Approved" });
      await refresh();
    } catch (e) {
      setMsg({ type: "err", text: e.code === "PROOF_REQUIRED" ? "Upload the payout proof screenshot first, then try again." : e.message });
      await refresh();
    } finally { setBusy(false); }
  };

  const doReject = () => setRejectOpen(true);
  const confirmReject = async (reason) => {
    setRejectOpen(false);
    setBusy(true); setMsg(null);
    try { const res = await returnService.reject(detail.id, reason); setMsg({ type: "ok", text: res.message || "Rejected" }); await refresh(); }
    catch (e) { setMsg({ type: "err", text: e.message }); } finally { setBusy(false); }
  };

  const run = async (fn, okText) => {
    setBusy(true); setMsg(null);
    try {
      const res = await fn();
      setMsg({ type: res?.code === "PROOF_REQUIRED" ? "err" : "ok", text: res?.message || okText });
      await refresh();
    } catch (e) {
      setMsg({ type: "err", text: e.message });
      await refresh();
    } finally { setBusy(false); }
  };
  const doPickedUp = () => run(() => returnService.markPickedUp(detail.id), "Marked as picked up");
  const doReceive = () => run(() => returnService.receive(detail.id, restock), "Received");
  const doRefund = () => {
    const amt = Number(refundAmt);
    if (!Number.isFinite(amt) || amt <= 0 || amt > eligible) { setMsg({ type: "err", text: `Enter a refund amount between ₹1 and ${money(eligible)}.` }); return; }
    return run(() => returnService.refund(detail.id, amt), "Refund issued");
  };

  const doProof = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMsg(null);
    try { await returnService.uploadProof(detail.id, file); setMsg({ type: "ok", text: "Proof uploaded" }); await refresh(); }
    catch (err) { setMsg({ type: "err", text: err.message }); } finally { setBusy(false); e.target.value = ""; }
  };

  const columns = [
    { header: "Return", accessor: "return_number", cell: (r) => <span><strong>{r.return_number}</strong><br /><span style={{ fontSize: ".72rem", color: "var(--ds-color-text-faint)" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span></span> },
    { header: "Customer", accessor: "User", cell: (r) => <span>{r.User?.username || "—"}<br /><span style={{ fontSize: ".72rem", color: "var(--ds-color-text-faint)" }}>{r.Order?.order_number || ""}</span></span> },
    { header: "Reason", accessor: "reason", cell: (r) => <span>{REASONS[r.reason] || r.reason}{r.is_cod ? <span style={{ marginLeft: 6, fontSize: ".66rem", background: "var(--ds-color-warn-bg)", color: "var(--ds-color-warn)", border: "1px solid var(--ds-color-warn-bd)", padding: "2px 7px", borderRadius: 999 }}>COD</span> : null}</span> },
    { header: "Amount", accessor: "refund_amount", cell: (r) => <span style={{ fontWeight: 600 }}>{money(r.refund_amount ?? r.requested_amount)}</span> },
    { header: "Status", accessor: "status", cell: (r) => <Badge s={r.status} /> },
    { header: "", accessor: "actions", cell: (r) => <button className="sl-btn-edit" title="Review" onClick={() => openDetail(r.id)}>{IC.view}</button> },
  ];

  return (
    <>
      <div className="dashboard-page">
        {!embedded && <PageHeader title="Returns & Refunds" subtitle={`${totalCount} request${totalCount !== 1 ? "s" : ""}`} />}
        <StatGrid>
          <StatTile label="Awaiting review" value={pending} tone="warn" />
          <StatTile label="Refunded" value={refunded} tone="good" />
          <StatTile label="Total requests" value={totalCount} tone="info" />
        </StatGrid>

        <Panel>
          <FilterBar search={search} onSearchChange={setSearch} placeholder="Search order no. or return no.…">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {FILTERS.map(([v, label, group]) => {
                const on = statusFilter === v;
                const n = group ? countOf(group) : totalCount;
                return (
                  <button key={v} type="button" onClick={() => setStatusFilter(v)} aria-pressed={on}
                    style={{ padding: "7px 14px", borderRadius: 999, border: "1px solid " + (on ? "var(--ds-color-brand)" : "var(--ds-color-border)"), background: on ? "var(--ds-color-brand)" : "var(--ds-color-surface)", color: on ? "var(--ds-color-bg)" : "var(--ds-color-text-muted)", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
                    {label}{data ? <span style={{ marginLeft: 6, opacity: 0.75 }}>{n}</span> : null}
                  </button>
                );
              })}
            </div>
          </FilterBar>
          {isLoading ? (
            <div style={{ padding: 48, textAlign: "center" }}><Loader /></div>
          ) : error ? (
            <EmptyState title="Couldn't load returns" message={error?.message || String(error)} />
          ) : rows.length === 0 ? (
            (statusFilter || debouncedSearch)
              ? <EmptyState icon={IC.box} title="No matching returns" message="Try a different filter or search." />
              : <EmptyState icon={IC.box} title="No returns yet" message="Return requests from customers will appear here." />
          ) : (
            <Table columns={columns} data={rows} striped hoverable cardOnMobile />
          )}
        </Panel>
      </div>

      <Modal isOpen={open} onClose={() => { if (!rejectOpen) setOpen(false); }} title={detail ? `Return ${detail.return_number}` : "Return"}>
        {detail && (
          <div className="seo-form">
            <div className="modal-body">
              {msg && <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, fontSize: ".84rem", background: msg.type === "ok" ? "var(--ds-color-success-bg)" : "var(--ds-color-danger-bg)", color: msg.type === "ok" ? "var(--ds-color-success)" : "var(--ds-color-danger)", border: "1px solid " + (msg.type === "ok" ? "var(--ds-color-success-bd)" : "var(--ds-color-danger-bd)") }}>{msg.text}</div>}

              <div className="con-detail-grid">
                <div className="con-detail-item"><span className="con-detail-label">Customer</span><span className="con-detail-value">{detail.User?.username || "—"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Phone</span><span className="con-detail-value">{detail.User?.phone || "—"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Order</span><span className="con-detail-value">{detail.Order?.order_number || "—"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Payment</span><span className="con-detail-value">{detail.is_cod ? "COD" : "Prepaid"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Reason</span><span className="con-detail-value">{REASONS[detail.reason] || detail.reason}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Refund to</span><span className="con-detail-value">{detail.is_cod ? "UPI (COD order)" : "Original payment (Razorpay)"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Status</span><span className="con-detail-value"><Badge s={detail.status} /></span></div>
                {detail.pickup_awb && <div className="con-detail-item"><span className="con-detail-label">Pickup AWB</span><span className="con-detail-value">{detail.pickup_awb}</span></div>}
              </div>

              {detail.note && <p style={{ margin: "14px 0 0", color: "var(--ds-color-text-muted)" }}><strong>Note:</strong> “{detail.note}”</p>}

              {Array.isArray(detail.photos) && detail.photos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "var(--ds-color-text-faint)", marginBottom: 8 }}>Customer photos</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {detail.photos.map((p, i) => (
                      <a key={i} href={p.url || p} target="_blank" rel="noreferrer"><img src={p.url || p} alt="" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: "1px solid var(--ds-color-border)" }} /></a>
                    ))}
                  </div>
                </div>
              )}

              {detail.status !== "refunded" && detail.status !== "rejected" ? (
                <>
                  {IN_TRANSIT.includes(detail.status) && (
                    <div style={{ marginTop: 18, padding: 16, background: "var(--ds-color-surface-soft)", border: "1px solid var(--ds-color-border)", borderRadius: 10, fontSize: ".84rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ds-color-text-faint)" }}>Item value</span><strong>{money(eligible)}</strong></div>
                      {detail.pickup_status && <div style={{ marginTop: 4, color: "var(--ds-color-text-faint)" }}>Courier: {detail.pickup_status}</div>}
                      {IN_TRANSIT.includes(detail.status) && (
                        <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, cursor: "pointer" }}>
                          <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
                          Put items back in stock on receipt (untick if damaged)
                        </label>
                      )}
                    </div>
                  )}
                  {REVIEW.includes(detail.status) && (
                    <div style={{ marginTop: 18, padding: 16, background: "var(--ds-color-surface-soft)", border: "1px solid var(--ds-color-border)", borderRadius: 10, fontSize: ".84rem" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--ds-color-text-faint)" }}>Item value</span><strong>{money(eligible)}</strong></div>
                      <div style={{ marginTop: 6, color: "var(--ds-color-text-faint)" }}>Approve to book the pickup. You'll enter the refund amount after the parcel is received and checked.</div>
                    </div>
                  )}
                  {detail.status === "received" && (<>
                  <div style={{ marginTop: 18, padding: 16, background: "var(--ds-color-surface-soft)", border: "1px solid var(--ds-color-border)", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}><span style={{ color: "var(--ds-color-text-faint)" }}>Item value</span><strong>{money(eligible)}</strong></div>
                    <div style={{ fontSize: ".78rem", color: "var(--ds-color-text-faint)", margin: "10px 0 4px" }}>Refund amount — after checking the item, deduct charges for a part refund</div>
                    <input type="number" min={0} max={eligible} value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)}
                      style={{ width: "100%", fontSize: "1.5rem", fontWeight: 700, border: "1px solid var(--ds-color-border)", borderRadius: 8, padding: "8px 12px", background: "var(--ds-color-surface)", color: "var(--ds-color-text)" }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button className="sl-chip" onClick={() => setRefundAmt(eligible)} style={chip}>Full</button>
                      <button className="sl-chip" onClick={() => setRefundAmt(Math.max(eligible - 79, 0))} style={chip}>− Shipping ₹79</button>
                      {isPrepaid && <button className="sl-chip" onClick={() => setRefundAmt(Math.max(eligible - Math.round(eligible * 0.02), 0))} style={chip}>− 2% gateway</button>}
                      <button className="sl-chip" onClick={() => setRefundAmt(Math.max(eligible - 99, 0))} style={chip}>− Restock ₹99</button>
                    </div>
                    <div style={{ marginTop: 9, fontSize: ".78rem", color: "var(--ds-color-text-faint)" }}>
                      {deducted > 0 ? `${money(deducted)} in charges deducted · customer gets ${money(refundAmt)}` : "Full item value — no charges deducted"}
                    </div>
                  </div>
                  </>)}

                  {isPrepaid ? (
                    <p style={{ marginTop: 12, fontSize: ".82rem", color: "var(--ds-color-success)", display: "flex", alignItems: "center", gap: 6 }}>
                      Prepaid — after the parcel is received and checked, press <strong>Issue refund</strong> to refund the original payment method via Razorpay.
                    </p>
                  ) : (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ padding: 12, background: "var(--ds-color-warn-bg)", border: "1px solid var(--ds-color-warn-bd)", color: "var(--ds-color-text)", borderRadius: 8, fontSize: ".82rem", marginBottom: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>COD — pay the customer by UPI</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>UPI ID: <code>{detail.upi_id || "—"}</code>{detail.upi_id && <button className="sl-chip" style={chip} onClick={() => copyText(detail.upi_id)}>Copy</button>}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 4 }}>Mobile: <code>{detail.payout_phone || "—"}</code>{detail.payout_phone && <button className="sl-chip" style={chip} onClick={() => copyText(detail.payout_phone)}>Copy</button>}</div>
                        <div style={{ color: "var(--ds-color-text-faint)", marginTop: 6 }}>After the parcel is received, send the refund amount to this UPI, upload the screenshot below, then press <strong>Confirm UPI refund</strong>.</div>
                      </div>
                      <div style={{ fontSize: ".82rem", fontWeight: 600, marginBottom: 6 }}>Payout proof (screenshot) — required for UPI refunds</div>
                      {detail.payout_proof && <a href={detail.payout_proof} target="_blank" rel="noreferrer"><img src={detail.payout_proof} alt="proof" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: "1px solid var(--ds-color-border)", marginBottom: 8 }} /></a>}
                      <input type="file" accept="image/*" onChange={doProof} disabled={busy} />
                    </div>
                  )}

                  <textarea placeholder="Internal note (optional)…" value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                    style={{ width: "100%", marginTop: 12, minHeight: 60, border: "1px solid var(--ds-color-border)", borderRadius: 8, padding: "10px 12px", fontFamily: "inherit", background: "var(--ds-color-surface)", color: "var(--ds-color-text)" }} />
                </>
              ) : (
                <div style={{ marginTop: 18, padding: 16, background: "var(--ds-color-surface-soft)", borderRadius: 10 }}>
                  {detail.status === "refunded"
                    ? <><strong>Refunded {money(detail.refund_amount)}</strong>{detail.charges_deducted > 0 ? ` · ${money(detail.charges_deducted)} deducted` : ""}
                        {detail.payout_proof && <div style={{ marginTop: 10 }}><a href={detail.payout_proof} target="_blank" rel="noreferrer"><img src={detail.payout_proof} alt="proof" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: "1px solid var(--ds-color-border)" }} /></a></div>}</>
                    : <strong style={{ color: "var(--ds-color-danger)" }}>Rejected</strong>}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {REVIEW.includes(detail.status) && (
                <>
                  <Button variant="secondary" onClick={doReject} disabled={busy}>Reject</Button>
                  <Button variant="primary" onClick={doApprove} disabled={busy}>
                    {busy ? "Working…" : "Approve & book pickup"}
                  </Button>
                </>
              )}
              {["approved", "pickup_scheduled"].includes(detail.status) && (
                <>
                  <Button variant="secondary" onClick={doReject} disabled={busy}>Reject</Button>
                  <Button variant="secondary" onClick={doPickedUp} disabled={busy}>Mark picked up</Button>
                </>
              )}
              {IN_TRANSIT.includes(detail.status) && (
                <Button variant="primary" onClick={doReceive} disabled={busy}>
                  {busy ? "Working…" : "Mark received"}
                </Button>
              )}
              {detail.status === "received" && (
                <Button variant="primary" onClick={doRefund} disabled={busy || (!isPrepaid && !detail.payout_proof)}
                  title={!isPrepaid && !detail.payout_proof ? "Upload the UPI payout screenshot first" : undefined}>
                  {busy ? "Working…" : isPrepaid ? `Refund ${money(refundAmt)} via Razorpay` : `Confirm UPI refund of ${money(refundAmt)}`}
                </Button>
              )}
              <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>

      <PromptModal
        message={rejectOpen && detail ? `Reason for rejecting return ${detail.return_number}? The customer will see it.` : null}
        placeholder="e.g. Item shows signs of use"
        title="Reject return"
        confirmLabel="Reject return"
        onConfirm={confirmReject}
        onCancel={() => setRejectOpen(false)}
      />
    </>
  );
}

const chip = { padding: "7px 13px", borderRadius: 999, border: "1px solid var(--ds-color-border)", background: "var(--ds-color-surface)", fontSize: ".78rem", fontWeight: 600, color: "var(--ds-color-text-muted)", cursor: "pointer" };

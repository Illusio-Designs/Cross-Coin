import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Table, Modal } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { returnService } from "../../../services";
import { HugeiconsIcon } from "@hugeicons/react";
import { ViewIcon, Package01Icon } from "@hugeicons/core-free-icons";

const IC = {
  view: <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  box: <HugeiconsIcon icon={Package01Icon} size={20} strokeWidth={2} />,
};

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const REASONS = {
  damaged: "Damaged / leaking", defective: "Defective", wrong: "Wrong product",
  notdesc: "Not as described", changed: "Changed mind", other: "Other",
};
const STATUS = {
  requested: { label: "Requested", bg: "#e8effe", fg: "#2563eb" },
  under_review: { label: "Under review", bg: "#fef3e2", fg: "#c2410c" },
  approved: { label: "Approved", bg: "#e7f6ee", fg: "#0a7a44" },
  pickup_scheduled: { label: "Pickup scheduled", bg: "#e0f2f1", fg: "#00897b" },
  picked_up: { label: "Picked up", bg: "#e0f7fa", fg: "#0097a7" },
  received: { label: "Received", bg: "#ede7f6", fg: "#6d28d9" },
  refunded: { label: "Refunded", bg: "#e7f6ee", fg: "#0a7a44" },
  rejected: { label: "Rejected", bg: "#fdeaea", fg: "#dc2626" },
};
const Badge = ({ s }) => {
  const m = STATUS[s] || STATUS.requested;
  return <span style={{ background: m.bg, color: m.fg, padding: "3px 10px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600 }}>{m.label}</span>;
};
const FILTERS = [["", "All"], ["requested", "Requested"], ["under_review", "Under review"], ["approved", "Approved"], ["refunded", "Refunded"], ["rejected", "Rejected"]];

export default function Returns() {
  const [statusFilter, setStatusFilter] = useState("");
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [refundAmt, setRefundAmt] = useState(0);
  const [adminNote, setAdminNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["returns", "admin", statusFilter],
    queryFn: () => returnService.getReturns(statusFilter ? { status: statusFilter } : {}),
    staleTime: 30 * 1000,
  });
  const rows = data?.returns || [];

  const pending = rows.filter((r) => ["requested", "under_review"].includes(r.status)).length;
  const refunded = rows.filter((r) => r.status === "refunded").length;

  const eligible = Number(detail?.requested_amount) || 0;
  const isPrepaid = detail && !detail.is_cod && (detail.resolution === "original" || detail.resolution === "upi");
  const deducted = Math.max(0, eligible - Number(refundAmt || 0));

  const openDetail = async (id) => {
    setMsg(null); setBusy(true);
    try {
      const d = await returnService.getReturn(id);
      setDetail(d); setRefundAmt(Number(d.refund_amount ?? d.requested_amount) || 0);
      setAdminNote(d.admin_note || ""); setOpen(true);
    } catch (e) { setMsg({ type: "err", text: e.message }); }
    finally { setBusy(false); }
  };

  const refresh = async () => { await refetch(); if (detail) { try { setDetail(await returnService.getReturn(detail.id)); } catch (_) {} } };

  const doApprove = async () => {
    setBusy(true); setMsg(null);
    try {
      const res = await returnService.approve(detail.id, { refund_amount: Number(refundAmt), admin_note: adminNote });
      setMsg({ type: "ok", text: res.message || "Refund issued" });
      await refresh();
    } catch (e) {
      setMsg({ type: "err", text: e.code === "PROOF_REQUIRED" ? "Upload the payout proof screenshot first, then approve." : e.message });
      await refresh();
    } finally { setBusy(false); }
  };

  const doReject = async () => {
    const reason = window.prompt("Reason for rejecting this return?");
    if (reason == null) return;
    setBusy(true); setMsg(null);
    try { const res = await returnService.reject(detail.id, reason); setMsg({ type: "ok", text: res.message || "Rejected" }); await refresh(); }
    catch (e) { setMsg({ type: "err", text: e.message }); } finally { setBusy(false); }
  };

  const doProof = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setBusy(true); setMsg(null);
    try { await returnService.uploadProof(detail.id, file); setMsg({ type: "ok", text: "Proof uploaded" }); await refresh(); }
    catch (err) { setMsg({ type: "err", text: err.message }); } finally { setBusy(false); e.target.value = ""; }
  };

  const columns = [
    { header: "Return", accessor: "return_number", cell: (r) => <span><strong>{r.return_number}</strong><br /><span style={{ fontSize: ".72rem", color: "#888" }}>{r.created_at ? new Date(r.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}</span></span> },
    { header: "Customer", accessor: "User", cell: (r) => <span>{r.User?.username || "—"}<br /><span style={{ fontSize: ".72rem", color: "#888" }}>{r.Order?.order_number || ""}</span></span> },
    { header: "Reason", accessor: "reason", cell: (r) => <span>{REASONS[r.reason] || r.reason}{r.is_cod ? <span style={{ marginLeft: 6, fontSize: ".66rem", background: "#fef3e2", color: "#c2410c", padding: "2px 7px", borderRadius: 999 }}>COD</span> : null}</span> },
    { header: "Amount", accessor: "refund_amount", cell: (r) => <span style={{ fontWeight: 600 }}>{money(r.refund_amount ?? r.requested_amount)}</span> },
    { header: "Status", accessor: "status", cell: (r) => <Badge s={r.status} /> },
    { header: "", accessor: "actions", cell: (r) => <button className="sl-btn-edit" title="Review" onClick={() => openDetail(r.id)}>{IC.view}</button> },
  ];

  return (
    <>
      <div className="dashboard-page">
        <PageHeader title="Returns & Refunds" subtitle={`${rows.length} request${rows.length !== 1 ? "s" : ""}`} />
        <StatGrid>
          <StatTile label="Awaiting review" value={pending} tone="warn" />
          <StatTile label="Refunded" value={refunded} tone="good" />
          <StatTile label="Total requests" value={rows.length} tone="info" />
        </StatGrid>

        <Panel>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 4px 14px" }}>
            {FILTERS.map(([v, label]) => (
              <button key={v} onClick={() => setStatusFilter(v)}
                style={{ padding: "7px 14px", borderRadius: 999, border: "1px solid " + (statusFilter === v ? "#111827" : "#e4e8ee"), background: statusFilter === v ? "#111827" : "#fff", color: statusFilter === v ? "#fff" : "#555", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
                {label}
              </button>
            ))}
          </div>
          {isLoading ? (
            <div style={{ padding: 48, textAlign: "center" }}><Loader /></div>
          ) : error ? (
            <EmptyState title="Couldn't load returns" message={error?.message || String(error)} />
          ) : rows.length === 0 ? (
            <EmptyState icon={IC.box} title="No returns yet" message="Return requests from customers will appear here." />
          ) : (
            <Table columns={columns} data={rows} striped hoverable cardOnMobile />
          )}
        </Panel>
      </div>

      <Modal isOpen={open} onClose={() => setOpen(false)} title={detail ? `Return ${detail.return_number}` : "Return"}>
        {detail && (
          <div className="seo-form">
            <div className="modal-body">
              {msg && <div style={{ marginBottom: 12, padding: "9px 12px", borderRadius: 8, fontSize: ".84rem", background: msg.type === "ok" ? "#e7f6ee" : "#fdeaea", color: msg.type === "ok" ? "#0a7a44" : "#dc2626" }}>{msg.text}</div>}

              <div className="con-detail-grid">
                <div className="con-detail-item"><span className="con-detail-label">Customer</span><span className="con-detail-value">{detail.User?.username || "—"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Phone</span><span className="con-detail-value">{detail.User?.phone || "—"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Order</span><span className="con-detail-value">{detail.Order?.order_number || "—"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Payment</span><span className="con-detail-value">{detail.is_cod ? "COD" : "Prepaid"}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Reason</span><span className="con-detail-value">{REASONS[detail.reason] || detail.reason}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Refund to</span><span className="con-detail-value">{detail.resolution}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Status</span><span className="con-detail-value"><Badge s={detail.status} /></span></div>
                {detail.pickup_awb && <div className="con-detail-item"><span className="con-detail-label">Pickup AWB</span><span className="con-detail-value">{detail.pickup_awb}</span></div>}
              </div>

              {detail.note && <p style={{ margin: "14px 0 0", color: "#555" }}><strong>Note:</strong> “{detail.note}”</p>}

              {Array.isArray(detail.photos) && detail.photos.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".08em", color: "#888", marginBottom: 8 }}>Customer photos</div>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    {detail.photos.map((p, i) => (
                      <a key={i} href={p.url || p} target="_blank" rel="noreferrer"><img src={p.url || p} alt="" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: "1px solid #e4e8ee" }} /></a>
                    ))}
                  </div>
                </div>
              )}

              {detail.status !== "refunded" && detail.status !== "rejected" ? (
                <>
                  <div style={{ marginTop: 18, padding: 16, background: "#f5f6f8", border: "1px solid #e4e8ee", borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: ".82rem" }}><span style={{ color: "#888" }}>Item value</span><strong>{money(eligible)}</strong></div>
                    <div style={{ fontSize: ".78rem", color: "#888", margin: "10px 0 4px" }}>Refund amount — deduct charges for a part refund</div>
                    <input type="number" min={0} max={eligible} value={refundAmt} onChange={(e) => setRefundAmt(e.target.value)}
                      style={{ width: "100%", fontSize: "1.5rem", fontWeight: 700, border: "1px solid #d7dce4", borderRadius: 8, padding: "8px 12px" }} />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                      <button className="sl-chip" onClick={() => setRefundAmt(eligible)} style={chip}>Full</button>
                      <button className="sl-chip" onClick={() => setRefundAmt(Math.max(eligible - 79, 0))} style={chip}>− Shipping ₹79</button>
                      {isPrepaid && <button className="sl-chip" onClick={() => setRefundAmt(Math.max(eligible - Math.round(eligible * 0.02), 0))} style={chip}>− 2% gateway</button>}
                      <button className="sl-chip" onClick={() => setRefundAmt(Math.max(eligible - 99, 0))} style={chip}>− Restock ₹99</button>
                    </div>
                    <div style={{ marginTop: 9, fontSize: ".78rem", color: "#888" }}>
                      {deducted > 0 ? `${money(deducted)} in charges deducted · customer gets ${money(refundAmt)}` : "Full item value — no charges deducted"}
                    </div>
                  </div>

                  {isPrepaid ? (
                    <p style={{ marginTop: 12, fontSize: ".82rem", color: "#0a7a44", display: "flex", alignItems: "center", gap: 6 }}>Prepaid — Razorpay processes this refund automatically on approve.</p>
                  ) : (
                    <div style={{ marginTop: 14 }}>
                      <div style={{ fontSize: ".82rem", fontWeight: 600, marginBottom: 6 }}>Payout proof (screenshot) — required for manual refunds</div>
                      {detail.payout_proof && <a href={detail.payout_proof} target="_blank" rel="noreferrer"><img src={detail.payout_proof} alt="proof" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: "1px solid #e4e8ee", marginBottom: 8 }} /></a>}
                      <input type="file" accept="image/*" onChange={doProof} disabled={busy} />
                    </div>
                  )}

                  <textarea placeholder="Internal note (optional)…" value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
                    style={{ width: "100%", marginTop: 12, minHeight: 60, border: "1px solid #d7dce4", borderRadius: 8, padding: "10px 12px", fontFamily: "inherit" }} />
                </>
              ) : (
                <div style={{ marginTop: 18, padding: 16, background: "#f5f6f8", borderRadius: 10 }}>
                  {detail.status === "refunded"
                    ? <><strong>Refunded {money(detail.refund_amount)}</strong>{detail.charges_deducted > 0 ? ` · ${money(detail.charges_deducted)} deducted` : ""}
                        {detail.payout_proof && <div style={{ marginTop: 10 }}><a href={detail.payout_proof} target="_blank" rel="noreferrer"><img src={detail.payout_proof} alt="proof" style={{ width: 92, height: 92, objectFit: "cover", borderRadius: 8, border: "1px solid #e4e8ee" }} /></a></div>}</>
                    : <strong style={{ color: "#dc2626" }}>Rejected</strong>}
                </div>
              )}
            </div>

            <div className="modal-footer">
              {detail.status !== "refunded" && detail.status !== "rejected" && (
                <>
                  <Button variant="secondary" onClick={doReject} disabled={busy}>Reject</Button>
                  <Button variant="primary" onClick={doApprove} disabled={busy}>
                    {busy ? "Working…" : (detail.resolution === "exchange" ? "Approve exchange" : isPrepaid ? "Approve & issue refund" : "Mark as paid & notify")}
                  </Button>
                </>
              )}
              <Button variant="secondary" onClick={() => setOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

const chip = { padding: "7px 13px", borderRadius: 999, border: "1px solid #d7dce4", background: "#fff", fontSize: ".78rem", fontWeight: 600, color: "#555", cursor: "pointer" };

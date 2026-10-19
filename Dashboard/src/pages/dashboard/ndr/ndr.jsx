import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Table } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ndrService } from "../../../services";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { HugeiconsIcon } from "@hugeicons/react";
import { DeliveryTruck01Icon } from "@hugeicons/core-free-icons";

const IC = { truck: <HugeiconsIcon icon={DeliveryTruck01Icon} size={20} strokeWidth={2} /> };

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
const day = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "");

const STATUS = {
  awaiting_customer: { label: "Waiting for customer", bg: "#fef3e2", fg: "#c2410c" },
  reattempt_requested: { label: "Reattempt requested", bg: "#e8effe", fg: "#2563eb" },
  address_updated: { label: "New address — update iThink", bg: "#fdeaea", fg: "#dc2626" },
  cancel_requested: { label: "Customer cancelled — RTO", bg: "#fdeaea", fg: "#dc2626" },
  needs_action: { label: "Needs action in iThink", bg: "#fdeaea", fg: "#dc2626" },
  closed: { label: "Closed", bg: "#e7f6ee", fg: "#0a7a44" },
};
const Badge = ({ s }) => {
  const m = STATUS[s] || { label: s, bg: "#f1f2f4", fg: "#555" };
  return <span style={{ background: m.bg, color: m.fg, padding: "3px 10px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600, whiteSpace: "nowrap" }}>{m.label}</span>;
};
const reply = (c) => {
  if (c.customer_action === "reattempt") return `Deliver again${c.reattempt_date ? ` (${day(c.reattempt_date)})` : ""}`;
  if (c.customer_action === "new_address") return c.new_address ? `New address: ${c.new_address}` : "Changing address — waiting for it";
  if (c.customer_action === "cancel") return "Cancel the order";
  return "No reply yet";
};
const copy = async (t) => { try { await navigator.clipboard.writeText(String(t)); showSuccess("copied", "Copied"); } catch (_) { window.prompt("Copy:", String(t)); } };

export default function FailedDeliveries({ embedded = false }) {
  const [view, setView] = useState("open");
  const [busyId, setBusyId] = useState(null);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["ndr", view],
    queryFn: () => ndrService.list(view),
    staleTime: 30 * 1000,
  });
  const cases = data?.cases || [];
  const open = cases.filter((c) => c.status !== "closed");
  const count = (fn) => open.filter(fn).length;

  const act = async (c, fn, okText) => {
    setBusyId(c.id);
    try { const r = await fn(); showSuccess("ndr", r?.message || okText); await refetch(); }
    catch (e) { showError("ndrFailed", e.message); await refetch(); }
    finally { setBusyId(null); }
  };

  const columns = [
    { header: "Order", accessor: "order_number", cell: (c) => (
      <span><strong>{c.order_number}</strong><br />
        <span style={{ fontSize: ".72rem", color: "#888" }}>{c.payment_type === "cod" ? "COD" : "Prepaid"} · {money(c.final_amount)}</span><br />
        {c.awb && <span style={{ fontSize: ".72rem", color: "#888" }}>AWB <code>{c.awb}</code> <button className="sl-chip" style={chip} onClick={() => copy(c.awb)}>Copy</button></span>}
      </span>
    ) },
    { header: "Customer", accessor: "customer_name", cell: (c) => <span>{c.customer_name || "—"}<br /><span style={{ fontSize: ".72rem", color: "#888" }}>{c.customer_phone || ""}</span></span> },
    { header: "Courier reason", accessor: "reason", cell: (c) => <span>{c.reason || "—"}<br /><span style={{ fontSize: ".72rem", color: "#888" }}>Attempt {c.attempts} · {when(c.updated_at)}</span></span> },
    { header: "Customer reply", accessor: "customer_action", cell: (c) => (
      <span style={{ maxWidth: 260, display: "inline-block" }}>{reply(c)}
        {c.new_address && <> <button className="sl-chip" style={chip} onClick={() => copy(c.new_address)}>Copy</button></>}
      </span>
    ) },
    { header: "Status", accessor: "status", cell: (c) => (
      <span><Badge s={c.status} />
        {c.status === "needs_action" && c.courier_response && <><br /><span style={{ fontSize: ".7rem", color: "#888" }} title={c.courier_response}>iThink: {String(c.courier_response).slice(0, 60)}…</span></>}
        {c.status === "closed" && c.resolved_note && <><br /><span style={{ fontSize: ".7rem", color: "#888" }}>{c.resolved_note}</span></>}
      </span>
    ) },
    { header: "", accessor: "actions", cell: (c) => c.status === "closed" ? null : (
      <span style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 150 }}>
        <button className="was-btn-secondary" style={btn} disabled={busyId === c.id}
          onClick={() => act(c, () => ndrService.sendToCourier(c.id, "reattempt"), "Reattempt requested")}>Reattempt via iThink</button>
        <button className="was-btn-secondary" style={btn} disabled={busyId === c.id}
          onClick={() => act(c, () => ndrService.sendToCourier(c.id, "rto"), "RTO requested")}>RTO via iThink</button>
        <button className="was-btn-secondary" style={btn} disabled={busyId === c.id}
          onClick={() => act(c, () => ndrService.resolve(c.id, "Updated in iThink panel"), "Marked done")}>Mark done</button>
      </span>
    ) },
  ];

  return (
    <div className="dashboard-page">
      {!embedded && <PageHeader title="Failed Deliveries" subtitle="Courier couldn't deliver — the customer is asked on WhatsApp what to do next" />}
      <StatGrid>
        <StatTile label="Open" value={open.length} tone="info" />
        <StatTile label="Waiting for customer" value={count((c) => c.status === "awaiting_customer")} tone="warn" />
        <StatTile label="Need your action" value={count((c) => ["needs_action", "address_updated", "cancel_requested", "reattempt_requested"].includes(c.status))} tone="danger" />
      </StatGrid>
      <Panel>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", padding: "4px 4px 14px" }}>
          {[["open", "Open"], ["all", "All"]].map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{ padding: "7px 14px", borderRadius: 999, border: "1px solid " + (view === v ? "#111827" : "#e4e8ee"), background: view === v ? "#111827" : "#fff", color: view === v ? "#fff" : "#555", fontSize: ".78rem", fontWeight: 600, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div style={{ padding: 48, textAlign: "center" }}><Loader /></div>
        ) : error ? (
          <EmptyState title="Couldn't load failed deliveries" message={error?.message || String(error)} />
        ) : cases.length === 0 ? (
          <EmptyState icon={IC.truck} title="No failed deliveries" message="When the courier can't deliver an order, it shows up here with the customer's reply." />
        ) : (
          <Table columns={columns} data={cases} striped hoverable cardOnMobile />
        )}
      </Panel>
    </div>
  );
}

const chip = { padding: "2px 8px", borderRadius: 999, border: "1px solid #d7dce4", background: "#fff", fontSize: ".68rem", fontWeight: 600, color: "#555", cursor: "pointer" };
const btn = { fontSize: 12, padding: "6px 10px", justifyContent: "center" };

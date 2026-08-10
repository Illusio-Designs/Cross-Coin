import { useState, useEffect, useCallback } from "react";
import { Button, Table } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { orderService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, CheckmarkCircle02Icon, Alert02Icon, DeliveryTruck01Icon } from '@hugeicons/core-free-icons';

// Backend webhook endpoint the courier (iThink) must be told to call.
// NOTE: this is the API host, NOT the storefront (www.*).
const WEBHOOK_URL = "https://api.crosscoin.in/api/orders/shipping/webhook";

const fmt = (v) => {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }); }
  catch { return String(v); }
};

export default function WebhookEvents() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const [events, setEvents] = useState([]);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await orderService.getShippingWebhookEvents(100);
      setSummary(res?.summary || null);
      setEvents(Array.isArray(res?.events) ? res.events : []);
    } catch (err) {
      setError(err?.message || "Failed to load webhook events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(WEBHOOK_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const pushWorking = !!summary?.pushWorking;

  const columns = [
    { header: "Received", accessor: "createdAt", cell: (r) => <span style={{ whiteSpace: "nowrap" }}>{fmt(r.createdAt)}</span> },
    { header: "AWB", accessor: "waybill", cell: (r) => <span style={{ fontFamily: "monospace" }}>{r.waybill || "—"}</span> },
    { header: "Order Ref", accessor: "order_ref", cell: (r) => <span>{r.order_ref || "—"}</span> },
    { header: "Courier said", accessor: "courier_status", cell: (r) => <span>{r.courier_status || "—"}</span> },
    { header: "Mapped to", accessor: "mapped_status", cell: (r) => <span style={{ fontWeight: 600 }}>{r.mapped_status || "—"}</span> },
    {
      header: "Result", accessor: "processed",
      cell: (r) => r.processed
        ? <span style={{ color: "#16a34a", fontWeight: 600 }}>Processed</span>
        : (r.processing_error
            ? <span style={{ color: "#dc2626", fontWeight: 600 }} title={r.processing_error}>Failed</span>
            : <span style={{ color: "#d97706", fontWeight: 600 }}>Pending</span>),
    },
  ];

  return (
    <div style={{ padding: "1.25rem" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <HugeiconsIcon icon={DeliveryTruck01Icon} size={24} strokeWidth={2} />
          <div>
            <h1 style={{ margin: 0, fontSize: "1.25rem" }}>Courier Webhook Monitor</h1>
            <p style={{ margin: "2px 0 0", fontSize: "0.85rem", opacity: 0.7 }}>
              Live proof of whether iThink is pushing status updates to this backend.
            </p>
          </div>
        </div>
        <Button onClick={load} disabled={loading}>
          <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} /> Refresh
        </Button>
      </div>

      {/* Status banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.9rem 1.1rem", borderRadius: 12, marginBottom: "1rem",
        background: pushWorking ? "rgba(22,163,74,0.10)" : "rgba(217,119,6,0.10)",
        border: `1px solid ${pushWorking ? "rgba(22,163,74,0.35)" : "rgba(217,119,6,0.35)"}`,
      }}>
        <HugeiconsIcon icon={pushWorking ? CheckmarkCircle02Icon : Alert02Icon} size={26} strokeWidth={2}
          color={pushWorking ? "#16a34a" : "#d97706"} />
        <div>
          <div style={{ fontWeight: 700 }}>
            {pushWorking
              ? "Automatic push is working — iThink is reaching this backend."
              : "No webhooks received yet — automatic push is not confirmed."}
          </div>
          <div style={{ fontSize: "0.85rem", opacity: 0.8, marginTop: 2 }}>
            {pushWorking
              ? `Last update received ${fmt(summary?.lastReceivedAt)}. You do not need to press Sync.`
              : "Until an event appears here, status only updates when you press Sync manually."}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
        {[
          { label: "Total received", value: summary?.total ?? 0 },
          { label: "Last 24 hours", value: summary?.last24h ?? 0 },
          { label: "Failed", value: summary?.failed ?? 0, danger: (summary?.failed ?? 0) > 0 },
          { label: "Last received", value: fmt(summary?.lastReceivedAt), small: true },
        ].map((t) => (
          <div key={t.label} style={{ padding: "0.9rem 1rem", borderRadius: 12, border: "1px solid rgba(128,128,128,0.2)" }}>
            <div style={{ fontSize: "0.75rem", opacity: 0.7 }}>{t.label}</div>
            <div style={{ fontSize: t.small ? "0.9rem" : "1.5rem", fontWeight: 700, marginTop: 4, color: t.danger ? "#dc2626" : "inherit" }}>{t.value}</div>
          </div>
        ))}
      </div>

      {/* The URL to give iThink */}
      <div style={{ padding: "0.9rem 1.1rem", borderRadius: 12, border: "1px dashed rgba(128,128,128,0.4)", marginBottom: "1.25rem" }}>
        <div style={{ fontSize: "0.8rem", opacity: 0.75, marginBottom: 6 }}>
          If nothing is arriving, give this exact URL to iThink as your order-status callback / webhook
          (this is the <strong>api</strong> host, not the storefront):
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
          <code style={{ padding: "0.4rem 0.6rem", background: "rgba(128,128,128,0.12)", borderRadius: 8, fontSize: "0.85rem" }}>{WEBHOOK_URL}</code>
          <Button onClick={copyUrl}>{copied ? "Copied!" : "Copy"}</Button>
        </div>
      </div>

      {/* Events table */}
      {error && <div style={{ color: "#dc2626", marginBottom: "1rem" }}>{error}</div>}
      {loading ? <Loader /> : (
        events.length === 0
          ? <div style={{ textAlign: "center", padding: "2.5rem 1rem", opacity: 0.7 }}>
              No webhooks recorded yet. Once iThink pushes a status (or you send a test), it appears here instantly.
            </div>
          : <Table columns={columns} data={events} striped hoverable />
      )}
    </div>
  );
}

import { useState, useEffect, useCallback } from "react";
import { Button, Badge } from "../../../components/ui";
import { PageHeader, StatGrid, StatTile, Panel, ResponsiveTable } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { orderService } from "../../../services";
import { HugeiconsIcon } from '@hugeicons/react';
import { RefreshIcon, CheckmarkCircle02Icon, Alert02Icon, PlayIcon } from '@hugeicons/core-free-icons';
import { showSuccess, showError } from "../../../utils/toastNotification";

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
  const [replayingId, setReplayingId] = useState(null);

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

  // Re-run a stored event's exact payload through the webhook handler, so a
  // failed or missed status update can be applied without the courier resending.
  const replayEvent = async (id) => {
    if (replayingId) return;
    setReplayingId(id);
    try {
      const r = await orderService.replayWebhookEvent(id);
      showSuccess('webhookReplayed', r?.message || 'Webhook replayed');
      await load();
    } catch (err) {
      showError('webhookReplayFailed', err?.message || err?.error || 'Replay failed');
    } finally {
      setReplayingId(null);
    }
  };

  const copyUrl = async () => {
    try { await navigator.clipboard.writeText(WEBHOOK_URL); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* ignore */ }
  };

  const pushWorking = !!summary?.pushWorking;

  const columns = [
    { key: "createdAt", label: "Received", render: (r) => <span style={{ whiteSpace: "nowrap" }}>{fmt(r.createdAt)}</span> },
    { key: "waybill", label: "AWB", render: (r) => <span style={{ fontFamily: "monospace" }}>{r.waybill || "—"}</span> },
    { key: "order_ref", label: "Order Ref", render: (r) => <span>{r.order_ref || "—"}</span> },
    { key: "courier_status", label: "Courier said", render: (r) => <span>{r.courier_status || "—"}</span> },
    { key: "mapped_status", label: "Mapped to", render: (r) => <span style={{ fontWeight: 600 }}>{r.mapped_status || "—"}</span> },
    {
      key: "processed", label: "Result",
      render: (r) => r.processed
        ? <Badge variant="success">Processed</Badge>
        : (r.processing_error
            ? <Badge variant="danger" title={r.processing_error}>Failed</Badge>
            : <Badge variant="warning">Pending</Badge>),
    },
    {
      key: "replay", label: "Actions",
      render: (r) => (
        <Button size="sm" variant="secondary" disabled={replayingId === r.id}
          title="Re-run this event's payload against the order"
          onClick={() => replayEvent(r.id)}>
          <HugeiconsIcon icon={PlayIcon} size={14} strokeWidth={2} /> {replayingId === r.id ? "Replaying…" : "Replay"}
        </Button>
      ),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <PageHeader
        title="Courier Webhook Monitor"
        subtitle="Live proof of whether iThink is pushing status updates to this backend."
        actions={
          <Button onClick={load} disabled={loading}>
            <HugeiconsIcon icon={RefreshIcon} size={16} strokeWidth={2} /> Refresh
          </Button>
        }
      />

      {/* Status banner */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.9rem 1.1rem", borderRadius: 12,
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
              ? `Last update received ${fmt(summary?.lastReceivedAt)}. Statuses update automatically.`
              : "Until an event appears here, statuses only update through the twice-daily automatic sync (6 AM / 6 PM)."}
          </div>
        </div>
      </div>

      {/* Summary tiles */}
      <StatGrid>
        <StatTile label="Total received" value={summary?.total ?? 0} />
        <StatTile label="Last 24 hours" value={summary?.last24h ?? 0} />
        <StatTile label="Failed" value={summary?.failed ?? 0} tone={(summary?.failed ?? 0) > 0 ? 'danger' : 'default'} />
        <StatTile label="Last received" value={fmt(summary?.lastReceivedAt)} />
      </StatGrid>

      {/* The URL to give iThink */}
      <div style={{ padding: "0.9rem 1.1rem", borderRadius: 12, border: "1px dashed rgba(128,128,128,0.4)" }}>
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
      {error && <div style={{ color: "var(--ds-color-danger)" }}>{error}</div>}
      {loading ? <Loader /> : (
        <Panel flush>
          <ResponsiveTable
            columns={columns}
            data={events}
            emptyMessage="No webhooks recorded yet. Once iThink pushes a status (or you send a test), it appears here instantly."
          />
        </Panel>
      )}
    </div>
  );
}

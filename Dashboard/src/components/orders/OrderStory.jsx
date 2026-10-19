import { useEffect, useState } from "react";
import { orderService } from "../../services";

// Everything that happened to one order, for the order popup: status
// timeline, payment + refund rows, the customer return and failed-delivery
// cases. Loads GET /api/orders/:id/desk. Colours come from the --ds tokens so
// it reads correctly in light and dark mode.

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const when = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");
const label = (s) => String(s || "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

const TONE = {
  ok: { bg: "var(--ds-color-success-bg)", fg: "var(--ds-color-success)" },
  warn: { bg: "var(--ds-color-warn-bg)", fg: "var(--ds-color-warn)" },
  bad: { bg: "var(--ds-color-danger-bg)", fg: "var(--ds-color-danger)" },
  info: { bg: "var(--ds-color-info-bg)", fg: "var(--ds-color-info)" },
};
const Pill = ({ tone = "info", children }) => (
  <span style={{ background: TONE[tone].bg, color: TONE[tone].fg, padding: "2px 9px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600, whiteSpace: "nowrap" }}>{children}</span>
);
const paymentTone = (p) => (p.is_refund || ["refunded", "partial_refund"].includes(p.status) ? "info"
  : ["successful", "completed"].includes(p.status) ? "ok"
  : p.status === "failed" ? "bad" : "warn");

const box = { border: "1px solid var(--ds-color-border)", borderRadius: 10, padding: "12px 14px", background: "var(--ds-color-surface)" };
const head = { fontSize: ".72rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--ds-color-text-muted)", marginBottom: 8 };
const muted = { color: "var(--ds-color-text-muted)", fontSize: ".8rem" };

export default function OrderStory({ orderId }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!orderId) return;
    let alive = true;
    setData(null); setError(null);
    orderService.getOrderDesk(orderId)
      .then((d) => { if (alive) setData(d); })
      .catch((e) => { if (alive) setError(e.message || "Couldn't load the order history"); });
    return () => { alive = false; };
  }, [orderId]);

  if (error) return <div style={{ ...box, ...muted }}>{error}</div>;
  if (!data) return <div style={{ ...box, ...muted }}>Loading order history…</div>;

  const { history = [], payments = [], returns = [], ndr = [] } = data;

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {ndr.length > 0 && (
        <div style={box}>
          <div style={head}>Failed delivery</div>
          {ndr.map((c) => (
            <div key={c.id} style={{ display: "grid", gap: 4, paddingBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Pill tone={c.status === "closed" ? "ok" : "bad"}>{c.status === "closed" ? "Closed" : label(c.status)}</Pill>
                <span style={muted}>Attempt {c.attempts} · {when(c.updated_at)}</span>
              </div>
              <div style={{ fontSize: ".85rem" }}>Courier: {c.reason || "—"}</div>
              <div style={{ fontSize: ".85rem" }}>
                Customer: {c.customer_action === "reattempt" ? "Deliver again" : c.customer_action === "new_address" ? `New address — ${c.new_address || "waiting"}` : c.customer_action === "cancel" ? "Cancel the order" : "No reply yet"}
              </div>
              {c.resolved_note && <div style={muted}>{c.resolved_note}</div>}
            </div>
          ))}
          <div style={muted}>Act on it under Orders → Delivery problems.</div>
        </div>
      )}

      {returns.length > 0 && (
        <div style={box}>
          <div style={head}>Return</div>
          {returns.map((r) => (
            <div key={r.id} style={{ display: "grid", gap: 4, paddingBottom: 8 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <strong>{r.return_number}</strong>
                <Pill tone={r.status === "refunded" ? "ok" : r.status === "rejected" ? "bad" : "warn"}>{label(r.status)}</Pill>
                <span style={muted}>{when(r.created_at || r.createdAt)}</span>
              </div>
              <div style={{ fontSize: ".85rem" }}>
                Reason: {label(r.reason)} · Item value {money(r.requested_amount)}
                {r.refund_amount != null && r.status === "refunded" ? ` · Refunded ${money(r.refund_amount)}` : ""}
                {Number(r.charges_deducted) > 0 ? ` (${money(r.charges_deducted)} deducted)` : ""}
              </div>
              <div style={muted}>{r.is_cod ? `UPI refund to ${r.upi_id || "—"}${r.payout_phone ? ` · ${r.payout_phone}` : ""}` : "Refund to original payment method"}</div>
            </div>
          ))}
          <div style={muted}>Manage it under Orders → Returns.</div>
        </div>
      )}

      <div style={box}>
        <div style={head}>Payments &amp; refunds</div>
        {payments.length === 0 ? <div style={muted}>No payment records yet{" "}(COD is recorded on delivery).</div> : (
          <div style={{ display: "grid", gap: 6 }}>
            {payments.map((p) => (
              <div key={p.id} style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap", fontSize: ".85rem" }}>
                <span style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <Pill tone={paymentTone(p)}>{p.is_refund ? "Refund" : label(p.status)}</Pill>
                  <span style={muted}>{when(p.createdAt || p.created_at)}</span>
                  {p.transaction_id && <code style={{ fontSize: ".75rem" }}>{p.transaction_id}</code>}
                </span>
                <strong style={{ color: p.is_refund ? "var(--ds-color-info)" : "var(--ds-color-text)" }}>{p.is_refund ? `− ${money(-p.amount)}` : money(p.amount)}</strong>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={box}>
        <div style={head}>Timeline</div>
        {history.length === 0 ? <div style={muted}>No status changes recorded.</div> : (
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 8 }}>
            {history.map((h) => (
              <li key={h.id} style={{ display: "grid", gridTemplateColumns: "10px 1fr", gap: 10 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--ds-color-brand, var(--ds-color-info))", marginTop: 6 }} />
                <span>
                  <strong style={{ fontSize: ".85rem" }}>{label(h.status)}</strong>
                  <span style={{ ...muted, marginLeft: 8 }}>{when(h.createdAt || h.created_at)}</span>
                  {h.notes && <div style={muted}>{h.notes}</div>}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

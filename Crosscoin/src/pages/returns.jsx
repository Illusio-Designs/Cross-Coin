import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useAuth } from "../context/AuthContext";
import { getUserOrders, getMyReturns, createReturn } from "../services/publicApi";

const PRIMARY = "#180D3E";
const ACCENT = "#CE1E36";
const REASONS = [
  ["damaged", "Damaged or leaking on arrival"],
  ["defective", "Defective — doesn't work"],
  ["wrong", "Wrong product received"],
  ["notdesc", "Not as described"],
  ["changed", "Changed my mind"],
  ["other", "Other"],
];
const NEEDS_PHOTO = ["damaged", "defective", "wrong", "notdesc"];
const STATUS_LABEL = {
  requested: "Requested", under_review: "Under review", approved: "Approved",
  pickup_scheduled: "Pickup scheduled", picked_up: "Picked up", received: "Received",
  refunded: "Refunded", rejected: "Rejected",
};
const money = (n) => "₹" + Number(n || 0).toFixed(0);

export default function ReturnsPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => { if (!authLoading && !isAuthenticated) router.replace("/login"); }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        getMyReturns().catch(() => ({ returns: [] })),
        getUserOrders().catch(() => ({})),
      ]);
      setReturns(rRes?.returns || []);
      const all = oRes?.orders || oRes?.data || (Array.isArray(oRes) ? oRes : []);
      setOrders(all.filter((o) => ["delivered", "return_initiated"].includes((o.status || "").toLowerCase())));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const startForm = (order) => { setMsg(null); setForm({ order_id: order.id, order, reason: "", note: "", resolution: order.payment_type === "cod" ? "upi" : "original", upi_id: "", photos: [] }); };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addPhotos = (e) => { const files = Array.from(e.target.files || []).slice(0, 4 - form.photos.length); set("photos", [...form.photos, ...files]); e.target.value = ""; };

  const submit = async (e) => {
    e.preventDefault(); setMsg(null);
    if (!form.reason) return setMsg({ t: "err", m: "Please choose a reason." });
    if (NEEDS_PHOTO.includes(form.reason) && form.photos.length === 0) return setMsg({ t: "err", m: "Please add at least one photo for this reason." });
    if (form.resolution === "upi" && !form.upi_id.trim()) return setMsg({ t: "err", m: "Please enter your UPI ID." });
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("order_id", form.order_id);
      fd.append("reason", form.reason);
      fd.append("note", form.note || "");
      fd.append("resolution", form.resolution);
      if (form.resolution === "upi") fd.append("upi_id", form.upi_id);
      form.photos.forEach((f) => fd.append("images", f));
      await createReturn(fd);
      setForm(null); setMsg({ t: "ok", m: "Return request submitted. We’ll review it within 24–48 hours." });
      await load();
    } catch (err) { setMsg({ t: "err", m: err?.message || "Something went wrong" }); }
    finally { setSubmitting(false); }
  };

  if (authLoading || !isAuthenticated) return <div style={{ padding: 80, textAlign: "center" }}>Loading…</div>;

  const isCod = form && form.order?.payment_type === "cod";
  const resolutions = isCod ? [["upi", "Refund to UPI / bank"], ["exchange", "Exchange"]] : [["original", "Refund to original payment"], ["upi", "Refund to UPI / bank"], ["exchange", "Exchange"]];

  return (
    <div style={{ background: "#f5f5f7", minHeight: "70vh", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: PRIMARY, color: "#fff", padding: "34px 20px" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ fontSize: ".78rem", letterSpacing: ".14em", textTransform: "uppercase", opacity: .7 }}>Account</div>
          <h1 style={{ margin: "6px 0 0", fontSize: "1.9rem" }}>Returns &amp; refunds</h1>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "22px 20px 60px" }}>
        {msg && <div style={{ margin: "0 0 16px", padding: "11px 14px", borderRadius: 10, fontSize: ".9rem", background: msg.t === "ok" ? "#e7f6ee" : "#fdeaea", color: msg.t === "ok" ? "#0a7a44" : ACCENT }}>{msg.m}</div>}

        {form && (
          <form onSubmit={submit} style={card}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <b>Request a return — #{form.order.order_number}</b>
              <button type="button" className="pf-btn-ghost" onClick={() => setForm(null)}>Cancel</button>
            </div>
            <label style={lbl}>Reason</label>
            <select value={form.reason} onChange={(e) => set("reason", e.target.value)} style={inp}>
              <option value="">Select a reason…</option>
              {REASONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            <label style={lbl}>Tell us more {form.reason === "other" ? "" : "(optional)"}</label>
            <textarea value={form.note} onChange={(e) => set("note", e.target.value)} placeholder="Describe the issue…" style={{ ...inp, minHeight: 72 }} />
            <label style={lbl}>Photos {NEEDS_PHOTO.includes(form.reason) ? "(required)" : "(optional)"}</label>
            <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={form.photos.length >= 4} />
            {form.photos.length > 0 && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                {form.photos.map((f, i) => (
                  <div key={i} style={{ position: "relative" }}>
                    <img src={URL.createObjectURL(f)} alt="" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }} />
                    <button type="button" onClick={() => set("photos", form.photos.filter((_, k) => k !== i))} style={{ position: "absolute", top: -6, right: -6, width: 20, height: 20, borderRadius: 999, border: 0, background: "#333", color: "#fff", cursor: "pointer" }}>×</button>
                  </div>
                ))}
              </div>
            )}
            <label style={lbl}>How would you like your refund?</label>
            {isCod && <p style={{ fontSize: ".8rem", color: "#777", margin: "0 0 6px" }}>This was a COD order, so there’s no online payment to reverse — choose a UPI/bank payout or an exchange.</p>}
            <select value={form.resolution} onChange={(e) => set("resolution", e.target.value)} style={inp}>
              {resolutions.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
            </select>
            {form.resolution === "upi" && (<><label style={lbl}>Your UPI ID</label><input type="text" value={form.upi_id} onChange={(e) => set("upi_id", e.target.value)} placeholder="name@upi" style={inp} /></>)}
            <button type="submit" className="pf-btn-primary" disabled={submitting} style={{ marginTop: 14 }}>{submitting ? "Submitting…" : "Submit request"}</button>
          </form>
        )}

        {loading ? <p style={{ color: "#777" }}>Loading…</p> : (
          <>
            {returns.length > 0 && (
              <>
                <h3 style={{ margin: "6px 0 12px" }}>Your return requests</h3>
                <div style={{ display: "grid", gap: 12 }}>
                  {returns.map((r) => (
                    <div key={r.id} style={card}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                        <div><b>{r.return_number}</b> <span style={{ color: "#888" }}>· {r.Order?.order_number || ""}</span></div>
                        <span style={badge(r.status)}>{STATUS_LABEL[r.status] || r.status}</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: ".85rem", color: "#666" }}>
                        {money(r.refund_amount ?? r.requested_amount)}{r.status === "refunded" ? " refunded" : ""}{r.pickup_awb ? ` · Pickup AWB ${r.pickup_awb}` : ""}
                      </div>
                      {r.status === "refunded" && r.payout_proof && (
                        <div style={{ marginTop: 8 }}><span style={{ color: "#888", fontSize: ".8rem" }}>Payment proof:</span>{" "}
                          <a href={r.payout_proof} target="_blank" rel="noreferrer"><img src={r.payout_proof} alt="proof" style={{ width: 60, height: 60, objectFit: "cover", borderRadius: 8, verticalAlign: "middle" }} /></a></div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            <h3 style={{ margin: "26px 0 12px" }}>Request a return</h3>
            {orders.length === 0 ? (
              <div style={{ ...card, textAlign: "center", color: "#777" }}>
                <p style={{ margin: "0 0 10px" }}>No delivered orders eligible for return right now.</p>
                <Link href="/profile" className="pf-btn-ghost">View my orders</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {orders.map((o) => (
                  <div key={o.id} style={{ ...card, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <div><b>#{o.order_number}</b> <span style={{ color: "#888" }}>{o.created_at ? new Date(o.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}</span></div>
                    <span style={{ color: "#666" }}>{money(o.final_amount || o.total_amount)}</span>
                    <button className="pf-btn-primary" onClick={() => startForm(o)}>Request return</button>
                  </div>
                ))}
              </div>
            )}
            <p style={{ marginTop: 12, fontSize: ".82rem", color: "#888" }}>Returns are accepted within 7 days of delivery.</p>
          </>
        )}
      </div>
    </div>
  );
}

const card = { background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, padding: 18, marginBottom: 0 };
const lbl = { display: "block", fontWeight: 600, fontSize: ".85rem", margin: "14px 0 6px" };
const inp = { width: "100%", border: "1px solid #d7dce4", borderRadius: 10, padding: "11px 13px", fontFamily: "inherit", fontSize: ".92rem", boxSizing: "border-box" };
function badge(s) {
  const ok = s === "refunded" || s === "approved" || s === "received";
  const bad = s === "rejected";
  return { background: ok ? "#e7f6ee" : bad ? "#fdeaea" : "#eef2ff", color: ok ? "#0a7a44" : bad ? "#CE1E36" : "#180D3E", padding: "3px 10px", borderRadius: 999, fontSize: ".72rem", fontWeight: 600 };
}

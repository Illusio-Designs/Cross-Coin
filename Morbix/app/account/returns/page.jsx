'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/Icon';
import AccountGate from '@/components/account/AccountGate';
import { useAuth } from '@/context/AuthContext';
import { getUserOrders, getMyReturns, createReturn } from '@/lib/api/orders';

const REASONS = [
  ['damaged', 'Damaged or leaking on arrival'],
  ['defective', "Defective — doesn't work"],
  ['wrong', 'Wrong product received'],
  ['notdesc', 'Not as described'],
  ['changed', 'Changed my mind'],
  ['other', 'Other'],
];
const NEEDS_PHOTO = ['damaged', 'defective', 'wrong', 'notdesc'];
const STATUS_LABEL = {
  requested: 'Requested', under_review: 'Under review', approved: 'Approved',
  pickup_scheduled: 'Pickup scheduled', picked_up: 'Picked up', received: 'Received',
  refunded: 'Refunded', rejected: 'Rejected',
};
function statusClass(s) {
  if (s === 'refunded' || s === 'approved' || s === 'received') return 'ok';
  if (s === 'rejected') return 'bad';
  return 'pending';
}
const money = (n) => '₹' + Number(n || 0).toFixed(0);

function ReturnsInner() {
  const { isAuthenticated } = useAuth();
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        getMyReturns().catch(() => ({ returns: [] })),
        getUserOrders({ limit: 50 }).catch(() => ({})),
      ]);
      setReturns(rRes?.returns || []);
      const all = oRes?.orders || oRes?.data || (Array.isArray(oRes) ? oRes : []);
      setOrders(all.filter((o) => ['delivered', 'return_initiated'].includes((o.status || '').toLowerCase())));
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  const startForm = (order) => {
    setMsg(null);
    setForm({ order_id: order.id, order, reason: '', note: '', resolution: order.payment_type === 'cod' ? 'upi' : 'original', upi_id: '', photos: [] });
  };
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const addPhotos = (e) => {
    const files = Array.from(e.target.files || []).slice(0, 4 - form.photos.length);
    set('photos', [...form.photos, ...files]);
    e.target.value = '';
  };

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!form.reason) return setMsg({ t: 'err', m: 'Please choose a reason.' });
    if (NEEDS_PHOTO.includes(form.reason) && form.photos.length === 0) return setMsg({ t: 'err', m: 'Please add at least one photo for this reason.' });
    if (form.resolution === 'upi' && !form.upi_id.trim()) return setMsg({ t: 'err', m: 'Please enter your UPI ID.' });
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('order_id', form.order_id);
      fd.append('reason', form.reason);
      fd.append('note', form.note || '');
      fd.append('resolution', form.resolution);
      if (form.resolution === 'upi') fd.append('upi_id', form.upi_id);
      form.photos.forEach((f) => fd.append('images', f));
      await createReturn(fd);
      setForm(null);
      setMsg({ t: 'ok', m: 'Return request submitted. We’ll review it within 24–48 hours.' });
      await load();
    } catch (err) { setMsg({ t: 'err', m: err.message }); }
    finally { setSubmitting(false); }
  };

  const isCod = form && form.order?.payment_type === 'cod';
  const resolutions = isCod
    ? [['upi', 'Refund to UPI / bank'], ['exchange', 'Exchange']]
    : [['original', 'Refund to original payment'], ['upi', 'Refund to UPI / bank'], ['exchange', 'Exchange']];

  return (
    <div className="container" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <nav className="crumbs"><Link href="/account">Account</Link> <span>/</span> <b>Returns</b></nav>
      <div className="page-hero"><span className="eyebrow">Account</span><h1>Returns & refunds</h1></div>

      {msg && (
        <div style={{ margin: '14px 0', padding: '11px 14px', borderRadius: 12, fontSize: '.9rem', background: msg.t === 'ok' ? '#e7f6ee' : '#fdeaea', color: msg.t === 'ok' ? '#0a7a44' : '#c0392b' }}>{msg.m}</div>
      )}

      {/* request form */}
      {form && (
        <form onSubmit={submit} style={{ border: '1px solid var(--line, #e6e9ee)', borderRadius: 'var(--r, 16px)', padding: 18, margin: '8px 0 26px', background: 'var(--card, #fff)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <b>Request a return — #{form.order.order_number}</b>
            <button type="button" className="btn btn-ghost" onClick={() => setForm(null)}>Cancel</button>
          </div>

          <label style={lbl}>Reason</label>
          <select value={form.reason} onChange={(e) => set('reason', e.target.value)} style={inp}>
            <option value="">Select a reason…</option>
            {REASONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>

          <label style={lbl}>Tell us more {form.reason === 'other' ? '' : '(optional)'}</label>
          <textarea value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Describe the issue…" style={{ ...inp, minHeight: 72 }} />

          <label style={lbl}>Photos {NEEDS_PHOTO.includes(form.reason) ? '(required)' : '(optional)'}</label>
          <input type="file" accept="image/*" multiple onChange={addPhotos} disabled={form.photos.length >= 4} />
          {form.photos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
              {form.photos.map((f, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={URL.createObjectURL(f)} alt="" style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8 }} />
                  <button type="button" onClick={() => set('photos', form.photos.filter((_, k) => k !== i))} style={{ position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 999, border: 0, background: '#333', color: '#fff', cursor: 'pointer' }}>×</button>
                </div>
              ))}
            </div>
          )}

          <label style={lbl}>How would you like your refund?</label>
          {isCod && <p style={{ fontSize: '.8rem', color: 'var(--muted,#777)', margin: '0 0 6px' }}>This was a COD order, so there’s no online payment to reverse — choose a UPI/bank payout or an exchange.</p>}
          <select value={form.resolution} onChange={(e) => set('resolution', e.target.value)} style={inp}>
            {resolutions.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
          </select>
          {form.resolution === 'upi' && (
            <>
              <label style={lbl}>Your UPI ID</label>
              <input type="text" value={form.upi_id} onChange={(e) => set('upi_id', e.target.value)} placeholder="name@upi" style={inp} />
            </>
          )}

          <button type="submit" className="btn btn-primary" disabled={submitting} style={{ marginTop: 14 }}>
            {submitting ? 'Submitting…' : 'Submit request'}
          </button>
        </form>
      )}

      {loading ? (
        <p className="muted" style={{ marginTop: 20 }}>Loading…</p>
      ) : (
        <>
          {/* existing returns */}
          {returns.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <h3 style={{ margin: '0 0 12px' }}>Your return requests</h3>
              <div className="order-list">
                {returns.map((r) => (
                  <div className="order-row" key={r.id} style={{ display: 'block' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div><b>{r.return_number}</b> <span className="muted">· {r.Order?.order_number || ''}</span></div>
                      <span className={`order-status ${statusClass(r.status)}`}>{STATUS_LABEL[r.status] || r.status}</span>
                    </div>
                    <div className="muted" style={{ marginTop: 4, fontSize: '.85rem' }}>
                      {money(r.refund_amount ?? r.requested_amount)}
                      {r.status === 'refunded' ? ' refunded' : ''}
                      {r.pickup_awb ? ` · Pickup AWB ${r.pickup_awb}` : ''}
                    </div>
                    {r.status === 'refunded' && r.payout_proof && (
                      <div style={{ marginTop: 8 }}>
                        <span className="muted" style={{ fontSize: '.8rem' }}>Payment proof:</span>{' '}
                        <a href={r.payout_proof} target="_blank" rel="noreferrer"><img src={r.payout_proof} alt="proof" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, verticalAlign: 'middle' }} /></a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* eligible orders */}
          <div style={{ marginTop: 28 }}>
            <h3 style={{ margin: '0 0 12px' }}>Request a return</h3>
            {orders.length === 0 ? (
              <div className="cart-empty">
                <Icon name="ShoppingBag" size={40} color="#c3ccd2" />
                <p>No delivered orders eligible for return right now.</p>
                <Link href="/account/orders" className="btn btn-ghost">View all orders</Link>
              </div>
            ) : (
              <div className="order-list">
                {orders.map((o) => (
                  <div className="order-row" key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <div>
                      <b>#{o.order_number}</b>{' '}
                      <span className="muted">{o.created_at ? new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}</span>
                    </div>
                    <span className="muted">{money(o.final_amount || o.total_amount)}</span>
                    <button className="btn btn-primary" onClick={() => startForm(o)}>Request return</button>
                  </div>
                ))}
              </div>
            )}
            <p className="muted" style={{ marginTop: 12, fontSize: '.82rem' }}>Returns are accepted within 7 days of delivery.</p>
          </div>
        </>
      )}
    </div>
  );
}

const lbl = { display: 'block', fontWeight: 600, fontSize: '.85rem', margin: '14px 0 6px' };
const inp = { width: '100%', border: '1px solid var(--line, #d7dce4)', borderRadius: 10, padding: '11px 13px', fontFamily: 'inherit', fontSize: '.92rem', background: 'var(--bg, #fff)' };

export default function ReturnsPage() {
  return <AccountGate><ReturnsInner /></AccountGate>;
}

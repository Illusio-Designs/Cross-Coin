'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserOrders, getMyReturns, createReturn } from '@/lib/api/orders';
import { canRequestReturn, RETURN_STATUS_LABEL, returnRefundMethod } from '@/utils/orderStatus';
import { ReturnsBodySkeleton, ReturnsSkeleton } from '../../_components/Skeleton';

const REASONS = [
  ['damaged', 'Damaged or leaking on arrival'],
  ['defective', "Defective — the atomiser doesn't work"],
  ['wrong', 'Wrong product received'],
  ['notdesc', 'Not as described'],
  ['changed', 'Changed my mind'],
  ['other', 'Other'],
];
const NEEDS_PHOTO = ['damaged', 'defective', 'wrong', 'notdesc'];
const MAX_PHOTOS = 4;
const money = (n) => '₹' + Math.round(Number(n || 0)).toLocaleString('en-IN');
const asArray = (d) => (Array.isArray(d) ? d : (d?.orders || d?.data || []));
const fmtDate = (v) => { if (!v) return ''; const d = new Date(v); return isNaN(d) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); };
const tone = (s) => (['refunded', 'approved', 'received'].includes(s) ? 'ok' : s === 'rejected' ? 'bad' : 'warn');

/* Customer returns & refunds: request a return on a delivered order (reason,
   photos for damage claims, UPI payout details for COD orders) and follow
   every request through to the refund. */
export default function ReturnsClient() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const orderParam = useSearchParams().get('order');
  const autoOpened = useRef(false);
  const formRef = useRef(null);
  const [returns, setReturns] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(null);
  const [previews, setPreviews] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) router.replace(`/login?next=${encodeURIComponent('/account/returns')}`);
  }, [authLoading, isAuthenticated, router]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, oRes] = await Promise.all([
        getMyReturns().catch(() => ({ returns: [] })),
        getUserOrders({ limit: 50 }).catch(() => []),
      ]);
      setReturns(rRes?.returns || []);
      setOrders(asArray(oRes).filter((o) => canRequestReturn(o.status)));
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { if (isAuthenticated) load(); }, [isAuthenticated, load]);

  // Object URLs for photo previews, revoked when the selection changes.
  useEffect(() => {
    const urls = (form?.photos || []).map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [form?.photos]);

  const startForm = (order) => {
    setMsg(null);
    setForm({ order_id: order.id, order, reason: '', note: '', upi_id: '', payout_phone: '', photos: [] });
    requestAnimationFrame(() => formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // /account/returns?order=<id> (from the account "Return" button) opens the form.
  useEffect(() => {
    if (loading || autoOpened.current || !orderParam) return;
    autoOpened.current = true;
    const match = orders.find((o) => String(o.id) === String(orderParam));
    if (match) startForm(match);
  }, [loading, orders, orderParam]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const addPhotos = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith('image/')).slice(0, MAX_PHOTOS - form.photos.length);
    set('photos', [...form.photos, ...files]);
    e.target.value = '';
  };

  const isCod = form?.order?.payment_type === 'cod';
  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    if (!form.reason) return setMsg({ t: 'err', m: 'Please choose a reason.' });
    if (form.reason === 'other' && !form.note.trim()) return setMsg({ t: 'err', m: 'Please tell us a little about the issue.' });
    if (NEEDS_PHOTO.includes(form.reason) && form.photos.length === 0) return setMsg({ t: 'err', m: 'Please add at least one photo for this reason.' });
    if (isCod && !/^[\w.-]{2,}@[a-zA-Z][\w.-]*$/.test(form.upi_id.trim())) return setMsg({ t: 'err', m: 'Please enter a valid UPI ID (e.g. name@okaxis).' });
    if (isCod && !/^[6-9]\d{9}$/.test(form.payout_phone.replace(/\D/g, '').slice(-10))) return setMsg({ t: 'err', m: 'Please enter the 10-digit mobile number linked to your UPI.' });
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('order_id', form.order_id);
      fd.append('reason', form.reason);
      fd.append('note', form.note || '');
      if (isCod) { fd.append('upi_id', form.upi_id.trim()); fd.append('payout_phone', form.payout_phone.trim()); }
      form.photos.forEach((f) => fd.append('images', f));
      await createReturn(fd);
      setForm(null);
      setMsg({ t: 'ok', m: 'Return request submitted. We’ll review it within 24–48 hours and update you on WhatsApp.' });
      await load();
    } catch (err) {
      setMsg({ t: 'err', m: err?.message || 'Something went wrong. Please try again.' });
    } finally { setSubmitting(false); }
  };

  if (authLoading || !isAuthenticated) {
    return <ReturnsSkeleton />;
  }

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow"><Link href="/account">Account</Link> · Returns</span>
        <h1>Returns &amp; Refunds.</h1>
        <p>Request a return within 7 days of delivery and follow your refund here.</p>
      </section>

      <div className="m-wrap m-section m-narrow" style={{ paddingTop: 0 }}>
        {msg ? <div className={`m-alert m-alert--${msg.t === 'ok' ? 'ok' : 'err'}`} role={msg.t === 'ok' ? 'status' : 'alert'}>{msg.m}</div> : null}

        {form ? (
          <form ref={formRef} className="m-formcard" onSubmit={submit} noValidate style={{ marginBottom: 26 }}>
            <div className="m-ordhead">
              <span className="m-eyebrow">Return — order #{form.order.order_number}</span>
              <button type="button" className="m-linkbtn" onClick={() => setForm(null)}>Cancel</button>
            </div>
            <div className="m-field" style={{ marginTop: 16 }}>
              <label className="m-label" htmlFor="r-reason">Reason</label>
              <select id="r-reason" className="m-input" value={form.reason} onChange={(e) => set('reason', e.target.value)}>
                <option value="">Select a reason…</option>
                {REASONS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}
              </select>
            </div>
            <div className="m-field">
              <label className="m-label" htmlFor="r-note">Tell us more {form.reason === 'other' ? '' : '(optional)'}</label>
              <textarea id="r-note" className="m-textarea" style={{ minHeight: 90 }} value={form.note} onChange={(e) => set('note', e.target.value)} placeholder="Describe the issue…" />
            </div>
            <div className="m-field">
              <span className="m-label">Photos {NEEDS_PHOTO.includes(form.reason) ? '(required)' : '(optional)'} · up to {MAX_PHOTOS}</span>
              <div className="m-photos">
                {previews.map((src, i) => (
                  <span key={src} className="m-photos__i">
                    <img src={src} alt={`Photo ${i + 1}`} />
                    <button type="button" aria-label={`Remove photo ${i + 1}`} onClick={() => set('photos', form.photos.filter((_, k) => k !== i))}>×</button>
                  </span>
                ))}
                {form.photos.length < MAX_PHOTOS ? (
                  <label className="m-photos__add">
                    <input type="file" accept="image/*" multiple onChange={addPhotos} className="sr-only" />
                    + Add photo
                  </label>
                ) : null}
              </div>
            </div>
            <div className="m-field">
              <span className="m-label">Refund</span>
              {isCod ? (
                <>
                  <p className="m-muted" style={{ fontSize: 13.5, marginBottom: 12 }}>This was a Cash on Delivery order, so we refund you by UPI once the item reaches us.</p>
                  <div className="m-grid2">
                    <div className="m-field"><label className="m-label" htmlFor="r-upi">Your UPI ID</label><input id="r-upi" className="m-input" value={form.upi_id} onChange={(e) => set('upi_id', e.target.value)} placeholder="name@okaxis" autoComplete="off" /></div>
                    <div className="m-field"><label className="m-label" htmlFor="r-ph">Mobile linked to that UPI</label><input id="r-ph" className="m-input" type="tel" inputMode="numeric" maxLength={10} value={form.payout_phone} onChange={(e) => set('payout_phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" /></div>
                  </div>
                </>
              ) : (
                <p className="m-muted" style={{ fontSize: 13.5 }}>We refund your original payment method once the item reaches us.</p>
              )}
            </div>
            <button type="submit" className="m-btn m-btn--fill" disabled={submitting} style={{ width: '100%', justifyContent: 'center' }}>{submitting ? 'Submitting…' : 'Submit return request'}</button>
          </form>
        ) : null}

        {/* First load only — a reload after submitting keeps the lists, dimmed. */}
        {loading && !returns.length && !orders.length ? <ReturnsBodySkeleton /> : (
          <div className={loading ? 'sk-dim' : undefined} aria-busy={loading || undefined}>
            {returns.length ? (
              <>
                <h2 className="m-card-h" style={{ margin: '6px 0 14px' }}>Your return requests</h2>
                <ul className="m-olist">
                  {returns.map((r) => (
                    <li key={r.id} className="m-ordcard">
                      <div className="m-ordhead">
                        <div><b className="m-crow__n" style={{ fontSize: 18 }}>{r.return_number}</b> <span className="m-muted">· order {r.Order?.order_number || ''}</span></div>
                        <span className={`m-badge m-badge--${tone(r.status)}`}>{RETURN_STATUS_LABEL[r.status] || r.status}</span>
                      </div>
                      <p className="m-muted" style={{ marginTop: 8, fontSize: 13.5 }}>
                        {r.status === 'refunded'
                          ? <>Refunded {money(r.refund_amount ?? r.requested_amount)}{Number(r.charges_deducted) > 0 ? ` (${money(r.charges_deducted)} deducted)` : ''}</>
                          : <>Item value {money(r.requested_amount)}{r.status === 'rejected' ? '' : ' — the final refund is confirmed after we check the item'}</>}
                        {r.pickup_awb ? ` · Pickup AWB ${r.pickup_awb}` : ''}
                      </p>
                      <p className="m-muted" style={{ fontSize: 12.5, marginTop: 2 }}>Refund to: {returnRefundMethod(r)}{r.createdAt || r.created_at ? ` · Requested ${fmtDate(r.createdAt || r.created_at)}` : ''}</p>
                      {r.status === 'rejected' && r.admin_note ? <p className="m-formerr">Reason: {r.admin_note}</p> : null}
                      {r.status === 'refunded' && r.payout_proof ? (
                        <p style={{ marginTop: 8, fontSize: 12.5 }}><a className="m-textlink" href={r.payout_proof} target="_blank" rel="noopener noreferrer">View payment proof ↗</a></p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <h2 className="m-card-h" style={{ margin: '26px 0 14px' }}>Request a return</h2>
            {orders.length === 0 ? (
              <div className="m-empty" style={{ padding: '36px 24px' }}>
                <p style={{ marginBottom: 16 }}>No delivered orders are eligible for a return right now.</p>
                <Link className="m-btn m-btn--ghost" href="/account">View my orders</Link>
              </div>
            ) : (
              <ul className="m-olist">
                {orders.map((o) => (
                  <li key={o.id} className="m-ordcard m-ordhead">
                    <div><b className="m-crow__n" style={{ fontSize: 18 }}>#{o.order_number}</b><div className="m-jcard__meta" style={{ marginTop: 4 }}>{fmtDate(o.created_at || o.createdAt)} · {money(o.final_amount || o.total_amount)}</div></div>
                    <button type="button" className="m-btn m-btn--fill m-btn--sm" onClick={() => startForm(o)}>Request return</button>
                  </li>
                ))}
              </ul>
            )}
            <p className="m-muted" style={{ marginTop: 14, fontSize: 12.5 }}>Returns are accepted within 7 days of delivery. See our <Link className="m-textlink" href="/cancellation-refund">cancellation &amp; refund policy</Link>.</p>
          </div>
        )}
      </div>
    </>
  );
}

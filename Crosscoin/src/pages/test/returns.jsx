import Head from 'next/head';
import { R } from '@/components/test/routes';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { Dropdown, I, toast, Sk, SkBusy, useHydrated, FieldSkeletons, OrderCardSkeletons } from '../../components/test/ui';
import { inr } from '../../components/test/data';
import { useAuthed, fetchMyOrders } from '../../components/test/auth';
import { createReturn, getMyReturns } from '../../services/publicApi';
import { canRequestReturn, RETURN_STATUS_LABEL, returnRefundMethod } from '../../utils/orderStatus';

// Exact backend reason values (Backend/controller/returnController.js VALID_REASONS).
const REASONS = [
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'defective', label: 'Defective / quality issue' },
  { value: 'wrong', label: 'Wrong item received' },
  { value: 'notdesc', label: 'Not as described' },
  { value: 'changed', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];
const NEEDS_PHOTO = ['damaged', 'defective', 'wrong', 'notdesc'];
// Returns still being handled — an order with one of these can't get another.
const OPEN_RETURN = ['requested', 'under_review', 'approved', 'pickup_scheduled', 'picked_up', 'received'];
const MAX_PHOTOS = 4;
const UPI_RE = /^[\w.\-]{2,}@[a-zA-Z][\w.\-]*$/;
const PHONE_RE = /^[6-9]\d{9}$/;

const fmt = (d) => { try { return d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; } catch (_) { return ''; } };
const money = (n) => '₹' + (Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const errMsg = (e, fallback) => (typeof e === 'string' ? e : e?.message) || fallback;
const isCod = (o) => String(o?.paymentType || '').toLowerCase() === 'cod';

export default function TestReturns() {
  const router = useRouter();
  const authed = useAuthed();
  const hydrated = useHydrated();
  const [orders, setOrders] = useState([]);
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);

  const [orderId, setOrderId] = useState('');
  const [reason, setReason] = useState('damaged');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState([]);
  const [fileKey, setFileKey] = useState(0);
  const [upi, setUpi] = useState('');
  const [payoutPhone, setPayoutPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(null);

  const load = useCallback(async () => {
    const [o, r] = await Promise.all([
      fetchMyOrders(),
      getMyReturns().then((d) => d?.returns || (Array.isArray(d) ? d : [])).catch(() => []),
    ]);
    setOrders(o || []);
    setReturns(r || []);
  }, []);

  useEffect(() => {
    if (!authed) return;
    let off = false;
    setLoading(true);
    load().catch(() => {}).finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
  }, [authed, load]);

  const eligible = useMemo(() => {
    const open = new Set(returns
      .filter((r) => OPEN_RETURN.includes(r.status))
      .map((r) => String(r.order_id ?? r.Order?.id ?? '')));
    return orders.filter((o) => o.id != null && canRequestReturn(o.status) && !open.has(String(o.id)));
  }, [orders, returns]);

  // Preselect ?order=<orderId> (from the account page), else the first eligible order.
  useEffect(() => {
    if (!router.isReady || eligible.length === 0) return;
    const q = router.query.order ? String(router.query.order) : '';
    setOrderId((cur) => {
      if (cur && eligible.some((o) => String(o.id) === cur)) return cur;
      if (q && eligible.some((o) => String(o.id) === q)) return q;
      return String(eligible[0].id);
    });
  }, [router.isReady, router.query.order, eligible]);

  const selected = eligible.find((o) => String(o.id) === orderId) || null;
  const cod = isCod(selected);
  const needsPhoto = NEEDS_PHOTO.includes(reason);
  const orderOptions = eligible.map((o) => ({
    value: String(o.id),
    label: [o.number, o.date && fmt(o.date), inr(o.total)].filter(Boolean).join(' · '),
  }));

  const onPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > MAX_PHOTOS) toast(`Only the first ${MAX_PHOTOS} photos will be sent`);
    setPhotos(files.slice(0, MAX_PHOTOS));
  };

  const resetForm = () => {
    setReason('damaged'); setNote(''); setPhotos([]); setFileKey((k) => k + 1);
    setUpi(''); setPayoutPhone(''); setErr('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setErr('');
    if (!selected) { setErr('Choose the order you want to return.'); return; }
    if (needsPhoto && photos.length === 0) { setErr('Please add at least one photo for this reason.'); return; }
    const upiId = upi.trim();
    const phone = payoutPhone.replace(/\D/g, '').slice(-10);
    if (cod && !UPI_RE.test(upiId)) { setErr('Please enter a valid UPI ID (e.g. name@okaxis) for your refund.'); return; }
    if (cod && !PHONE_RE.test(phone)) { setErr('Please enter the 10-digit mobile number linked to your UPI.'); return; }

    const fd = new FormData();
    fd.append('order_id', String(selected.id));
    fd.append('reason', reason);
    fd.append('note', note.trim());
    photos.forEach((f) => fd.append('images', f));
    if (cod) { fd.append('upi_id', upiId); fd.append('payout_phone', phone); }

    setBusy(true);
    try {
      const res = await createReturn(fd);
      if (res && res.success === false) throw res;
      setDone({ number: res?.return?.return_number || '', order: selected.number });
      toast('Return request submitted ✓');
      resetForm();
      await load().catch(() => {});
    } catch (ex) {
      const m = errMsg(ex, 'Could not submit your return request. Please try again.');
      setErr(m);
      toast(m);
      await load().catch(() => {});
    } finally { setBusy(false); }
  };

  return (
    <TestLayout>
      <Head><title>Returns — CrossCoin</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push(R.home)}>Home</span> / Returns</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Request a return</h2>
          <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 8 }}>Returns accepted within 7 days of delivery.</p>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 560, paddingBottom: 70 }}>
        {!hydrated || (authed && loading) ? (
          // Form + request list in their real frames while we learn the
          // sign-in state and fetch the orders.
          <SkBusy label="Loading your orders…">
            <div className="authcard sk-frame" aria-hidden="true">
              <FieldSkeletons n={4} />
              <Sk h={56} style={{ marginTop: 14 }} />
            </div>
            <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, margin: '34px 0 14px' }}>Your return requests</h3>
            <OrderCardSkeletons n={1} />
          </SkBusy>
        ) : !authed ? (
          <div className="acctsignin">
            <div className="acctsignin__ic">{I.user(26)}</div>
            <div className="acctsignin__t"><b>Sign in to request a return</b><span>Returns are linked to your account so we can match them to your order.</span></div>
            <div className="acctsignin__btns">
              <button className="btn btn--crimson" onClick={() => router.push(R.login)}>Sign in</button>
              <button className="btn" onClick={() => router.push(R.track)}>Track an order</button>
            </div>
          </div>
        ) : (
          <>
            {done ? (
              <div className="authcard" style={{ textAlign: 'center' }}>
                <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, marginBottom: 8 }}>Request received</h3>
                <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6 }}>
                  {done.number ? <>Your return <b>{done.number}</b> for order <b>{done.order}</b> is in.</> : <>We&rsquo;ve received your return for <b>{done.order}</b>.</>}
                  {' '}Our team will confirm pickup and your refund over WhatsApp and email.
                </p>
                <button className="btn btn--crimson btn--lg" style={{ marginTop: 18 }} onClick={() => router.push(R.shop)}>Continue shopping</button>
                {eligible.length > 0 && <p className="authcard__alt"><button type="button" className="authlink" onClick={() => setDone(null)}>Return another order</button></p>}
              </div>
            ) : eligible.length === 0 ? (
              <div className="acctempty mono">
                No delivered orders are available to return right now. Returns can be requested once an order is delivered.{' '}
                <a onClick={() => router.push(R.account)} style={{ color: 'var(--crimson)', cursor: 'pointer' }}>View your orders</a>
              </div>
            ) : (
              <form className="authcard" onSubmit={submit} noValidate>
                <div className="ffield"><label>Order</label><Dropdown value={orderId} options={orderOptions} onChange={(v) => { setOrderId(v); setErr(''); }} ariaLabel="Order to return" /></div>
                <div className="ffield"><label>Reason</label><Dropdown value={reason} options={REASONS} onChange={(v) => { setReason(v); setErr(''); }} ariaLabel="Return reason" /></div>
                <div className="ffield"><label>Photos {needsPhoto ? <span style={{ color: 'var(--crimson)' }}>(required)</span> : <span style={{ color: 'var(--ink-faint)' }}>(optional)</span>}</label>
                  <input key={fileKey} type="file" accept="image/*" multiple className="filefield" onChange={onPhotos} />
                  <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>
                    {photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? '' : 's'} selected · ` : ''}
                    {needsPhoto ? `Add 1–${MAX_PHOTOS} photos showing the issue.` : `Up to ${MAX_PHOTOS} photos.`}
                  </span>
                </div>
                <div className="ffield"><label>Note <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell us what happened…" maxLength={1000} /></div>
                {selected && (cod ? (
                  <>
                    <p className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '4px 0 14px' }}>This was a COD order, so we&rsquo;ll refund you by UPI once we receive the item back.</p>
                    <div className="ffield"><label>UPI ID</label><input value={upi} onChange={(e) => setUpi(e.target.value)} placeholder="name@okaxis" autoComplete="off" autoCapitalize="off" spellCheck={false} /></div>
                    <div className="ffield"><label>Mobile number linked to that UPI</label><input value={payoutPhone} onChange={(e) => setPayoutPhone(e.target.value.replace(/[^\d+\s]/g, ''))} placeholder="10-digit mobile number" inputMode="numeric" autoComplete="tel" maxLength={14} /></div>
                  </>
                ) : (
                  <p className="mono" style={{ fontSize: 12, color: 'var(--ink-soft)', lineHeight: 1.6, margin: '4px 0 14px' }}>We&rsquo;ll refund your original payment method once we receive the item back.</p>
                ))}
                {err && <p className="mono" role="alert" style={{ color: 'var(--crimson)', fontSize: 12.5, margin: '0 0 10px' }}>{err}</p>}
                <button className="btn btn--crimson btn--block btn--lg" type="submit" style={{ marginTop: 14 }} disabled={busy}>{busy ? 'Submitting…' : 'Submit return request'}</button>
                <p className="authcard__note mono">The final refund amount is confirmed after we receive and check the item.</p>
              </form>
            )}

            <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, margin: '34px 0 14px' }}>Your return requests</h3>
            {returns.length === 0 ? (
              <div className="acctempty mono">You haven&rsquo;t requested any returns yet.</div>
            ) : returns.map((r) => {
              const refunded = r.status === 'refunded';
              const deducted = Number(r.charges_deducted) || 0;
              return (
                <div className="order" key={r.id || r.return_number}>
                  <div className="order__top">
                    <div>
                      <div className="order__no">{r.return_number}</div>
                      <div className="order__date">Order {r.Order?.order_number || '—'}{(r.created_at || r.createdAt) ? ` · Requested ${fmt(r.created_at || r.createdAt)}` : ''}</div>
                    </div>
                    <span className={`pill ${refunded ? 'pill--ok' : r.status === 'rejected' ? 'pill--no' : 'pill--info'}`}>{RETURN_STATUS_LABEL[r.status] || r.status}</span>
                  </div>
                  <div className="order__items2">
                    <span className="oitem2">Refund to <b>{returnRefundMethod(r)}</b></span>
                    {r.status === 'rejected' && r.admin_note && <span className="oitem2">Reason: {r.admin_note}</span>}
                  </div>
                  <div className="order__bot">
                    {refunded ? (
                      <div className="order__total">
                        Refunded <b>{money(r.refund_amount)}</b>{deducted > 0 ? ` (${money(deducted)} deducted)` : ''}
                      </div>
                    ) : (
                      <div className="order__total" style={{ fontSize: 12.5 }}>
                        Item value <b>{money(r.requested_amount)}</b> — final refund confirmed after we check the item
                      </div>
                    )}
                    {refunded && r.payout_proof && <div className="order__acts"><a className="btn btn--sm" href={r.payout_proof} target="_blank" rel="noreferrer">Refund proof</a></div>}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>
    </TestLayout>
  );
}

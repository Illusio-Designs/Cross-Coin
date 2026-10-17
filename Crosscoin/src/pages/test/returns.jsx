import Head from 'next/head';
import { useState } from 'react';
import { useRouter } from 'next/router';
import TestLayout from '../../components/test/TestLayout';
import { Dropdown, toast } from '../../components/test/ui';

const REASONS = [
  { value: 'damaged', label: 'Arrived damaged' },
  { value: 'defective', label: 'Defective / quality issue' },
  { value: 'wrong', label: 'Wrong item received' },
  { value: 'not_described', label: 'Not as described' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
];
const RESOLUTIONS = [
  { value: 'original', label: 'Refund to original payment' },
  { value: 'upi', label: 'Refund to UPI / bank' },
  { value: 'exchange', label: 'Exchange' },
];

export default function TestReturns() {
  const router = useRouter();
  const [order, setOrder] = useState('');
  const [reason, setReason] = useState('damaged');
  const [note, setNote] = useState('');
  const [resolution, setResolution] = useState('original');
  const [done, setDone] = useState(false);

  const submit = (e) => {
    e.preventDefault();
    if (!order.trim()) { toast('Enter your order number'); return; }
    setDone(true);
    toast('Return request noted (preview) ✓');
  };

  return (
    <TestLayout>
      <Head><title>Returns — CrossCoin Mint preview</title><meta name="robots" content="noindex, nofollow" /></Head>

      <div className="shophead">
        <div className="wrap">
          <div className="crumbs"><span style={{ cursor: 'pointer' }} onClick={() => router.push('/test')}>Home</span> / Returns</div>
          <h2 style={{ fontSize: 'clamp(28px,5vw,46px)', marginTop: 10 }}>Request a return</h2>
          <p className="mono" style={{ color: 'var(--ink-faint)', fontSize: 12.5, marginTop: 8 }}>Returns accepted within 7 days of delivery.</p>
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 560, paddingBottom: 70 }}>
        {done ? (
          <div className="authcard" style={{ textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'Fraunces,serif', fontSize: 22, marginBottom: 8 }}>Request received</h3>
            <p style={{ color: 'var(--ink-soft)', fontSize: 14, lineHeight: 1.6 }}>We&rsquo;ve noted your return for <b>{order}</b>. Our team will confirm pickup and your refund over WhatsApp and email.</p>
            <button className="btn btn--crimson btn--lg" style={{ marginTop: 18 }} onClick={() => router.push('/test/shop')}>Continue shopping</button>
            <p className="authcard__note mono">Preview note — this is a UI demo; no live return is created.</p>
          </div>
        ) : (
          <form className="authcard" onSubmit={submit}>
            <div className="ffield"><label>Order number</label><input value={order} onChange={(e) => setOrder(e.target.value)} placeholder="CC-123456" /></div>
            <div className="ffield"><label>Reason</label><Dropdown value={reason} options={REASONS} onChange={setReason} ariaLabel="Return reason" /></div>
            {(reason === 'damaged' || reason === 'defective' || reason === 'wrong' || reason === 'not_described') && (
              <div className="ffield"><label>Photos</label>
                <input type="file" accept="image/*" multiple className="filefield" />
                <span className="mono" style={{ fontSize: 11, color: 'var(--ink-faint)' }}>Add up to 4 photos so we can process it faster.</span>
              </div>
            )}
            <div className="ffield"><label>Note <span style={{ color: 'var(--ink-faint)' }}>(optional)</span></label><textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Tell us what happened…" /></div>
            <div className="ffield"><label>How would you like it resolved?</label><Dropdown value={resolution} options={RESOLUTIONS} onChange={setResolution} ariaLabel="Resolution" /></div>
            {resolution === 'upi' && <div className="ffield"><label>UPI ID</label><input placeholder="name@upi" /></div>}
            <button className="btn btn--crimson btn--block btn--lg" type="submit" style={{ marginTop: 14 }}>Submit return request</button>
          </form>
        )}
      </div>
    </TestLayout>
  );
}

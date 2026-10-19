'use client';

import { useState } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://api.crosscoin.in';
const BRAND = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'velmique';
const EMPTY = { name: '', email: '', phone: '', subject: '', message: '', grievance: false };

/* Contact form → POST /api/leads/contact (lands in the dashboard's Leads,
   brand-scoped by X-Brand-Name). Ticking "privacy request" files it as a DPDP
   grievance for the Grievance Officer. */
export default function ContactForm() {
  const [form, setForm] = useState(EMPTY);
  const [state, setState] = useState({ busy: false, sent: false, error: '' });
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: k === 'grievance' ? e.target.checked : e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) { setState({ busy: false, sent: false, error: 'Please add your name and a message.' }); return; }
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) { setState({ busy: false, sent: false, error: 'Please enter a valid email so we can reply.' }); return; }
    setState({ busy: true, sent: false, error: '' });
    try {
      const res = await fetch(`${API_URL}/api/leads/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Brand-Name': BRAND },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          message: form.subject.trim() ? `${form.subject.trim()}\n\n${form.message.trim()}` : form.message.trim(),
          type: form.grievance ? 'grievance' : 'general',
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.success === false) throw new Error(d.message || 'Something went wrong. Please try again.');
      setForm(EMPTY);
      setState({ busy: false, sent: true, error: '' });
    } catch (err) {
      setState({ busy: false, sent: false, error: err.message?.includes('fetch') ? 'We couldn’t send that — please check your connection, or write to us on WhatsApp.' : err.message });
    }
  };

  if (state.sent) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }} role="status">
        <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--m-accent)" strokeWidth="1.5" style={{ margin: '0 auto' }} aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M8 12l3 3 5-5" /></svg>
        <h2 style={{ fontSize: 30, margin: '16px 0 10px' }}>Message Sent</h2>
        <p style={{ color: 'var(--m-ink-soft)', marginBottom: 20 }}>Thank you for reaching out. We&rsquo;ll reply within 24 hours.</p>
        <button type="button" className="m-btn m-btn--ghost" onClick={() => setState({ busy: false, sent: false, error: '' })}>Send another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <span className="m-eyebrow">Send a message</span>
      <div className="m-grid2" style={{ marginTop: 16 }}>
        <div className="m-field"><label className="m-label" htmlFor="c-name">Name</label><input id="c-name" className="m-input" value={form.name} onChange={set('name')} autoComplete="name" required /></div>
        <div className="m-field"><label className="m-label" htmlFor="c-email">Email</label><input id="c-email" className="m-input" type="email" value={form.email} onChange={set('email')} autoComplete="email" required /></div>
      </div>
      <div className="m-grid2">
        <div className="m-field"><label className="m-label" htmlFor="c-phone">Phone (optional)</label><input id="c-phone" className="m-input" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></div>
        <div className="m-field"><label className="m-label" htmlFor="c-subject">Subject</label><input id="c-subject" className="m-input" value={form.subject} onChange={set('subject')} /></div>
      </div>
      <div className="m-field"><label className="m-label" htmlFor="c-msg">Message</label><textarea id="c-msg" className="m-textarea" value={form.message} onChange={set('message')} required /></div>
      <label className="m-check"><input type="checkbox" checked={form.grievance} onChange={set('grievance')} /> This is a privacy request or grievance (DPDP Act)</label>
      {state.error ? <p className="m-formerr" role="alert">{state.error}</p> : null}
      <button type="submit" className="m-btn m-btn--fill m-btn--block" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send message'}</button>
    </form>
  );
}

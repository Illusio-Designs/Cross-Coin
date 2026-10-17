'use client';

import { useState } from 'react';

const INFO = [
  { label: 'Email', value: 'obzusindia@gmail.com', href: 'mailto:obzusindia@gmail.com' },
  { label: 'Phone / WhatsApp', value: '+91 97128 91700', href: 'tel:+919712891700' },
  { label: 'Address', value: 'Obzus India Pvt. Ltd., Royal Plaza, Panchasar Road, Morbi — 363641, Gujarat, India', href: 'https://maps.google.com/?q=Royal+Plaza+Panchasar+Road+Morbi+363641' },
];

export default function MaisonContact() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  return (
    <>
      <section className="m-wrap m-ph">
        <span className="m-eyebrow">Get in touch</span>
        <h1>A Word with Velmique.</h1>
        <p>Stocking our fragrances, a gifting commission, or simply curious about a note — our concierge replies within 24 hours, Monday to Saturday.</p>
      </section>

      <div className="m-wrap m-section" style={{ paddingTop: 0 }}>
        <div className="m-contact">
          <div>
            <span className="m-eyebrow">Reach us</span>
            <div className="m-infocard">
              {INFO.map((i) => (
                <div className="m-inforow" key={i.label}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 6h16v12H4zM4 7l8 6 8-6"/></svg>
                  <div><small>{i.label}</small><a href={i.href} target={i.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" style={{ color: 'var(--m-ink)' }}>{i.value}</a></div>
                </div>
              ))}
            </div>
            <div className="m-infocard">
              <small style={{ display: 'block', fontSize: 10, letterSpacing: '.24em', textTransform: 'uppercase', color: 'var(--m-ink-faint)', marginBottom: 10 }}>Hours</small>
              <div className="m-sumrow" style={{ padding: '5px 0' }}><span>Mon – Fri</span><span>9:00 AM – 6:00 PM IST</span></div>
              <div className="m-sumrow" style={{ padding: '5px 0' }}><span>Saturday</span><span>10:00 AM – 4:00 PM IST</span></div>
              <div className="m-sumrow" style={{ padding: '5px 0' }}><span>Sunday</span><span>Closed</span></div>
            </div>
          </div>

          <div className="m-formcard">
            {sent ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="var(--m-accent)" strokeWidth="1.5" style={{ margin: '0 auto' }}><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-5"/></svg>
                <h2 style={{ fontSize: 30, margin: '16px 0 10px' }}>Message Sent</h2>
                <p style={{ color: 'var(--m-ink-soft)', marginBottom: 20 }}>Thank you for reaching out. We&rsquo;ll reply within 24 hours.</p>
                <button className="m-btn m-btn--ghost" onClick={() => setSent(false)}>Send another</button>
              </div>
            ) : (
              <form onSubmit={(e) => { e.preventDefault(); setSent(true); }}>
                <span className="m-eyebrow">Send a message</span>
                <div className="m-grid2" style={{ marginTop: 16 }}>
                  <div className="m-field"><label className="m-label">Name</label><input className="m-input" value={form.name} onChange={set('name')} required /></div>
                  <div className="m-field"><label className="m-label">Email</label><input className="m-input" type="email" value={form.email} onChange={set('email')} required /></div>
                </div>
                <div className="m-field"><label className="m-label">Subject</label><input className="m-input" value={form.subject} onChange={set('subject')} /></div>
                <div className="m-field"><label className="m-label">Message</label><textarea className="m-textarea" value={form.message} onChange={set('message')} required /></div>
                <button type="submit" className="m-btn m-btn--fill" style={{ width: '100%', justifyContent: 'center' }}>Send message</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

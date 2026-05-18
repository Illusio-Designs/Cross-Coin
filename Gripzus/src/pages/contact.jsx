import { useState } from 'react';
import Head from 'next/head';
import PageHero from '../components/common/PageHero';
import { toastMessageSent } from '../utils/toast';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const onSubmit = (e) => { e.preventDefault(); setSent(true); toastMessageSent(); };

  return (
    <>
      <Head><title>Contact — Gripzus</title></Head>
      <main className="bg-paper">
        <PageHero
          chapter="07"
          eyebrow="Say hello"
          title="Get in"
          accent="touch."
          intro="We read every message ourselves and reply within one business day. Pick the fastest channel, or write below."
        />

        <div className="max-w-site mx-auto px-6 md:px-12 lg:px-20 py-12 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

          {/* Channels */}
          <aside className="lg:col-span-5">
            <div className="border-t border-line">
              {[
                { n: '01', eyebrow: 'Email',    title: 'support@gripzus.com', note: 'Orders, returns, partnerships.', href: 'mailto:support@gripzus.com' },
                { n: '02', eyebrow: 'Phone',    title: '+91 99999 99999',      note: 'Mon–Sat, 10am–7pm IST.',        href: 'tel:+919999999999' },
                { n: '03', eyebrow: 'WhatsApp', title: 'Chat with us',          note: 'Fastest for size + order help.', href: 'https://wa.me/919999999999' },
                { n: '04', eyebrow: 'Atelier',  title: 'Ahmedabad, Gujarat',    note: 'Visits by appointment only.',    href: 'https://maps.google.com' },
              ].map((c) => (
                <a key={c.n} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="group flex gap-5 py-6 border-b border-line">
                  <span className="eyebrow text-clay shrink-0">{c.n}</span>
                  <div>
                    <p className="eyebrow mb-1.5">{c.eyebrow}</p>
                    <p className="font-display uppercase text-ink text-xl md:text-2xl leading-none tracking-[-0.02em] mb-1.5 group-hover:text-clay-deep transition-colors" style={{ fontWeight: 700 }}>
                      {c.title}
                    </p>
                    <p className="prose-body text-sm">{c.note}</p>
                  </div>
                </a>
              ))}
            </div>
          </aside>

          {/* Form */}
          <div className="lg:col-span-7">
            <div className="border border-ink p-7 md:p-10">
              <p className="eyebrow mb-3">Send a note</p>
              <h2 className="h-display text-3xl md:text-4xl uppercase mb-8">Drop us a <em className="h-italic">message.</em></h2>

              {sent ? (
                <div className="text-center py-14">
                  <div className="w-14 h-14 bg-ink text-paper flex items-center justify-center mx-auto mb-5">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="h-display text-2xl uppercase mb-2">Note received</p>
                  <p className="prose-body text-sm">We&apos;ll reply within one business day.</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Name *"    value={form.name}    onChange={(v) => setForm({ ...form, name: v })} />
                  <Field label="Email *"   value={form.email}   onChange={(v) => setForm({ ...form, email: v })} type="email" />
                  <Field label="Subject"   value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} className="md:col-span-2" />
                  <Field label="Message *" value={form.message} onChange={(v) => setForm({ ...form, message: v })} className="md:col-span-2" textarea />
                  <button type="submit" className="cta w-full justify-center !py-4 md:col-span-2">Send message</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}

function Field({ label, value, onChange, type = 'text', textarea = false, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="eyebrow">{label}</label>
      {textarea ? (
        <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)}
          className="bg-paper border border-line focus:border-ink outline-none px-4 py-3 text-sm text-ink resize-none transition-colors" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="bg-paper border border-line focus:border-ink outline-none px-4 py-3 text-sm text-ink transition-colors" />
      )}
    </div>
  );
}

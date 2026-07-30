import { useState } from 'react';
import PageHero from '../components/common/PageHero';
import SeoWrapper from '../components/SeoWrapper';
import { toastMessageSent } from '../utils/toast';

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const onSubmit = (e) => { e.preventDefault(); setSent(true); toastMessageSent(); };

  return (
    <SeoWrapper pageName="contact">
      <main className="bg-paper">
        <PageHero
          chapter="07"
          eyebrow="Say hello"
          title="Get in"
          accent="touch."
          intro="We read every message ourselves and reply within one business day. Pick the fastest channel, or write below."
        />

        <div className="max-w-site mx-auto px-5 md:px-10 lg:px-16 py-14 md:py-20 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">

          {/* Channels */}
          <aside className="lg:col-span-5">
            <span className="kicker mb-6">Direct lines</span>
            <div className="border-t-2 border-ink mt-6">
              {[
                { n: '01', eyebrow: 'Email',    title: 'support@gripzus.com', note: 'Orders, returns, partnerships.', href: 'mailto:support@gripzus.com' },
                { n: '02', eyebrow: 'Phone',    title: '+91 97128 91700',      note: 'Mon–Sat, 10am–7pm IST.',        href: 'tel:+919712891700' },
                { n: '03', eyebrow: 'WhatsApp', title: 'Chat with us',          note: 'Fastest for size + order help.', href: 'https://wa.me/919712891700' },
                { n: '04', eyebrow: 'Address',  title: 'Morbi, Gujarat',    note: 'Royal Plaza, Panchasar Road, Morbi - 363641. By appointment only.',    href: 'https://maps.google.com/?q=Royal+Plaza+Panchasar+Road+Morbi+363641' },
              ].map((c) => (
                <a key={c.n} href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="group flex gap-5 py-6 border-b border-line">
                  <span className="num-index text-2xl shrink-0 pt-1">{c.n}</span>
                  <div>
                    <p className="eyebrow mb-1.5">{c.eyebrow}</p>
                    <p className="font-display uppercase text-ink text-xl md:text-2xl leading-none tracking-[-0.02em] mb-1.5 group-hover:translate-x-1 transition-transform" style={{ fontWeight: 800 }}>
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
            <div className="border-2 border-ink p-7 md:p-10">
              <span className="kicker mb-4">Send a note</span>
              <h2 className="h-mark text-ink text-3xl md:text-5xl mb-8 mt-2">DROP US A MESSAGE.</h2>

              {sent ? (
                <div className="text-center py-14">
                  <div className="w-16 h-16 bg-ink text-paper flex items-center justify-center mx-auto mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  </div>
                  <p className="h-mark text-2xl md:text-3xl text-ink mb-2">NOTE RECEIVED</p>
                  <p className="prose-body text-sm">We&apos;ll reply within one business day.</p>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label="Name *"    value={form.name}    onChange={(v) => setForm({ ...form, name: v })} />
                  <Field label="Email *"   value={form.email}   onChange={(v) => setForm({ ...form, email: v })} type="email" />
                  <Field label="Subject"   value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} className="md:col-span-2" />
                  <Field label="Message *" value={form.message} onChange={(v) => setForm({ ...form, message: v })} className="md:col-span-2" textarea />
                  <button type="submit" className="btn w-full justify-center !py-4 md:col-span-2">Send message</button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
    </SeoWrapper>
  );
}

function Field({ label, value, onChange, type = 'text', textarea = false, className = '' }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="eyebrow">{label}</label>
      {textarea ? (
        <textarea rows={5} value={value} onChange={(e) => onChange(e.target.value)}
          className="field resize-none" />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
          className="field" />
      )}
    </div>
  );
}

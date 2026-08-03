import { useState } from 'react';
import PageHero from '../components/common/PageHero';
import SeoWrapper from '../components/SeoWrapper';
import { toastMessageSent } from '../utils/toast';

/* Contact — minimal edition. A quiet channel list on the left and a flat,
   underline-only form on the right — no boxed card, no colour, just type and
   hairlines on the brand's stark white. */

const CHANNELS = [
  { eyebrow: 'Email',    title: 'support@gripzus.com', note: 'Orders, returns, partnerships.',              href: 'mailto:support@gripzus.com' },
  { eyebrow: 'Phone',    title: '+91 97128 91700',      note: 'Mon–Sat, 10am–7pm IST.',                       href: 'tel:+919712891700' },
  { eyebrow: 'WhatsApp', title: 'Chat with us',          note: 'Fastest for size + order help.',              href: 'https://wa.me/919712891700' },
  { eyebrow: 'Studio',   title: 'Morbi, Gujarat',        note: 'Royal Plaza, Panchasar Road — by appointment.', href: 'https://maps.google.com/?q=Royal+Plaza+Panchasar+Road+Morbi+363641' },
];

export default function ContactPage() {
  const [sent, setSent] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const onSubmit = (e) => { e.preventDefault(); setSent(true); toastMessageSent(); };

  return (
    <SeoWrapper pageName="contact">
      <main className="bg-paper">
        <PageHero
          eyebrow="Say hello"
          title="Get in"
          accent="touch."
          intro="We read every message ourselves and reply within one business day. Pick the fastest channel, or write below."
        />

        <div className="wrap section-y grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-20">

          {/* Channels — quiet hairline list */}
          <aside className="lg:col-span-4">
            <p className="eyebrow text-ink-muted mb-6">Reach us</p>
            <div>
              {CHANNELS.map((c, i) => (
                <a
                  key={c.eyebrow}
                  href={c.href}
                  target={c.href.startsWith('http') ? '_blank' : undefined}
                  rel="noopener noreferrer"
                  className={`group block py-5 ${i > 0 ? 'border-t border-line' : ''}`}
                >
                  <p className="eyebrow text-ink-muted mb-2">{c.eyebrow}</p>
                  <p className="h-display text-ink text-lg md:text-xl transition-opacity group-hover:opacity-55">{c.title}</p>
                  <p className="prose-body text-sm mt-1.5">{c.note}</p>
                </a>
              ))}
            </div>
          </aside>

          {/* Form — flat, underline-only fields */}
          <div className="lg:col-span-8 lg:pl-10">
            <p className="eyebrow text-ink-muted mb-8">Send a note</p>

            {sent ? (
              <div className="py-16">
                <p className="h-display text-ink text-2xl md:text-3xl mb-3">Note received.</p>
                <p className="prose-body text-base">We&apos;ll reply within one business day.</p>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">
                <Field label="Name"    value={form.name}    onChange={(v) => setForm({ ...form, name: v })} />
                <Field label="Email"   value={form.email}   onChange={(v) => setForm({ ...form, email: v })} type="email" />
                <Field label="Subject" value={form.subject} onChange={(v) => setForm({ ...form, subject: v })} className="md:col-span-2" />
                <Field label="Message" value={form.message} onChange={(v) => setForm({ ...form, message: v })} className="md:col-span-2" textarea />
                <div className="md:col-span-2 pt-2">
                  <button type="submit" className="btn">Send message</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </main>
    </SeoWrapper>
  );
}

function Field({ label, value, onChange, type = 'text', textarea = false, className = '' }) {
  const base =
    'w-full bg-transparent border-0 border-b border-line focus:border-ink outline-none py-2.5 text-sm text-ink transition-colors';
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label className="eyebrow text-ink-muted">{label}</label>
      {textarea ? (
        <textarea rows={4} value={value} onChange={(e) => onChange(e.target.value)} className={`${base} resize-none`} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className={base} />
      )}
    </div>
  );
}

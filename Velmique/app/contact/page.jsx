'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle, ArrowUpRight } from 'lucide-react';
import PageHeader from '@/components/layout/PageHeader';
import SeoWrapper from '@/components/SeoWrapper';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <SeoWrapper pageName="contact">
    <div className="bg-[var(--bg)] min-h-screen">
      <PageHeader
        eyebrow="Get in Touch"
        title="A WORD WITH"
        accent="VELMIQUE"
        intro="Stocking our extraits at your boutique, planning a wedding gifting commission, or simply curious about a note — our Mumbai concierge replies within 24 hours, Monday to Saturday."
      />

      <div className="max-w-[1600px] mx-auto px-6 md:px-12 lg:px-20 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12">
          {/* Info */}
          <div className="md:col-span-5">
            <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-4">Reach Us</p>
            <div className="space-y-6">
              {[
                { icon: Mail, label: 'Email', value: 'obzusindia@gmail.com', href: 'mailto:obzusindia@gmail.com' },
                { icon: Phone, label: 'Phone / WhatsApp', value: '+91 97128 91700', href: 'tel:+919712891700' },
                { icon: MapPin, label: 'Address', value: 'Obzus India Private Limited, Survey No. 1288, Vajepar, Third Floor, Royal Plaza, Opp. New Chandresh Society, Panchasar Road, Morbi - 363641, Gujarat (India)', href: 'https://maps.google.com/?q=Royal+Plaza+Panchasar+Road+Morbi+363641' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-11 h-11 rounded-full bg-[var(--surface-2)] flex items-center justify-center flex-shrink-0">
                    <item.icon size={16} className="text-[var(--gold-deep)]" />
                  </div>
                  <div>
                    <p className="text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1">{item.label}</p>
                    <a href={item.href} className="text-[var(--ink)] font-body text-base hover:text-[var(--gold-deep)] transition-colors">
                      {item.value}
                    </a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12 bg-[var(--surface-2)] rounded-2xl p-7">
              <h3 className="font-display text-[var(--ink)] text-xl uppercase mb-4">Hours</h3>
              <div className="space-y-2 text-sm font-body text-[var(--ink-soft)]">
                <div className="flex justify-between"><span>Monday – Friday</span><span>9:00 AM – 6:00 PM IST</span></div>
                <div className="flex justify-between"><span>Saturday</span><span>10:00 AM – 4:00 PM IST</span></div>
                <div className="flex justify-between"><span>Sunday</span><span className="text-[var(--ink-muted)]">Closed</span></div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="md:col-span-7">
            <div className="bg-white border border-[var(--border)] rounded-2xl p-7 md:p-10">
              {sent ? (
                <div className="flex flex-col items-center justify-center text-center gap-4 py-16">
                  <CheckCircle size={48} className="text-[var(--gold-deep)]" />
                  <h2 className="font-display text-[var(--ink)] text-3xl uppercase">Message Sent</h2>
                  <p className="text-[var(--ink-soft)] text-sm font-body max-w-xs">
                    Thank you for reaching out. We'll get back to you within 24 hours.
                  </p>
                  <button onClick={() => setSent(false)} className="pill-cta pill-cta-light mt-2">
                    Send Another <ArrowUpRight size={14} strokeWidth={1.6} />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <p className="text-[var(--gold-deep)] text-[10px] tracking-[0.45em] uppercase font-body mb-2">Send a Message</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Name</label>
                      <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                        className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                    <div>
                      <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Email</label>
                      <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                        className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Subject</label>
                    <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                      className="w-full input-gold px-4 py-3 text-sm font-body rounded-md" />
                  </div>
                  <div>
                    <label className="block text-[10px] tracking-[0.3em] uppercase text-[var(--ink-muted)] font-body mb-1.5">Message</label>
                    <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required rows={6}
                      className="w-full input-gold px-4 py-3 text-sm font-body rounded-md resize-none" />
                  </div>
                  <button type="submit" className="pill-cta w-full justify-center !py-4">
                    Send Message <Send size={13} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
    </SeoWrapper>
  );
}

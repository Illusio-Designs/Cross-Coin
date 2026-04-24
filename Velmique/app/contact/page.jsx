'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin, Send, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="pt-8 min-h-screen">
      <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 py-10">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[#d4927f]/60 text-xs tracking-[0.3em] uppercase font-body mb-3">Get in Touch</p>
          <h1 className="font-serif text-5xl text-[#f3ede0]">Contact Us</h1>
          <div className="gold-divider w-24 mx-auto mt-4" />
          <p className="text-[#f3ede0]/40 text-sm font-body mt-4 max-w-md mx-auto">
            We'd love to hear from you. Our team typically responds within 24 hours.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* Info */}
          <div>
            <h2 className="font-serif text-2xl text-[#f3ede0] mb-8">Reach Us</h2>
            <div className="space-y-6">
              {[
                { icon: Mail, label: 'Email', value: 'hello@velmique.com', href: 'mailto:hello@velmique.com' },
                { icon: Phone, label: 'Phone', value: '+91 98765 43210', href: 'tel:+919876543210' },
                { icon: MapPin, label: 'Studio', value: '12 Rue du Faubourg, Paris, France', href: '#' },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-sm bg-[#b8624f]/10 border border-[#b8624f]/20 flex items-center justify-center flex-shrink-0">
                    <item.icon size={16} className="text-[#d4927f]" />
                  </div>
                  <div>
                    <p className="text-xs tracking-[0.15em] uppercase text-[#f3ede0]/40 font-body mb-0.5">{item.label}</p>
                    <a href={item.href} className="text-[#f3ede0]/80 font-body text-sm hover:text-[#d4927f] transition-colors">{item.value}</a>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-12">
              <h3 className="font-serif text-xl text-[#f3ede0] mb-4">Hours</h3>
              <div className="space-y-2 text-sm font-body text-[#f3ede0]/50">
                <div className="flex justify-between">
                  <span>Monday – Friday</span>
                  <span>9:00 AM – 6:00 PM IST</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span>10:00 AM – 4:00 PM IST</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-[#f3ede0]/30">Closed</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
            {sent ? (
              <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-16">
                <CheckCircle size={48} className="text-[#d4927f]" />
                <h2 className="font-serif text-2xl text-[#f3ede0]">Message Sent</h2>
                <p className="text-[#f3ede0]/50 text-sm font-body max-w-xs">Thank you for reaching out. We'll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="btn-outline-gold px-6 py-3 text-xs tracking-wider uppercase font-body mt-2 rounded-sm">
                  Send Another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">Name</label>
                    <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required
                      className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                  <div>
                    <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} required
                      className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">Subject</label>
                  <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                    className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm" />
                </div>
                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-[#f3ede0]/50 font-body mb-1.5">Message</label>
                  <textarea value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} required rows={6}
                    className="w-full input-gold px-4 py-3 text-sm font-body rounded-sm resize-none" />
                </div>
                <button type="submit"
                  className="btn-gold w-full py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm">
                  <Send size={13} /> Send Message
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

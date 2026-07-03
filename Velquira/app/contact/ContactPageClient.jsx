'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Instagram, Facebook, ChevronDown, CheckCircle } from 'lucide-react'
import { PageHero } from '@/components/layout/PageHero'
import { Reveal } from '@/components/ui/Reveal'

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  )
}

const FAQS = [
  { q: 'How long does a Velquira piece take to make?',  a: 'Each piece is bench-finished to order in 5–7 business days. Bespoke commissions take 3–4 weeks. We will keep you updated at every step.' },
  { q: 'What is your return policy?',                    a: 'We accept returns within 14 days of delivery on unworn pieces in their original packaging. Bespoke and engraved pieces are final sale.' },
  { q: 'Are your stones certified?',                     a: 'Yes — every diamond and major gemstone arrives with a certificate from a recognised gemological laboratory and is fully traceable.' },
  { q: 'How should I care for my Velquira jewellery?',   a: 'Store in the velvet pouch provided, avoid contact with perfumes and lotions, and bring it in for complimentary cleaning whenever you wish.' },
  { q: 'Do you offer ring resizing or bespoke design?',  a: 'Complimentary resizing within the first year, and bespoke commissions on request. Reach us by email and we will respond within 24 hours.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gold/15 last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 py-5 text-left" aria-expanded={open}>
        <span className="font-display text-base text-brand-black">{q}</span>
        <ChevronDown size={15} className={`shrink-0 text-gold transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-[1.85] text-brand-black/70">{a}</p>
      )}
    </div>
  )
}

export function ContactPageClient() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSending(true)
    await new Promise((r) => setTimeout(r, 900))
    setSent(true)
    setSending(false)
  }

  return (
    <>
      <PageHero
        variant="split"
        align="left"
        eyebrow="In Conversation"
        title="Contact the"
        titleAccent="Atelier"
        description="For commissions, care queries, or simply to say hello — our clients are always welcome."
      />

      <section className="bg-ivory vq-lattice">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-12 px-4 pb-20 sm:px-6 md:px-10 lg:grid-cols-2 lg:gap-16 lg:pb-24">

          {/* LEFT */}
          <Reveal>
            <div className="flex flex-col gap-8">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-gold">Reach Us</p>
                <h2 className="mt-3 font-display text-2xl text-brand-black md:text-3xl">By appointment or post</h2>
                <div className="mt-5 h-px w-12 bg-gold/60" />
                <p className="mt-6 text-sm leading-[1.85] text-brand-black/70">
                  Our concierge is available Monday to Saturday, 10am – 7pm IST.
                  Most enquiries are answered within 24 hours.
                </p>
              </div>

              {/* Contact lines */}
              <div className="flex flex-col">
                {[
                  { icon: <Mail size={14} />, label: 'Email', value: 'concierge@velquira.com', href: 'mailto:concierge@velquira.com' },
                  { icon: <Phone size={14} />, label: 'Telephone', value: '+91 99999 99999', href: 'tel:+919999999999' },
                  { icon: <MapPin size={14} />, label: 'Atelier', value: 'Mumbai, Maharashtra, India', href: null },
                ].map((row) => {
                  const Inner = (
                    <div className="flex items-start gap-5 border-b border-gold/15 py-5 transition-colors last:border-0 group-hover:border-gold/40">
                      <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center border border-gold/40 text-gold transition-colors group-hover:bg-gold group-hover:text-white">
                        {row.icon}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-gold">{row.label}</p>
                        <p className="mt-1.5 font-display text-base text-brand-black">{row.value}</p>
                      </div>
                    </div>
                  )
                  return row.href ? (
                    <a key={row.label} href={row.href} className="group">{Inner}</a>
                  ) : (
                    <div key={row.label} className="group">{Inner}</div>
                  )
                })}
              </div>

              {/* Social */}
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-gold">Follow the Journal</p>
                <div className="mt-4 flex items-center gap-3">
                  {[
                    { Icon: Instagram, href: 'https://instagram.com/velquira', label: 'Instagram' },
                    { Icon: Facebook, href: 'https://facebook.com/velquira', label: 'Facebook' },
                    { Icon: WhatsAppIcon, href: 'https://wa.me/919999999999', label: 'WhatsApp' },
                  ].map(({ Icon, href, label }) => (
                    <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label}
                      className="flex h-10 w-10 items-center justify-center border border-gold/40 text-gold transition-all hover:bg-gold hover:text-white hover:border-gold">
                      <Icon size={15} />
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* RIGHT — form (underline-only inputs) */}
          <Reveal delay={0.12}>
            <div className="relative border border-gold/20 bg-white p-8 sm:p-10">
              {/* Gold corner ornaments */}
              <span aria-hidden className="absolute -left-px -top-px h-3 w-3 border-l border-t border-gold/70" />
              <span aria-hidden className="absolute -right-px -top-px h-3 w-3 border-r border-t border-gold/70" />
              <span aria-hidden className="absolute -left-px -bottom-px h-3 w-3 border-l border-b border-gold/70" />
              <span aria-hidden className="absolute -right-px -bottom-px h-3 w-3 border-r border-b border-gold/70" />

              {sent ? (
                <div className="flex h-full flex-col items-center justify-center gap-5 py-10 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-gold text-gold">
                    <CheckCircle size={24} strokeWidth={1.4} />
                  </div>
                  <p className="font-display text-2xl text-brand-black">Thank you</p>
                  <p className="text-sm leading-relaxed text-brand-black/70">Your message has been delivered to our atelier. We will reply within 24 hours.</p>
                  <button onClick={() => setSent(false)} className="mt-2 text-[11px] font-medium uppercase tracking-[0.28em] text-gold underline-offset-4 hover:text-gold-deep">
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-7">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-gold">Write to Us</p>
                    <p className="mt-2 font-display text-2xl text-brand-black">A note to our atelier</p>
                    <div className="mt-4 h-px w-12 bg-gold/60" />
                  </div>

                  {[
                    { label: 'Your Name',     key: 'name',  type: 'text',  placeholder: 'Priya Sharma' },
                    { label: 'Email Address', key: 'email', type: 'email', placeholder: 'priya@email.com' },
                  ].map(({ label, key, type, placeholder }) => (
                    <div key={key} className="flex flex-col gap-2">
                      <label className="text-[10px] font-medium uppercase tracking-[0.28em] text-gold">{label}</label>
                      <input
                        required
                        type={type}
                        value={form[key]}
                        onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                        placeholder={placeholder}
                        className="border-0 border-b border-gold/30 bg-transparent pb-2.5 font-display text-base text-brand-black placeholder:text-brand-black/30 outline-none transition-colors focus:border-gold focus:ring-0"
                      />
                    </div>
                  ))}

                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-medium uppercase tracking-[0.28em] text-gold">Message</label>
                    <textarea
                      required
                      rows={4}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="How may we be of service?"
                      className="resize-none border-0 border-b border-gold/30 bg-transparent pb-2.5 text-[15px] leading-relaxed text-brand-black placeholder:text-brand-black/30 outline-none transition-colors focus:border-gold focus:ring-0"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="vq-lift mt-3 inline-flex items-center justify-center gap-3 bg-brand-black px-8 py-4 font-display text-sm text-gold transition-colors hover:bg-gold hover:text-white disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send Message'}
                    <span className="h-px w-6 bg-gold transition-all" aria-hidden />
                  </button>
                </form>
              )}
            </div>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-cream">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:px-10 lg:py-24">
          <Reveal>
            <div className="mb-10 text-center">
              <p className="text-[11px] font-medium uppercase tracking-[0.32em] text-gold">Frequently Asked</p>
              <h2 className="mt-3 font-display text-3xl font-normal text-brand-black md:text-4xl">Matters of Craft</h2>
              <div className="mx-auto mt-5 h-px w-20 bg-gold/60 vq-rule" />
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="border border-gold/20 bg-white px-6 py-2 sm:px-8">
              {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </div>
          </Reveal>
        </div>
      </section>
    </>
  )
}
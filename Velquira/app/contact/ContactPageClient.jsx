'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Clock, Instagram, Facebook, ChevronDown, CheckCircle } from 'lucide-react'
import { PageHero } from '@/components/layout/PageHero'

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  )
}

/* Contact details — hairline list, no boxes. */
const DETAILS = [
  { icon: Mail,   label: 'Email',           value: 'hello@velquira.in',      href: 'mailto:hello@velquira.in' },
  { icon: Phone,  label: 'Phone / WhatsApp', value: '+91 97128 91700',            href: 'tel:+919712891700' },
  { icon: MapPin, label: 'Address',          value: 'Royal Plaza, Panchasar Road, Morbi 363641, Gujarat', href: 'https://maps.google.com/?q=Royal+Plaza+Panchasar+Road+Morbi+363641' },
  { icon: Clock,  label: 'Hours',            value: 'By appointment · Mon–Sat',   href: null },
]

const FAQS = [
  { q: 'How long does an order take?',              a: 'Everything is made by hand, so most orders take 5–7 working days. Custom orders take 3–4 weeks. We keep you updated at every step.' },
  { q: 'What is your return policy?',               a: 'You can return unworn items in their original packaging within 14 days of delivery. Custom and engraved orders are final sale.' },
  { q: 'Are your diamonds certified?',              a: 'Yes. Every diamond and major stone comes with a certificate from a recognised lab, and you can check it yourself.' },
  { q: 'How do I care for my jewellery?',           a: 'Keep it in the pouch we send, away from perfume and lotion. Bring it back to the studio any time for a free clean.' },
  { q: 'Do you offer resizing or custom design?',   a: 'Yes. Resizing is free in the first year, and we take custom orders. Email us and we reply within 24 hours.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-line last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-6 py-6 text-left"
        aria-expanded={open}
      >
        <span className="vq-display text-[1.15rem] leading-snug text-ink md:text-[1.3rem]">{q}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gold transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <p className="max-w-2xl pb-7 text-[15px] leading-[1.9] text-text-muted">{a}</p>
      )}
    </div>
  )
}

const FIELD_CLASS =
  'w-full rounded-xl border border-line bg-cream px-5 py-4 text-[15px] text-ink outline-none transition-colors duration-300 placeholder:text-text-faint focus:border-ink focus:ring-0'

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
        eyebrow="Get in Touch"
        title="Contact"
        titleAccent="Us"
        description="For custom orders, care questions, or just to say hello — you are always welcome."
      />

      {/* Details + form */}
      <section className="bg-cream pb-24 pt-16 md:pb-32 md:pt-20">
        <div className="vq-container">
          <div className="grid grid-cols-1 gap-16 lg:grid-cols-12 lg:gap-24">

            {/* LEFT — contact details */}
            <div className="lg:col-span-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Reach Us</p>
              <h2 className="vq-display mt-4 text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.1] tracking-[-0.02em] text-ink">
                Talk to the studio <span className="text-gold">✦</span>
              </h2>
              <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />

              <p className="mt-7 max-w-md text-[15px] leading-[1.9] text-text-muted">
                We are here Monday to Saturday, 10am to 7pm. Most messages get a reply within
                24 hours.
              </p>

              <div className="mt-10">
                {DETAILS.map(({ icon: Icon, label, value, href }) => {
                  const inner = (
                    <div className="flex items-start gap-5 border-b border-line py-6">
                      <Icon
                        size={16}
                        strokeWidth={1.6}
                        className="mt-1 shrink-0 text-gold transition-transform duration-300 group-hover:-translate-y-0.5"
                      />
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">
                          {label}
                        </p>
                        <p className="vq-display mt-2 text-[1.15rem] leading-snug text-ink transition-colors duration-300 group-hover:text-gold">
                          {value}
                        </p>
                      </div>
                    </div>
                  )
                  return href ? (
                    <a key={label} href={href} className="group block">{inner}</a>
                  ) : (
                    <div key={label} className="group block">{inner}</div>
                  )
                })}
              </div>

              {/* Social */}
              <div className="mt-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-gold">Follow Us</p>
                <div className="mt-5 flex items-center gap-3">
                  {[
                    { Icon: Instagram, href: 'https://instagram.com/velquira', label: 'Instagram' },
                    { Icon: Facebook, href: 'https://facebook.com/velquira', label: 'Facebook' },
                    { Icon: WhatsAppIcon, href: 'https://wa.me/919712891700', label: 'WhatsApp' },
                  ].map(({ Icon, href, label }) => (
                    <a
                      key={label}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={label}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-line text-text-muted transition-all duration-300 hover:-translate-y-0.5 hover:border-ink hover:text-ink"
                    >
                      <Icon size={16} />
                    </a>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — form (toast-only, no API) */}
            <div className="lg:col-span-7">
              {sent ? (
                <div className="flex flex-col items-start gap-5 py-6">
                  <CheckCircle size={30} strokeWidth={1.3} className="text-gold" />
                  <p className="vq-display text-[clamp(1.8rem,3.4vw,2.6rem)] leading-tight text-ink">
                    Thank you
                  </p>
                  <p className="max-w-md text-[15px] leading-[1.9] text-text-muted">
                    Your message is on its way to our studio. We will get back to you within
                    24 hours.
                  </p>
                  <button
                    onClick={() => setSent(false)}
                    className="mt-2 text-[10px] font-semibold uppercase tracking-[0.26em] text-text-muted underline-offset-8 transition-colors hover:text-ink hover:underline"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-8">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Write to Us</p>
                    <h2 className="vq-display mt-4 text-[clamp(1.9rem,3.6vw,2.7rem)] leading-[1.1] tracking-[-0.02em] text-ink">
                      Send a message <span className="text-gold">✦</span>
                    </h2>
                    <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
                  </div>

                  <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
                    {[
                      { label: 'Your Name',     key: 'name',  type: 'text',  placeholder: 'Priya Sharma' },
                      { label: 'Email Address', key: 'email', type: 'email', placeholder: 'priya@email.com' },
                    ].map(({ label, key, type, placeholder }) => (
                      <div key={key} className="flex flex-col gap-3">
                        <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                          {label}
                        </label>
                        <input
                          required
                          type={type}
                          value={form[key]}
                          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                          placeholder={placeholder}
                          className={FIELD_CLASS}
                        />
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.28em] text-gold">
                      Message
                    </label>
                    <textarea
                      required
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Tell us what you are looking for…"
                      className={`${FIELD_CLASS} resize-none leading-relaxed`}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="w-full rounded-full bg-[#1e1912] px-8 py-4 text-[10px] font-semibold uppercase tracking-[0.26em] text-cream transition-all duration-300 hover:-translate-y-0.5 hover:bg-black disabled:pointer-events-none disabled:opacity-50"
                  >
                    {sending ? 'Sending…' : 'Send Message'}
                  </button>
                </form>
              )}
            </div>

          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="vq-section bg-beige">
        <div className="vq-container">
          <div className="mb-12 md:mb-16">
            <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-gold">Questions</p>
            <h2 className="vq-display mt-4 text-[clamp(2.1rem,4.8vw,3.5rem)] leading-[1.02] tracking-[-0.02em] text-ink">
              Common Questions <span className="text-gold">✦</span>
            </h2>
            <span className="mt-6 block h-px w-14 bg-gradient-to-r from-gold to-transparent" aria-hidden />
          </div>

          <div className="max-w-4xl border-t border-line">
            {FAQS.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>
    </>
  )
}

'use client'

import { useState } from 'react'
import { Mail, Phone, MapPin, Instagram, Facebook, ChevronDown, CheckCircle } from 'lucide-react'

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.118 1.528 5.845L.057 23.571a.75.75 0 0 0 .92.92l5.726-1.471A11.943 11.943 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.693 9.693 0 0 1-4.953-1.358l-.355-.211-3.676.944.962-3.578-.231-.368A9.693 9.693 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
    </svg>
  )
}

const FAQS = [
  { q: 'How do I track my order?',             a: 'Once your order ships, you will receive a tracking link via WhatsApp and email. You can also check order status from your account page.' },
  { q: 'What is your return policy?',           a: 'We accept returns within 7 days of delivery for unused products in original packaging. Reach out via WhatsApp or email to initiate a return.' },
  { q: 'How long does delivery take?',          a: 'We deliver pan India within 4–7 business days. Express delivery may be available at checkout depending on your location.' },
  { q: 'Are Knitwink socks machine washable?',  a: 'Yes! All our socks are machine washable. Use a gentle cold cycle and air dry for best results.' },
  { q: 'Do you offer bulk or gifting orders?',  a: 'Absolutely. We offer custom bulk orders and gift packaging. Drop us an email and we will get back to you within 24 hours.' },
]

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-gray-100 last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 py-4 text-left" aria-expanded={open}>
        <span className="text-sm font-medium text-brand-black">{q}</span>
        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <p className="pb-4 text-sm leading-relaxed text-gray-500 text-justify">{a}</p>}
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
    await new Promise((r) => setTimeout(r, 1000))
    setSent(true)
    setSending(false)
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-brand-black px-4 pt-32 pb-16 text-center sm:px-6 sm:pt-36 sm:pb-20 md:px-10 md:pt-40 md:pb-28">
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-white/[0.03]" />
        <div className="absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-white/[0.03]" />
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/[0.05]" />
        <div className="relative">
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl lg:text-5xl">Get in Touch</h1>
          <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-white/45">
            Have a question, feedback, or just want to say hello? We're always happy to hear from you.
          </p>
        </div>
      </section>

      {/* Info + Form */}
      <section className="bg-white px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 lg:grid-cols-2">

          {/* LEFT */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">Contact Details</p>
              <p className="mt-2 text-sm leading-relaxed text-gray-500 text-justify">
                Questions about your order, our products, or anything else? We'd love to hear from you.
              </p>
            </div>

            {/* Contact cards */}
            <div className="flex flex-col gap-3">
              <a
                href="mailto:support@knitwink.com"
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 transition-colors hover:border-brand-black"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-black">
                  <Mail size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Email</p>
                  <p className="mt-0.5 text-sm font-medium text-brand-black">support@knitwink.com</p>
                </div>
              </a>

              <a
                href="tel:+919999999999"
                className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4 transition-colors hover:border-brand-black"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-black">
                  <Phone size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Phone</p>
                  <p className="mt-0.5 text-sm font-medium text-brand-black">+91 99999 99999</p>
                </div>
              </a>

              <div className="flex items-center gap-4 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-black">
                  <MapPin size={15} className="text-white" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Address</p>
                  <p className="mt-0.5 text-sm font-medium text-brand-black">Mumbai, Maharashtra, India</p>
                </div>
              </div>
            </div>

            {/* Social icons only */}
            <div>
              <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-gray-400">Follow Us</p>
              <div className="flex items-center gap-3">
                <a href="https://instagram.com/knitwink" target="_blank" rel="noopener noreferrer" aria-label="Instagram"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-brand-black transition-all hover:bg-brand-black hover:text-white hover:border-brand-black">
                  <Instagram size={16} />
                </a>
                <a href="https://facebook.com/knitwink" target="_blank" rel="noopener noreferrer" aria-label="Facebook"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-brand-black transition-all hover:bg-brand-black hover:text-white hover:border-brand-black">
                  <Facebook size={16} />
                </a>
                <a href="https://wa.me/919999999999" target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-brand-black transition-all hover:bg-brand-black hover:text-white hover:border-brand-black">
                  <WhatsAppIcon size={16} />
                </a>
              </div>
            </div>
          </div>

          {/* RIGHT — form */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5 sm:p-6 md:p-8">
            {sent ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-black">
                  <CheckCircle size={26} className="text-white" />
                </div>
                <p className="text-base font-semibold text-brand-black">Message sent!</p>
                <p className="text-sm text-gray-500">We'll get back to you within 24 hours.</p>
                <button onClick={() => setSent(false)} className="mt-2 text-xs font-medium text-brand-black underline underline-offset-4">
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <p className="text-sm font-bold uppercase tracking-[0.25em] text-brand-black">Send a Message</p>

                {[
                  { label: 'Your Name',      key: 'name',    type: 'text',  placeholder: 'Priya Sharma' },
                  { label: 'Email Address',  key: 'email',   type: 'email', placeholder: 'priya@email.com' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key} className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-gray-500">{label}</label>
                    <input
                      required
                      type={type}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      placeholder={placeholder}
                      className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none"
                    />
                  </div>
                ))}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium text-gray-500">Message</label>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="How can we help you?"
                    className="resize-none rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-brand-black placeholder:text-gray-300 focus:border-brand-black focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="mt-1 rounded-full bg-brand-black py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                >
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="bg-gray-50 px-4 py-10 sm:px-6 md:py-14">
        <div className="mx-auto max-w-2xl">
          <p className="mb-6 text-center text-sm font-bold uppercase tracking-[0.25em] text-brand-black">
            Frequently Asked
          </p>
          <div className="rounded-2xl border border-gray-100 bg-white px-4 py-2 sm:px-6">
            {FAQS.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
          </div>
        </div>
      </section>
    </>
  )
}

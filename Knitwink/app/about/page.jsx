'use client'

import Link from 'next/link'
import { SectionHeader } from '@/components/ui/SectionHeader'

const STATS = [
  { value: '2020',   label: 'Est.' },
  { value: '50K+',   label: 'Customers' },
  { value: '4.8★',   label: 'Avg Rating' },
  { value: '12+',    label: 'Colors' },
]

const PILLARS = [
  {
    number: '01',
    title: 'Foot Health First',
    body: 'We started Knitwink because we saw how many people suffer from toe misalignment, bunion pain, and foot fatigue — and how little attention everyday socks paid to these problems. Our toe separator design gently realigns your toes with every wear.',
  },
  {
    number: '02',
    title: 'Free Size, Real Fit',
    body: 'One size that actually fits. Our socks are engineered with stretch-knit fabric that adapts to your foot shape — not the other way around. No more bunching, no more slipping, no more digging seams.',
  },
  {
    number: '03',
    title: 'Everyday Comfort',
    body: 'Whether you are recovering at home, heading to yoga, or just going through a long day — Knitwink socks work quietly in the background, keeping your feet comfortable and your toes happy.',
  },
]

const FEATURES = [
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/>
      </svg>
    ),
    title: 'Soft Breathable Fabric',
    body: 'Made from premium cotton blend that keeps your feet cool, dry, and comfortable all day long.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    ),
    title: 'Toe Separator Design',
    body: 'Five-toe structure gently separates and realigns toes — ideal for bunion correction, plantar fasciitis, and daily recovery.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="10"/>
      </svg>
    ),
    title: 'Wash & Wear Durable',
    body: 'Tested through 50+ wash cycles. Our socks hold their shape, colour, and elasticity — wash after wash.',
  },
  {
    icon: (
      <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
        <path d="M5 12h14"/><path d="M12 5l7 7-7 7"/>
      </svg>
    ),
    title: 'Pan India Delivery',
    body: 'Fast, tracked shipping to every corner of India. Most orders arrive within 3–5 business days.',
  },
]

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative min-h-screen flex items-end bg-brand-black overflow-hidden">
        <img
          src="https://ik.imagekit.io/wp2oatzmf/products/variation_0_image-1774363348670-268740372.jpg?tr=w-1600,h-1200,q-85,f-auto"
          alt="Knitwink foot alignment socks"
          className="absolute inset-0 h-full w-full object-cover object-center opacity-45"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-black via-brand-black/30 to-transparent" />

        <div className="relative z-10 w-full px-6 pb-20 md:px-10 lg:px-16 lg:pb-28">
          <div className="max-w-2xl">
            <span className="inline-block rounded-full border border-white/20 px-4 py-1.5 text-[10px] font-semibold uppercase tracking-[0.25em] text-white/50">
              About Knitwink
            </span>
            <h1 className="mt-5 font-display text-5xl font-normal leading-tight text-white md:text-6xl lg:text-7xl">
              Socks That Actually<br /><strong>Care for Your Feet</strong>
            </h1>
            <p className="mt-6 text-base leading-relaxed text-white/60 max-w-lg">
              We are a small team obsessed with one thing — making socks that genuinely improve how your feet feel. Not just look good, not just last long — but actually help.
            </p>
            <Link
              href="/collections"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-brand-black transition-colors hover:bg-gray-100"
            >
              Explore Our Socks
            </Link>
          </div>

          {/* Stats row */}
          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 md:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label}>
                <p className="font-display text-3xl font-semibold text-white">{s.value}</p>
                <p className="mt-0.5 text-xs font-medium uppercase tracking-widest text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="bg-white px-6 py-16 md:px-10 lg:px-16 lg:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-gray-400">Our Belief</p>
            <h2 className="mt-3 font-display text-3xl font-normal text-brand-black lg:text-4xl">
              The smallest things<br /><strong>make the biggest difference</strong>
            </h2>
            <div className="mt-6 flex flex-col gap-4 text-base leading-relaxed text-gray-500">
              <p>At Knitwink, we started with a frustration most people share but rarely talk about — socks that lose shape after two washes, seams that dig in, and fabrics that trap heat. We decided to fix that.</p>
              <p>Our mission is to engineer everyday essentials that perform as hard as you do. Whether you are recovering from foot pain, going through a long day at work, or simply relaxing at home — your socks should never be the problem.</p>
              <p>We work directly with manufacturers, control every step of the supply chain, and refuse to cut corners on materials. That is the Knitwink promise.</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-gray-100">
            <img
              src="https://ik.imagekit.io/wp2oatzmf/products/variation_1_image-1774363348678-875707193.jpg?tr=w-900,h-900,q-85,f-auto"
              alt="Knitwink socks detail"
              className="h-full w-full object-cover"
              style={{ minHeight: 360 }}
            />
          </div>
        </div>
      </section>

      {/* Three Pillars */}
      <section className="bg-gray-50 px-6 py-16 md:px-10 lg:px-16 lg:py-20">
        <SectionHeader eyebrow="How We Think" title="Three Things We <strong>Never Compromise On</strong>" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {PILLARS.map((p) => (
            <div key={p.number} className="rounded-2xl border border-gray-100 bg-white p-8">
              <span className="font-display text-4xl font-normal text-gray-100">{p.number}</span>
              <h3 className="mt-3 text-base font-semibold text-brand-black">{p.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-gray-500">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Product Features */}
      <section className="bg-white px-6 py-16 md:px-10 lg:px-16 lg:py-20">
        <SectionHeader eyebrow="What Makes Us Different" title="Engineered for <strong>Real Feet</strong>" center />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="flex flex-col gap-4 rounded-2xl border border-gray-100 bg-gray-50 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm text-brand-black">
                {f.icon}
              </div>
              <p className="text-sm font-semibold text-brand-black">{f.title}</p>
              <p className="text-sm leading-relaxed text-gray-500">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Quote */}
      <section className="relative overflow-hidden bg-brand-black px-6 py-20 md:px-10 lg:px-16 lg:py-28">
        <img
          src="https://ik.imagekit.io/wp2oatzmf/products/variation_2_image-1774363348683-14851714.jpg?tr=w-1600,h-800,q-80,f-auto"
          alt="Knitwink"
          className="absolute inset-0 h-full w-full object-cover opacity-20"
        />
        <div className="relative z-10 mx-auto max-w-2xl text-center">
          <p className="font-display text-3xl font-normal leading-snug text-white lg:text-4xl">
            &ldquo;We believe every step you take should feel supported, comfortable, and pain-free. That is not a luxury — that is what socks should do.&rdquo;
          </p>
          <p className="mt-6 text-sm text-white/40">— The Knitwink Team</p>
        </div>
      </section>
    </>
  )
}

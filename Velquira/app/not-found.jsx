import Link from 'next/link'
import { VelquiraLogo } from '@/components/brand/VelquiraLogo'

export default function NotFound() {
  return (
    <section className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden bg-brand-black px-6 text-center text-white">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(191,139,46,0.12),transparent)]"
      />
      <p className="vq-display text-[8rem] leading-none text-white/[0.06] md:text-[12rem]">404</p>
      <VelquiraLogo size="md" variant="light" className="relative -mt-16 mb-8" />
      <h1 className="vq-display text-3xl md:text-4xl">This page has wandered off.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
        The piece you are looking for may have moved — or never existed in our catalogue.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-gold px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.28em] text-brand-black transition-colors hover:bg-gold-light"
        >
          Return Home
        </Link>
        <Link
          href="/collections"
          className="rounded-full border border-gold/40 px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.28em] text-gold transition-colors hover:border-gold hover:bg-gold/10"
        >
          Browse Collections
        </Link>
      </div>
    </section>
  )
}

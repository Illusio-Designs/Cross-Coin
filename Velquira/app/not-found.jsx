import Link from 'next/link'
import { VelquiraLogo } from '@/components/brand/VelquiraLogo'

export default function NotFound() {
  return (
    <section className="relative flex min-h-[75vh] flex-col items-center justify-center overflow-hidden bg-cream px-6 text-center text-ink">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_50%,rgba(156,123,58,0.06),transparent)]"
      />
      <p className="vq-display text-[8rem] leading-none text-ink/[0.05] md:text-[12rem]">404</p>
      <VelquiraLogo size="md" className="relative -mt-16 mb-8" />
      <h1 className="vq-display text-3xl md:text-4xl">Page not found.</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-text-muted">
        The page you are looking for doesn't exist or has moved.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-4">
        <Link
          href="/"
          className="rounded-full bg-ink px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.28em] text-white transition-colors hover:bg-[#3a3227]"
        >
          Return Home
        </Link>
        <Link
          href="/collections"
          className="rounded-full border border-ink px-8 py-3.5 text-[10px] font-medium uppercase tracking-[0.28em] text-ink transition-colors hover:bg-ink hover:text-white"
        >
          Browse Collections
        </Link>
      </div>
    </section>
  )
}

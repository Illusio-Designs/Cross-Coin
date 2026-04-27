import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="bg-[var(--bg)] min-h-screen flex items-center justify-center px-6 py-20 relative overflow-hidden">
      <div className="relative z-10 text-center max-w-2xl">
        <p className="font-display text-[var(--gold)]/40 select-none leading-none mb-2"
          style={{ fontSize: 'clamp(8rem, 24vw, 20rem)' }}>
          404
        </p>
        <h1 className="font-display text-[var(--ink)] uppercase leading-[0.95] tracking-tight -mt-4 md:-mt-10 mb-6"
          style={{ fontSize: 'clamp(2.2rem, 5.5vw, 4.4rem)' }}>
          PAGE NOT <em className="not-italic gold-text">FOUND</em>
        </h1>
        <p className="text-[var(--ink-soft)] font-body text-base leading-relaxed mb-10 max-w-md mx-auto">
          The page you&apos;re looking for has either moved or doesn&apos;t exist. Let us guide you back to something beautiful.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="pill-cta">
            Go Home <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
          <Link href="/shop" className="pill-cta pill-cta-light">
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}

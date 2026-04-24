import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img src="https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=1600&q=60"
          alt="" className="w-full h-full object-cover opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent" />
      </div>

      <div className="relative z-10 text-center max-w-lg">
        <p className="font-serif text-[8rem] md:text-[12rem] leading-none gold-text opacity-20 select-none">404</p>
        <div className="-mt-8 mb-6">
          <h1 className="font-serif text-4xl text-[#f3ede0]">Page Not Found</h1>
          <div className="gold-divider w-16 mx-auto mt-4" />
        </div>
        <p className="text-[#f3ede0]/50 font-body text-sm leading-relaxed mb-10">
          The page you're looking for has either moved or doesn't exist. Let us guide you back to something beautiful.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/" className="btn-gold px-10 py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center justify-center gap-2 rounded-sm">
            Go Home <ArrowRight size={14} />
          </Link>
          <Link href="/shop" className="btn-outline-gold px-10 py-4 text-xs tracking-[0.2em] uppercase font-body rounded-sm">
            Browse Shop
          </Link>
        </div>
      </div>
    </div>
  );
}

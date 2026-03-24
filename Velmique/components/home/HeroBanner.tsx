'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1541643600914-78b084683702?w=1600&q=80',
    eyebrow: 'New Launch',
    title: 'Phantom\nEncens',
    subtitle: 'Extrait de Parfum — Limited Edition',
    cta: 'Shop Now',
    href: '/product/phantom-encens',
    ctaSecondary: 'Explore',
    hrefSecondary: '/collections/noir',
  },
  {
    image: 'https://images.unsplash.com/photo-1563170351-be82bc888aa4?w=1600&q=80',
    eyebrow: 'New Arrival',
    title: 'Lumière\nDorée',
    subtitle: 'Luminara Collection — Now Available',
    cta: 'Shop Now',
    href: '/product/lumiere-doree',
    ctaSecondary: 'Explore',
    hrefSecondary: '/collections/luminara',
  },
  {
    image: 'https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=1600&q=80',
    eyebrow: 'Signature',
    title: 'Velvet\nOud',
    subtitle: 'The Art of Oriental Perfumery',
    cta: 'Shop Now',
    href: '/product/velvet-oud',
    ctaSecondary: 'Explore',
    hrefSecondary: '/collections/signature',
  },
];

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrent(c => (c + 1) % slides.length);
        setAnimating(false);
      }, 400);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section className="relative h-screen min-h-[600px] overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <img
          key={current}
          src={slide.image}
          alt={slide.title}
          className={`w-full h-full object-cover transition-opacity duration-700 ${animating ? 'opacity-0' : 'opacity-100'}`}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-black/10" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center"
        style={{ paddingTop: 'calc(var(--announcement-h, 0px) + 80px)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className={`max-w-xl transition-all duration-700 ${animating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-3 mb-6 bg-[#C9A84C] px-4 py-1.5">
              <span className="text-black text-[10px] tracking-[0.3em] uppercase font-body font-semibold">{slide.eyebrow}</span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-6xl md:text-8xl text-white leading-none mb-3 whitespace-pre-line">
              {slide.title}
            </h1>

            {/* Subtitle */}
            <p className="text-white/60 font-body text-sm tracking-wider mb-8">{slide.subtitle}</p>

            {/* CTAs */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link href={slide.href}
                className="bg-[#C9A84C] text-black px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-body font-semibold flex items-center gap-2 hover:bg-white transition-colors">
                {slide.cta} <ArrowRight size={13} />
              </Link>
              <Link href={slide.hrefSecondary}
                className="border border-white/40 text-white px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-body hover:border-[#C9A84C] hover:text-[#C9A84C] transition-colors">
                {slide.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`transition-all duration-300 ${i === current ? 'w-8 h-1 bg-[#C9A84C]' : 'w-4 h-1 bg-white/30 hover:bg-white/60'}`}
          />
        ))}
      </div>

      {/* Scroll hint */}
      <div className="absolute bottom-8 right-8 z-10 hidden md:flex flex-col items-center gap-2">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase font-body">Scroll</p>
        <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
      </div>
    </section>
  );
}

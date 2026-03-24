'use client';
import Link from 'next/link';
import { ArrowRight, Play } from 'lucide-react';
import { useState, useEffect } from 'react';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1600&q=90',
    title: 'Dressed in\nDarkness',
    subtitle: 'The Evening Collection 2026',
    cta: 'Explore Evening',
    href: '/collections/evening',
  },
  {
    image: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=1600&q=90',
    title: 'Golden\nLuminara',
    subtitle: 'New Season — Now Available',
    cta: 'Shop Luminara',
    href: '/collections/luminara',
  },
  {
    image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?w=1600&q=90',
    title: 'The Art of\nDressing',
    subtitle: 'Signature Pieces for the Extraordinary',
    cta: 'Shop Signature',
    href: '/collections/signature',
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
        {/* Dark overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />
      </div>

      {/* Content */}
      <div className="relative z-10 h-full flex items-center">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full">
          <div className={`max-w-xl transition-all duration-700 ${animating ? 'opacity-0 translate-y-8' : 'opacity-100 translate-y-0'}`}>
            {/* Collection tag */}
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-10 bg-[#C9A84C]" />
              <span className="text-[#C9A84C] text-xs tracking-[0.3em] uppercase font-body">{slide.subtitle}</span>
            </div>

            {/* Title */}
            <h1 className="font-serif text-5xl md:text-7xl text-cream leading-none mb-6 whitespace-pre-line">
              {slide.title}
            </h1>

            {/* CTAs */}
            <div className="flex items-center gap-4 flex-wrap">
              <Link href={slide.href}
                className="btn-gold px-8 py-4 text-xs tracking-[0.2em] uppercase font-body flex items-center gap-2 rounded-sm">
                {slide.cta} <ArrowRight size={14} />
              </Link>
              <Link href="/shop"
                className="text-cream/70 text-xs tracking-[0.2em] uppercase font-body hover:text-[#C9A84C] transition-colors flex items-center gap-2">
                View All <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Slide indicators */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className={`transition-all duration-300 rounded-full ${i === current ? 'w-8 h-1.5 bg-[#C9A84C]' : 'w-1.5 h-1.5 bg-cream/30 hover:bg-cream/60'}`}
          />
        ))}
      </div>

      {/* Bottom text */}
      <div className="absolute bottom-8 right-8 z-10 hidden md:block">
        <p className="text-cream/30 text-xs tracking-[0.3em] uppercase font-body">Scroll to Explore</p>
        <div className="w-px h-10 bg-gradient-to-b from-cream/30 to-transparent mx-auto mt-2" />
      </div>
    </section>
  );
}

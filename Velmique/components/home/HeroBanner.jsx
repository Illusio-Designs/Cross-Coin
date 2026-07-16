'use client';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';

/* Velmique editorial Hero — driven entirely by the backend Slider model:
   { title, description, buttonText, image, ctaHref }.
   When the API returns no slides we render nothing (the homepage
   continues with the next section). */
export default function HeroBanner({ slides = [] }) {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const t = setInterval(() => setCurrent(c => (c + 1) % slides.length), 6500);
    return () => clearInterval(t);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[current];

  // Split single backend title into two visual lines (solid + outlined).
  // Splits at the midpoint by word count so both lines feel balanced.
  const words = (slide.title || '').trim().split(/\s+/).filter(Boolean);
  const mid = Math.ceil(words.length / 2);
  const titleTop = words.slice(0, mid).join(' ');
  const titleBottom = words.slice(mid).join(' ');

  return (
    <section className="relative w-full overflow-hidden bg-gradient-to-br from-[#C9A84C] via-[#BFAB5E] to-[#A89548] h-[76vh] md:h-[96vh]">

      {/* Subtle paper grain */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Inner grid */}
      <div className="relative grid grid-cols-12 gap-4 md:gap-6 h-full px-5 md:px-10 lg:px-16 py-6 md:py-10">

        {/* CENTER block — slide content (animated) */}
        <div className="col-span-12 md:col-span-11 relative flex flex-col items-center justify-start pt-2 pb-3 md:py-4 h-full">

          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id || current}
              className="relative w-full flex flex-col items-center justify-end"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            >
              {/* Headline — backend title auto-split into solid + outlined lines */}
              <motion.h1
                className="font-display text-[#FBF7EC] text-center leading-[0.82] tracking-[-0.02em] uppercase"
                style={{ fontSize: 'clamp(2.6rem, 11vw, 10.5rem)' }}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.9 }}
              >
                <span className="block">{titleTop}</span>
                {titleBottom && (
                  <span
                    className="block relative -mt-1 md:-mt-3"
                    style={{
                      WebkitTextStroke: '1.5px rgba(251,247,236,0.85)',
                      color: 'transparent',
                    }}
                  >
                    {titleBottom}
                  </span>
                )}
              </motion.h1>

              {/* Slide image */}
              <motion.div
                className="relative w-full max-w-[760px] -mt-16 md:-mt-44 z-10"
                initial={{ opacity: 0, scale: 0.95, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              >
                <div className="relative h-[52vh] md:h-[78vh] flex items-end justify-center">
                  <img
                    src={slide.image}
                    alt={slide.title}
                    className="w-full h-full object-contain"
                  />
                </div>
              </motion.div>

            </motion.div>
          </AnimatePresence>
        </div>

        {/* RIGHT vertical rail */}
        <div className="hidden md:flex col-span-1 flex-col items-center justify-start py-2">
          <span className="vertical-rl text-[10px] tracking-[0.4em] uppercase text-white/85 font-body">
            Velmique • Maison de Parfum
          </span>
        </div>
      </div>

      {/* Bottom-left block: description + CTA */}
      <motion.div
        key={`left-${slide.id || current}`}
        className="absolute bottom-4 left-5 md:bottom-8 md:left-16 z-20 flex flex-col items-start gap-3 max-w-[260px] md:max-w-[320px]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
      >
        {slide.description && (
          <p className="text-[var(--ink)]/80 text-[11px] md:text-xs leading-snug font-body">
            {slide.description}
          </p>
        )}
        {slide.buttonText && (
          <Link href={slide.ctaHref || '/shop'} className="pill-cta pill-cta-light shrink-0">
            {slide.buttonText}
            <ArrowUpRight size={14} strokeWidth={1.6} />
          </Link>
        )}
      </motion.div>

      {/* Slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-5 right-5 md:bottom-8 md:right-16 flex items-center gap-2 z-20">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`relative h-[3px] overflow-hidden transition-all duration-300 ${
                i === current ? 'bg-[#1A1612]/25' : 'bg-white/50 hover:bg-white/70'
              }`}
              style={{ width: i === current ? 36 : 16 }}
            >
              {i === current && (
                <motion.div
                  key={current}
                  className="absolute inset-0 bg-[#1A1612]"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 6.5, ease: 'linear' }}
                  style={{ originX: 0 }}
                />
              )}
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

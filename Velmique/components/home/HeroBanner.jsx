'use client';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from 'framer-motion';

const slides = [
  {
    image: 'https://images.unsplash.com/photo-1549298916-b41d501d3772?w=1600&q=80',
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

// Floating gold particles for premium ambience
function GoldParticles() {
  const particles = Array.from({ length: 24 });
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((_, i) => {
        const size = 2 + Math.random() * 4;
        const duration = 8 + Math.random() * 12;
        const delay = Math.random() * 8;
        const left = Math.random() * 100;
        const opacity = 0.15 + Math.random() * 0.45;
        return (
          <span
            key={i}
            className="absolute rounded-full"
            style={{
              width: size,
              height: size,
              left: `${left}%`,
              bottom: -20,
              background: 'radial-gradient(circle, #C9A84C 0%, transparent 70%)',
              opacity,
              animation: `vlm-float ${duration}s linear ${delay}s infinite`,
              filter: 'blur(0.5px)',
            }}
          />
        );
      })}
    </div>
  );
}

export default function HeroBanner() {
  const [current, setCurrent] = useState(0);
  const containerRef = useRef(null);

  // Mouse parallax values
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smoothMx = useSpring(mx, { stiffness: 60, damping: 18 });
  const smoothMy = useSpring(my, { stiffness: 60, damping: 18 });
  const bgX = useTransform(smoothMx, [-0.5, 0.5], [-20, 20]);
  const bgY = useTransform(smoothMy, [-0.5, 0.5], [-15, 15]);
  const bgRotateX = useTransform(smoothMy, [-0.5, 0.5], [2, -2]);
  const bgRotateY = useTransform(smoothMx, [-0.5, 0.5], [-2, 2]);

  const handleMouseMove = (e) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mx.set(x);
    my.set(y);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(c => (c + 1) % slides.length);
    }, 6000);
    return () => clearInterval(timer);
  }, []);

  const slide = slides[current];

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative h-screen min-h-[600px] overflow-hidden bg-black"
      style={{ perspective: '1200px' }}
    >
      {/* Background with Ken Burns zoom + parallax tilt */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          className="absolute inset-0"
          style={{ x: bgX, y: bgY, rotateX: bgRotateX, rotateY: bgRotateY }}
          initial={{ opacity: 0, scale: 1.08 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1.05 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.img
            src={slide.image}
            alt={slide.title}
            className="w-full h-full object-cover"
            animate={{ scale: [1, 1.08] }}
            transition={{ duration: 6.2, ease: 'linear' }}
          />
        </motion.div>
      </AnimatePresence>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/55 to-black/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(201,168,76,0.18),transparent_60%)]" />

      {/* Gold particles */}
      <GoldParticles />

      {/* Subtle film grain for premium feel */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      {/* Content */}
      <div className="relative z-10 h-full flex items-center"
        style={{ paddingTop: 'calc(var(--announcement-h, 0px) + 80px)' }}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-14 w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              className="max-w-xl"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={{
                visible: { transition: { staggerChildren: 0.1, delayChildren: 0.2 } },
                exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
              }}
            >
              {/* Eyebrow — animated gold bar with shimmer */}
              <motion.div
                className="inline-flex items-center gap-3 mb-6 relative overflow-hidden"
                variants={{
                  hidden: { opacity: 0, x: -30, scaleX: 0 },
                  visible: { opacity: 1, x: 0, scaleX: 1, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
                  exit: { opacity: 0, x: -20 },
                }}
                style={{ originX: 0 }}
              >
                <div className="bg-[#b8624f] px-4 py-1.5 relative overflow-hidden">
                  <span className="text-black text-[10px] tracking-[0.3em] uppercase font-body font-semibold relative z-10">
                    {slide.eyebrow}
                  </span>
                  {/* Shimmer sweep */}
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/60 to-transparent"
                    initial={{ x: '-100%' }}
                    animate={{ x: '200%' }}
                    transition={{ duration: 2.4, delay: 1.2, repeat: Infinity, repeatDelay: 4, ease: 'easeInOut' }}
                  />
                </div>
              </motion.div>

              {/* Title — letter-by-letter reveal */}
              <motion.h1
                className="font-serif text-6xl md:text-8xl text-white leading-none mb-3 whitespace-pre-line"
                variants={{
                  hidden: {},
                  visible: { transition: { staggerChildren: 0.04 } },
                  exit: { opacity: 0, y: -10, transition: { duration: 0.3 } },
                }}
              >
                {slide.title.split('').map((char, i) => (
                  <motion.span
                    key={`${current}-${i}`}
                    className="inline-block"
                    variants={{
                      hidden: { opacity: 0, y: 40, rotateX: -90 },
                      visible: { opacity: 1, y: 0, rotateX: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
                    }}
                    style={{ transformOrigin: '50% 100%', whiteSpace: char === ' ' ? 'pre' : 'normal' }}
                  >
                    {char === '\n' ? <br /> : char}
                  </motion.span>
                ))}
              </motion.h1>

              {/* Subtitle */}
              <motion.p
                className="text-white/60 font-body text-sm tracking-wider mb-8"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  exit: { opacity: 0 },
                }}
              >
                {slide.subtitle}
              </motion.p>

              {/* CTAs */}
              <motion.div
                className="flex items-center gap-4 flex-wrap"
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
                  exit: { opacity: 0 },
                }}
              >
                <Link href={slide.href}
                  className="group relative bg-[#b8624f] text-black px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-body font-semibold flex items-center gap-2 overflow-hidden transition-all hover:gap-3 hover:shadow-[0_8px_30px_rgba(201,168,76,0.5)]">
                  <span className="relative z-10">{slide.cta}</span>
                  <ArrowRight size={13} className="relative z-10 transition-transform group-hover:translate-x-1" />
                  {/* Shimmer sweep on hover */}
                  <span className="absolute inset-0 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/80 to-transparent" />
                </Link>
                <Link href={slide.hrefSecondary}
                  className="relative border border-white/40 text-white px-8 py-3.5 text-xs tracking-[0.25em] uppercase font-body overflow-hidden group transition-colors hover:border-[#b8624f] hover:text-black">
                  <span className="relative z-10">{slide.ctaSecondary}</span>
                  {/* Fill animation */}
                  <span className="absolute inset-0 bg-[#b8624f] translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out" />
                </Link>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Slide indicators — animated fill */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {slides.map((_, i) => (
          <button key={i} onClick={() => setCurrent(i)}
            className="relative h-1 overflow-hidden bg-white/20 transition-all"
            style={{ width: i === current ? 32 : 16 }}
          >
            {i === current && (
              <motion.div
                className="absolute inset-0 bg-[#b8624f]"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 6, ease: 'linear' }}
                style={{ originX: 0 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Scroll hint with animated line */}
      <div className="absolute bottom-8 right-8 z-10 hidden md:flex flex-col items-center gap-2">
        <p className="text-white/30 text-[10px] tracking-[0.3em] uppercase font-body">Scroll</p>
        <div className="relative w-px h-10 bg-white/10 overflow-hidden">
          <motion.div
            className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-[#b8624f] to-transparent"
            animate={{ y: [-16, 40] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
      </div>

      <style jsx global>{`
        @keyframes vlm-float {
          0%   { transform: translateY(0) translateX(0); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 1; }
          100% { transform: translateY(-110vh) translateX(${Math.random() > 0.5 ? '' : '-'}20px); opacity: 0; }
        }
      `}</style>
    </section>
  );
}

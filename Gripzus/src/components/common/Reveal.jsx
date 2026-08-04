import { useEffect, useRef, useState } from 'react';

/**
 * Gripzus scroll-reveal. The first time a block enters the viewport it rises and
 * fades in on a long, editorial ease — the quiet motion that makes a page feel
 * considered rather than static. Respects prefers-reduced-motion (shows at once).
 *
 *   <Reveal>…</Reveal>                       one block
 *   <Reveal as="section" delay={80}>…</Reveal>  stagger grouped items
 */
export default function Reveal({ children, delay = 0, as: Tag = 'div', className = '' }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = typeof window !== 'undefined'
      && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || typeof IntersectionObserver === 'undefined') { setShown(true); return; }
    const io = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag ref={ref} className={`gz-reveal${shown ? ' in' : ''} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </Tag>
  );
}

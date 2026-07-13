'use client';
import { useEffect, useState } from 'react';
import HeroBanner from './HeroBanner';
import { getPublicSliders } from '@/lib/api/sliders';

/* Fetches slides from the public API on mount and passes them down
   to HeroBanner. While the request is in flight we render a shimmer
   skeleton that mirrors the hero layout (gold gradient, headline,
   product flacon placeholder, CTA, indicators) so the page never
   shows a blank gap. If the API returns nothing, HeroBanner itself
   returns null and the next homepage section moves up. */
export default function Hero3DWrapper({ initialSlides = null }) {
  // Seed from server-provided slides so the hero ships in the initial HTML.
  const hasSeed = Array.isArray(initialSlides) && initialSlides.length > 0;
  const [slides, setSlides]   = useState(initialSlides || []);
  const [loading, setLoading] = useState(!hasSeed);

  useEffect(() => {
    if (hasSeed) return; // SSR already provided the slides; skip the client fetch
    let alive = true;
    getPublicSliders()
      .then((s) => { if (alive && Array.isArray(s)) setSlides(s); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [initialSlides]);

  if (loading) return <HeroSkeleton />;
  return <HeroBanner slides={slides} />;
}

/* Hero loading skeleton — same height + gold backdrop as the real hero,
   with shimmer bars where the headline / flacon / description / CTA /
   indicators will land. Animation matches the product card skeletons. */
function HeroSkeleton() {
  return (
    <section
      aria-hidden
      className="relative w-full overflow-hidden bg-gradient-to-br from-[#C9A84C] via-[#BFAB5E] to-[#A89548] h-[92vh] md:h-[96vh]"
    >
      {/* Same paper grain as the real hero so the transition is seamless */}
      <div
        className="absolute inset-0 opacity-[0.07] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='240'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative grid grid-cols-12 gap-4 md:gap-6 h-full px-5 md:px-10 lg:px-16 py-6 md:py-10">
        <div className="col-span-12 md:col-span-11 relative flex flex-col items-center justify-start pt-2 pb-3 md:py-4 h-full">

          <div className="relative w-full flex flex-col items-center justify-end">
            {/* Headline placeholder — two stacked bars matching titleTop / titleBottom */}
            <div className="w-full flex flex-col items-center gap-3 md:gap-5">
              <div className="h-[clamp(2.6rem,8.5vw,8rem)] w-[78%] md:w-[62%] rounded-md bg-white/25 animate-pulse" />
              <div className="h-[clamp(2.6rem,8.5vw,8rem)] w-[60%] md:w-[48%] rounded-md border border-white/30 bg-white/5 animate-pulse" />
            </div>

            {/* Flacon image placeholder */}
            <div className="relative w-full max-w-[760px] -mt-16 md:-mt-32 z-10">
              <div className="relative h-[68vh] md:h-[78vh] flex items-end justify-center">
                <div className="w-[42%] md:w-[34%] h-[60%] rounded-[22px] bg-white/20 animate-pulse" />
              </div>
            </div>
          </div>
        </div>

        {/* Right vertical rail placeholder */}
        <div className="hidden md:flex col-span-1 flex-col items-center justify-start py-2">
          <div className="w-[3px] h-40 rounded bg-white/30 animate-pulse" />
        </div>
      </div>

      {/* Bottom-left description + CTA */}
      <div className="absolute bottom-4 left-5 md:bottom-8 md:left-16 z-20 flex flex-col items-start gap-3 max-w-[260px] md:max-w-[320px] w-[60%]">
        <div className="h-2.5 w-full rounded bg-[var(--ink)]/15 animate-pulse" />
        <div className="h-2.5 w-3/4 rounded bg-[var(--ink)]/15 animate-pulse" />
        <div className="h-9 w-32 rounded-full bg-white/30 animate-pulse mt-1" />
      </div>

      {/* Slide indicators placeholder */}
      <div className="absolute bottom-5 right-5 md:bottom-8 md:right-16 flex items-center gap-2 z-20">
        <div className="h-[3px] w-9 bg-[var(--ink)]/25 rounded animate-pulse" />
        <div className="h-[3px] w-4 bg-white/50 rounded animate-pulse" />
        <div className="h-[3px] w-4 bg-white/50 rounded animate-pulse" />
      </div>
    </section>
  );
}

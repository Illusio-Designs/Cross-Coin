'use client';
import { useEffect, useState } from 'react';
import HeroBanner from './HeroBanner';
import { getPublicSliders } from '@/lib/api/sliders';

/* Fetches slides from the public API on mount and passes them down
   to HeroBanner. HeroBanner falls back to the local heroSlides array
   from lib/data.js if the API returns nothing, so the page is never
   blank. */
export default function Hero3DWrapper() {
  const [slides, setSlides] = useState([]);

  useEffect(() => {
    let alive = true;
    getPublicSliders().then((s) => {
      if (alive && Array.isArray(s)) setSlides(s);
    });
    return () => { alive = false; };
  }, []);

  return <HeroBanner slides={slides} />;
}

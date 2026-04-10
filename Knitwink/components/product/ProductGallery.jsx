'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';









export function ProductGallery({ images, colorImages, activeColorName, productName }) {
  const resolvedImages =
  activeColorName && colorImages?.[activeColorName]?.length ?
  colorImages[activeColorName] :
  images;

  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {setActiveIndex(0);}, [activeColorName]);

  useEffect(() => {
    if (resolvedImages.length <= 1) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % resolvedImages.length);
    }, 3000);
    return () => {if (timerRef.current) clearInterval(timerRef.current);};
  }, [resolvedImages.length, activeColorName]);

  const handleThumbClick = (i) => {
    setActiveIndex(i);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % resolvedImages.length);
    }, 3000);
  };

  const active = resolvedImages[activeIndex] ?? resolvedImages[0];

  return (
    <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-start">
      {/* Main image */}
      <div className="min-w-0 flex-1 rounded-2xl bg-gray-50">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={`${activeColorName}-${activeIndex}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}>
            
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={active.url}
              alt={active.alt || productName}
              className="block h-auto w-full rounded-2xl object-contain" />
            
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Thumbnail rail */}
      {resolvedImages.length > 1 &&
      <div className="flex shrink-0 gap-2 overflow-x-auto lg:w-[88px] lg:flex-col lg:overflow-x-visible">
          {resolvedImages.map((img, i) =>
        <button
          key={i}
          onClick={() => handleThumbClick(i)}
          aria-label={`View image ${i + 1}`}
          className={cn(
            'h-[88px] w-[88px] shrink-0 rounded-xl bg-gray-50 p-1 transition-all duration-150 focus-visible:outline-none',
            i === activeIndex ?
            'border-2 border-brand-black' :
            'border border-gray-200 opacity-60 hover:opacity-100'
          )}>
          
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
            src={img.url}
            alt={img.alt || `${productName} ${i + 1}`}
            className="h-full w-full rounded-lg object-contain" />
          
            </button>
        )}
        </div>
      }
    </div>);

}
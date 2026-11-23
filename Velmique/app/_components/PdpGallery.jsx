'use client';

import { useCallback, useEffect, useState } from 'react';
import { ik, ikSrcSet } from '@/lib/imagekit';
import SkImg from './SkImg';
import BrandIcon from '@/components/ui/BrandIcon';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';

const GALLERY_RESIZE = { uploads: true };
const MAIN_WIDTHS = [480, 640, 800, 960, 1200];
const MAIN_SIZES = '(max-width: 740px) calc(100vw - 40px), 560px';

/* Thumbnail gallery with a
   click-to-zoom lightbox: tap any image for a fullscreen view, swipe through
   with the arrows or ←/→, close with × / Esc / backdrop tap. */
export default function PdpGallery({ images = [], name = '' }) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(-1);
  useEffect(() => { setSelected(0); setOpen(-1); }, [name]);
  const close = useCallback(() => setOpen(-1), []);
  const lightboxRef = useFocusTrap(open >= 0, { onEscape: close });
  const step = (d) => setOpen((o) => (o + d + images.length) % images.length);

  useEffect(() => {
    if (open < 0) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!images.length) return null;

  const mainImage = images[selected];
  return (
    <>
      <div className="v-gallery">
        <div className="v-gallery__thumbs" aria-label="Product images">
          {images.map((src, i) => (
            <button key={src + i} type="button" aria-label={`View ${name} image ${i + 1}`}
              aria-pressed={selected === i} className={selected === i ? 'on' : ''} onClick={() => setSelected(i)}>
              <img src={ik(src, 144, GALLERY_RESIZE)} alt="" loading="lazy" decoding="async" fetchPriority="low" />
            </button>
          ))}
        </div>
        <button className="v-gallery__main" type="button" aria-label={`Zoom ${name} image ${selected+1}`} onClick={()=>setOpen(selected)}>
          <SkImg key={mainImage} src={ik(mainImage, 1200, GALLERY_RESIZE)}
            srcSet={ikSrcSet(mainImage, MAIN_WIDTHS, GALLERY_RESIZE)} sizes={MAIN_SIZES}
            alt={`${name} — view ${selected + 1}`} loading="eager" fetchPriority="high" />
          <span className="v-gallery__zoom" aria-hidden="true"><BrandIcon name="zoom" size={18}/></span>
        </button>
      </div>

      {open >= 0 && (
        <div ref={lightboxRef} className="m-lbx" role="dialog" aria-modal="true" aria-label={`${name} image zoom`} onClick={close}>
          <button type="button" className="m-lbx__x" aria-label="Close zoom" onClick={close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          {images.length > 1 && (
            <button type="button" className="m-lbx__nav prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
          )}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
          <img src={ik(images[open], 1600, GALLERY_RESIZE)} alt={`${name} — zoomed view ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button type="button" className="m-lbx__nav next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
          )}
          <span className="m-lbx__count">{open + 1} / {images.length}</span>
        </div>
      )}
    </>
  );
}

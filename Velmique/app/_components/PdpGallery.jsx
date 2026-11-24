'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ik, ikSrcSet } from '@/lib/imagekit';
import BrandIcon from '@/components/ui/BrandIcon';
import { useFocusTrap } from '@/lib/hooks/useFocusTrap';
import SkImg from './SkImg';

const MAIN_WIDTHS = [480, 640, 800, 960, 1200];
const MAIN_SIZES = '(max-width: 820px) calc(100vw - 40px), 560px';
const THUMB_WIDTHS = [64, 144, 216];
const THUMB_SIZES = '(max-width: 820px) 58px, 66px';
const ZOOM_WIDTHS = [640, 900, 1200, 1600];
const ZOOM_SIZES = '(max-width: 980px) 92vw, 900px';

/* Thumbnail gallery with a
   click-to-zoom lightbox: tap any image for a fullscreen view, swipe through
   with the arrows or ←/→, close with × / Esc / backdrop tap. */
export default function PdpGallery({ images = [], name = '' }) {
  const [selected, setSelected] = useState(0);
  const [open, setOpen] = useState(-1);
  const [failedImage, setFailedImage] = useState('');
  const thumbsRef = useRef(null);
  const current = Math.min(selected, images.length - 1);
  useEffect(() => { setSelected(0); setOpen(-1); setFailedImage(''); }, [name]);
  const close = useCallback(() => setOpen(-1), []);
  const lightboxRef = useFocusTrap(open >= 0, { onEscape: close });
  const step = useCallback((direction) => {
    const next = (open + direction + images.length) % images.length;
    setOpen(next);
    setSelected(next);
  }, [open, images.length]);

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
  }, [open, close, step]);

  if (!images.length) return null;

  const mainImage = images[current];
  const selectFromRail = (event) => {
    const direction = { ArrowUp: -1, ArrowLeft: -1, ArrowDown: 1, ArrowRight: 1 }[event.key];
    if (!direction) return;
    event.preventDefault();
    const index = (current + direction + images.length) % images.length;
    setSelected(index);
    thumbsRef.current?.children[index]?.focus();
  };

  return (
    <>
      <div className={`v-gallery${images.length === 1 ? ' v-gallery--single' : ''}`}>
        <div className="v-gallery__stage">
          <button className="v-gallery__main" type="button" aria-label={`Zoom ${name} image ${current + 1}`}
            disabled={failedImage === mainImage} onClick={() => setOpen(current)}>
            {failedImage === mainImage ? (
              <span className="v-gallery__unavailable">Image unavailable</span>
            ) : (
              <SkImg natural src={ik(mainImage, 1200)}
                srcSet={ikSrcSet(mainImage, MAIN_WIDTHS)} sizes={MAIN_SIZES}
                alt={`${name} — view ${current + 1}`} loading="eager" fetchPriority="high"
                onError={() => setFailedImage(mainImage)} />
            )}
            {failedImage !== mainImage && <span className="v-gallery__zoom" aria-hidden="true"><BrandIcon name="zoom" size={18} /></span>}
          </button>
          {images.length > 1 && <p className="v-gallery__count" aria-live="polite">{current + 1} / {images.length}</p>}
        </div>
        {images.length > 1 && (
          <div className="v-gallery__rail">
            <div className="v-gallery__thumbs" ref={thumbsRef} role="group" aria-label="Product image thumbnails"
              data-lenis-prevent onKeyDown={selectFromRail}>
              {images.map((src, i) => (
                <button key={src + i} type="button" aria-label={`View ${name} image ${i + 1}`}
                  aria-pressed={current === i} onClick={() => setSelected(i)}>
                  <SkImg src={ik(src, 144)} srcSet={ikSrcSet(src, THUMB_WIDTHS)} sizes={THUMB_SIZES}
                    alt="" loading="lazy" fetchPriority="low" />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {open >= 0 && (
        <div ref={lightboxRef} className="m-lbx" role="dialog" aria-modal="true" aria-label={`${name} image zoom`} onClick={close}>
          <button type="button" className="m-lbx__x" aria-label="Close zoom" onClick={close}>
            <BrandIcon name="close" />
          </button>
          {images.length > 1 && (
            <button type="button" className="m-lbx__nav prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); step(-1); }}><BrandIcon name="previous" /></button>
          )}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
          <SkImg natural frameClassName="v-gallery__lightbox-photo" src={ik(images[open], 1600)}
            srcSet={ikSrcSet(images[open], ZOOM_WIDTHS)} sizes={ZOOM_SIZES}
            alt={`${name} — zoomed view ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button type="button" className="m-lbx__nav next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); step(1); }}><BrandIcon name="arrow" /></button>
          )}
          <span className="m-lbx__count">{open + 1} / {images.length}</span>
        </div>
      )}
    </>
  );
}

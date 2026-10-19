'use client';

import { useEffect, useState } from 'react';
import { ik } from '@/lib/imagekit';

/* Stacked scroll gallery (sticky shots that slide over each other) with a
   click-to-zoom lightbox: tap any image for a fullscreen view, swipe through
   with the arrows or ←/→, close with × / Esc / backdrop tap. */
export default function PdpGallery({ images = [], name = '' }) {
  const [open, setOpen] = useState(-1);
  const close = () => setOpen(-1);
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

  return (
    <>
      <div className="m-gstack">
        {images.map((src, i) => (
          <button type="button" className="m-gshot m-gshot--btn" key={i} onClick={() => setOpen(i)} aria-label={`Zoom ${name} image ${i + 1}`}>
            <img src={ik(src, 1000)} alt={`${name} — view ${i + 1}`} loading={i ? 'lazy' : 'eager'} fetchPriority={i ? undefined : 'high'} decoding="async" />
            <span className="m-gzoom" aria-hidden>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
            </span>
          </button>
        ))}
      </div>

      {open >= 0 && (
        <div className="m-lbx" role="dialog" aria-modal="true" aria-label={`${name} image zoom`} onClick={close}>
          <button type="button" className="m-lbx__x" aria-label="Close zoom" onClick={close}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          {images.length > 1 && (
            <button type="button" className="m-lbx__nav prev" aria-label="Previous image" onClick={(e) => { e.stopPropagation(); step(-1); }}>‹</button>
          )}
          {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/click-events-have-key-events */}
          <img src={ik(images[open], 1600)} alt={`${name} — zoomed view ${open + 1}`} onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button type="button" className="m-lbx__nav next" aria-label="Next image" onClick={(e) => { e.stopPropagation(); step(1); }}>›</button>
          )}
          <span className="m-lbx__count">{open + 1} / {images.length}</span>
        </div>
      )}
    </>
  );
}

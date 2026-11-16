'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export default function ReviewPhotos({ images = [], author = 'a customer' }) {
  const [open, setOpen] = useState(-1);
  const [failed, setFailed] = useState([]);
  const dialog = useRef(null);
  const photos = [...new Set(images.filter(src => typeof src === 'string' && /^(https?:\/\/|\/(?!\/))/i.test(src)))].slice(0, 5);

  useEffect(() => {
    if (open < 0) return;
    const previous = document.activeElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.current?.querySelector('button')?.focus();
    const keydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); setOpen(-1); }
      if (event.key === 'ArrowRight') { event.preventDefault(); setOpen(index => (index + 1) % photos.length); }
      if (event.key === 'ArrowLeft') { event.preventDefault(); setOpen(index => (index - 1 + photos.length) % photos.length); }
      if (event.key === 'Tab') {
        const buttons = [...dialog.current.querySelectorAll('button')];
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus?.({ preventScroll: true });
    };
  }, [open >= 0, photos.length]);

  if (!photos.length) return null;
  return <>
    <div className="review-customer-photos" aria-label={`Photos from ${author}'s review`}>
      {photos.map((src, index) => !failed.includes(src) && <button type="button" key={src} onClick={() => setOpen(index)} aria-label={`Enlarge photo ${index + 1} from ${author}'s review`}>
        <img src={src} alt={`Customer photo ${index + 1} shared by ${author}`} width="96" height="96" loading="lazy" decoding="async" onError={() => setFailed(list => [...list, src])} />
      </button>)}
    </div>
    {open >= 0 && createPortal(<div className="review-photo-viewer" onClick={() => setOpen(-1)}>
      <div ref={dialog} className="review-photo-dialog" role="dialog" aria-modal="true" aria-label={`Review photos from ${author}`} onClick={event => event.stopPropagation()}>
        <button type="button" className="review-photo-close" aria-label="Close review photos" onClick={() => setOpen(-1)}>×</button>
        <img src={photos[open]} alt={`Photo ${open + 1} shared by ${author}`} />
        {photos.length > 1 && <div className="review-photo-controls">
          <button type="button" aria-label="Previous review photo" onClick={() => setOpen(index => (index - 1 + photos.length) % photos.length)}>←</button>
          <span aria-live="polite">{open + 1} / {photos.length}</span>
          <button type="button" aria-label="Next review photo" onClick={() => setOpen(index => (index + 1) % photos.length)}>→</button>
        </div>}
      </div>
    </div>, document.body)}
  </>;
}

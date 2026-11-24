'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ik, ikSrcSet } from '@/lib/imagekit';

// Description pictures remain below the fold and load as they approach view.
const DESC_WIDTHS = [400, 480, 600, 800, 1100];
const DESC_SIZES = '(max-width: 680px) calc(100vw - 40px), 640px';

// The incoming HTML is already sanitized. Keep the original image dimensions
// and responsive classes from the editor when adding loading markup.
function sizeImages(html, sizes) {
  return String(html || '').replace(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi, (tag) => {
    const source = tag.match(/\ssrc="([^"]+)"/i);
    if (!source) return tag;
    const src = source[1].replace(/&amp;/g, '&');
    const set = ikSrcSet(src, DESC_WIDTHS);
    const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    const image = tag.replace(source[0], ` data-src="${attr(ik(src, 1100))}"${set ? ` data-srcset="${attr(set)}" sizes="${attr(sizes)}"` : ''}`);
    return `<span class="v-rich-image sk-img">${image}</span>`;
  });
}

export default function DescriptionHtml({ as: Tag = 'div', html, className = '', style, sizes = DESC_SIZES }) {
  const ref = useRef(null);
  const out = useMemo(() => sizeImages(html, sizes), [html, sizes]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const imgs = [...root.querySelectorAll('img[data-src]')];
    let active = true;
    const cleanups = [];
    const show = (img) => {
      const frame = img.parentElement;
      const settle = () => {
        if (!active) return;
        frame.classList.remove('sk-img');
        img.removeAttribute('data-src');
        img.removeAttribute('data-srcset');
      };
      const reveal = () => {
        if (typeof img.decode === 'function') img.decode().then(settle, settle);
        else settle();
      };
      img.addEventListener('load', reveal, { once: true });
      img.addEventListener('error', settle, { once: true });
      cleanups.push(() => {
        img.removeEventListener('load', reveal);
        img.removeEventListener('error', settle);
      });
      img.decoding = 'async';
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      if (img.complete && img.naturalWidth) reveal();
    };
    const io = typeof IntersectionObserver === 'undefined' ? null : new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '300px 0px' });
    imgs.forEach((img) => { if (io) io.observe(img); else show(img); });
    return () => {
      active = false;
      io?.disconnect();
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [out]);
  return <Tag ref={ref} className={className} style={style} dangerouslySetInnerHTML={{ __html: out }} />;
}

'use client';

import { useEffect, useMemo, useRef } from 'react';
import { ik, ikSrcSet } from '@/lib/imagekit';

// Description pictures: the right-hand column on desktop, the screen width
// less the padding on phones.
const DESC_WIDTHS = [400, 480, 600, 800, 1100];
const DESC_SIZES = '(max-width: 900px) calc(100vw - 40px), 560px';

// Column-sized copies (ImageKit) instead of the original upload, as data-*
// only: the picture is fetched when it comes within ~300px of the screen,
// not with the first screen — the browser's own lazy loading starts far
// earlier on slow connections. `html` is already sanitized (page.jsx).
function sizeImages(html) {
  return String(html || '').replace(/(<img\b[^>]*\s)src="([^"]+)"/gi, (m, a, raw) => {
    const src = raw.replace(/&amp;/g, '&');
    const set = ikSrcSet(src, DESC_WIDTHS);
    const attr = (v) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;');
    return `${a}data-src="${attr(ik(src, 1100) || src)}"${set ? ` data-srcset="${attr(set)}" sizes="${DESC_SIZES}"` : ''}`;
  });
}

export default function DescriptionHtml({ html, className = '' }) {
  const ref = useRef(null);
  const out = useMemo(() => sizeImages(html), [html]);
  useEffect(() => {
    const root = ref.current;
    if (!root) return undefined;
    const imgs = [...root.querySelectorAll('img[data-src]')];
    const show = (img) => {
      if (img.dataset.srcset) img.srcset = img.dataset.srcset;
      img.src = img.dataset.src;
      img.removeAttribute('data-src');
      img.removeAttribute('data-srcset');
    };
    if (typeof IntersectionObserver === 'undefined') { imgs.forEach(show); return undefined; }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((e) => { if (e.isIntersecting) { show(e.target); io.unobserve(e.target); } });
    }, { rootMargin: '300px 0px' });
    imgs.forEach((img) => io.observe(img));
    return () => io.disconnect();
  }, [out]);
  return <div ref={ref} className={className} dangerouslySetInnerHTML={{ __html: out }} />;
}

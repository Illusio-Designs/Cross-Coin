'use client';

import SkImg from '@/app/_components/SkImg';
import { ik, ikSrcSet } from '@/lib/imagekit';

export default function NotePhoto({ image, width, widths, sizes, alt = '', natural = true }) {
  if (!image) return null;
  return <SkImg natural={natural} src={ik(image, width)} srcSet={widths ? ikSrcSet(image, widths) : undefined}
    sizes={sizes} alt={alt} loading="lazy" />;
}

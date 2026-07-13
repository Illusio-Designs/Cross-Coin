'use client'

import { useState } from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { LOGO_CANDIDATES, LOGO_MARK } from '@/lib/brand'

/**
 * VelquiraLogo — mark + wordmark for the Velquira brand.
 * `stacked` layout is used in the navbar centre.
 */
export function VelquiraLogo({
  className,
  markClassName,
  wordmarkClassName,
  taglineClassName,
  showWordmark = true,
  showTagline = false,
  layout = 'inline',
  size = 'md',
  variant = 'default',
  priority = false,
}) {
  const [srcIndex, setSrcIndex] = useState(0)
  const src = srcIndex < LOGO_CANDIDATES.length ? LOGO_CANDIDATES[srcIndex] : LOGO_MARK

  const sizes = {
    sm: { mark: 26, word: 'text-[13px]', tag: 'text-[6px]' },
    md: { mark: 34, word: 'text-[15px] sm:text-[16px]', tag: 'text-[7px]' },
    lg: { mark: 44, word: 'text-[20px] sm:text-[22px]', tag: 'text-[8px]' },
    xl: { mark: 56, word: 'text-[26px] sm:text-[30px]', tag: 'text-[9px]' },
  }
  const s = sizes[size] || sizes.md
  const light = variant === 'light'
  const stacked = layout === 'stacked'

  const mark = (
    <span
      className={cn(
        'relative shrink-0',
        stacked ? 'mx-auto' : '',
        markClassName
      )}
      style={{ width: s.mark, height: s.mark }}
    >
      <Image
        src={src}
        alt=""
        fill
        priority={priority}
        className="object-contain drop-shadow-[0_2px_8px_rgba(160,125,62,0.28)]"
        onError={() => setSrcIndex((i) => i + 1)}
      />
    </span>
  )

  const wordmark = showWordmark && (
    <span
      className={cn(
        'font-medium uppercase leading-none',
        stacked ? 'mt-2 text-center' : '',
        light ? 'text-white' : 'vq-wordmark',
        stacked ? 'tracking-[0.42em]' : 'tracking-[0.34em]',
        s.word,
        wordmarkClassName
      )}
    >
      Velquira
    </span>
  )

  const tagline = showTagline && (
    <span
      className={cn(
        'font-sans font-light uppercase',
        stacked ? 'mt-1.5 text-center' : 'ml-1',
        light ? 'text-white/45' : 'text-gold/75',
        stacked ? 'tracking-[0.48em]' : 'tracking-[0.35em]',
        s.tag,
        taglineClassName
      )}
    >
      Fine Jewellery
    </span>
  )

  if (stacked) {
    return (
      <span className={cn('inline-flex flex-col items-center', className)}>
        {mark}
        {wordmark}
        {tagline}
      </span>
    )
  }

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {mark}
      <span className="inline-flex flex-col justify-center">
        {wordmark}
        {tagline}
      </span>
    </span>
  )
}

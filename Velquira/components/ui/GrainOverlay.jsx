'use client'

/**
 * Subtle film-grain overlay — adds tactile depth without distracting
 * from product photography. Pure CSS, respects reduced motion.
 */
export function GrainOverlay() {
  return (
    <div
      aria-hidden
      className="vq-grain pointer-events-none fixed inset-0 z-[9998] opacity-[0.035]"
    />
  )
}

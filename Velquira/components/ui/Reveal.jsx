'use client'

import { motion } from 'framer-motion'

/* Premium scroll-reveal. Children fade + rise into view once, slowly,
   with an editorial easing curve. `delay` and `y` (initial offset) are
   tunable; `once` defaults to true so the animation doesn't replay on
   scroll-back. */
export function Reveal({
  children,
  delay = 0,
  y = 32,
  duration = 0.9,
  once = true,
  amount = 0.2,
  className = '',
  as = 'div',
  ...rest
}) {
  const Comp = motion[as] || motion.div
  return (
    <Comp
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, amount }}
      transition={{
        duration,
        delay,
        ease: [0.22, 0.65, 0.3, 1],
      }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  )
}
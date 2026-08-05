/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — Monochrome Atelier. A soft off-white canvas and true
        // near-black ink, nothing else: black IS the accent. Contrast,
        // hairlines and typography carry the design. Distinct from the
        // sibling brands, which lean on brand-tinted colour.
        ink: {
          DEFAULT: '#121212',   // near-black — primary text & accent
          soft:    '#575552',   // muted body
          muted:   '#9A968F',   // captions / eyebrows
        },
        paper: {
          DEFAULT: '#F4F2EC',   // soft off-white canvas (never stark white)
          warm:    '#ECE9E1',   // card / raised
          deep:    '#E3DFD5',   // deepest panel / skeletons
        },
        line: {
          DEFAULT: '#E2DDD2',   // quiet hairline
          dark:    '#D5CFC3',   // stronger hairline
        },
        // Black is the accent — monochrome by design.
        accent: {
          DEFAULT: '#141414',
          deep:    '#000000',
          soft:    '#ECE9E1',   // neutral tint fill (was pale green)
        },
        clay: {
          DEFAULT: '#141414',
          deep:    '#000000',
        },
      },
      fontFamily: {
        // Wide technical grotesque display for a modern-editorial voice.
        display: ['"Space Grotesk"', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body:    ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.16em',
      },
      borderRadius: {
        // ONE shape across the whole site: square. Every rounded-* utility
        // (including rounded-full) resolves to 0 so nothing mixes pills/circles
        // with the architectural square frames. This is the GROUND INDEX thesis.
        none: '0', sm: '0', DEFAULT: '0', md: '0', lg: '0', xl: '0', '2xl': '0', '3xl': '0', full: '0',
      },
      maxWidth: {
        site: '1600px',
      },
      boxShadow: {
        card: '0 20px 60px -30px rgba(0,0,0,0.22)',
        soft: '0 4px 20px -14px rgba(0,0,0,0.14)',
      },
      keyframes: {
        riseIn: {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        riseIn: 'riseIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}

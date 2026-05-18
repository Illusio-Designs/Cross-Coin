/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — strict black & white / greyscale only
        ink: {
          DEFAULT: '#111111',
          soft:    '#555555',
          muted:   '#999999',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm:    '#F4F4F4',  // light grey surface
          deep:    '#EAEAEA',  // deeper grey surface
        },
        line: '#E2E2E2',
        // accent kept as a token name only — collapses to black so any
        // legacy `clay` class renders monochrome.
        clay: {
          DEFAULT: '#111111',
          deep:    '#000000',
        },
      },
      fontFamily: {
        display: ['Newsreader', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.22em',
      },
      maxWidth: {
        site: '1440px',
      },
      boxShadow: {
        card: '0 12px 40px -16px rgba(0,0,0,0.18)',
        soft: '0 2px 14px -6px rgba(0,0,0,0.10)',
      },
    },
  },
  plugins: [],
}

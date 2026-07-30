/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — athletic monochrome (per the black GRIPZUS wordmark)
        ink: {
          DEFAULT: '#0A0A0A',
          soft:    '#4A4A4A',
          muted:   '#8A8A8A',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm:    '#F4F4F2',  // light grey surface
          deep:    '#ECECEC',  // deeper grey surface
        },
        line: {
          DEFAULT: '#E4E4E4',
          dark:    '#262626',
        },
        // accent kept as a token name only — collapses to black so any
        // legacy `clay` class renders monochrome.
        clay: {
          DEFAULT: '#0A0A0A',
          deep:    '#000000',
        },
      },
      fontFamily: {
        display: ['Archivo Expanded', 'Archivo', 'system-ui', 'sans-serif'],
        heavy:   ['Archivo', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        tightest: '-0.04em',
        wider: '0.05em',
        widest: '0.28em',
      },
      maxWidth: {
        site: '1440px',
      },
      boxShadow: {
        card: '0 18px 50px -20px rgba(0,0,0,0.28)',
        soft: '0 2px 14px -6px rgba(0,0,0,0.12)',
      },
      keyframes: {
        marquee: {
          '0%':   { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(-100%)' },
        },
        riseIn: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        marquee: 'marquee 26s linear infinite',
        riseIn: 'riseIn 0.6s cubic-bezier(0.22,1,0.36,1) both',
      },
    },
  },
  plugins: [],
}

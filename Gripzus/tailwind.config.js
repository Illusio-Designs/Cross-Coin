/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — Monochrome Atelier (warm platinum canvas + white surfaces)
        ink: {
          DEFAULT: '#121211',
          soft:    '#56544E',
          muted:   '#9A968C',
        },
        // page canvas — white cards float above this
        canvas:  '#F1EFEA',
        paper: {
          DEFAULT: '#FFFFFF',
          warm:    '#F7F5F1',
          deep:    '#E8E5DE',
        },
        line: {
          DEFAULT: '#E4E1D9',
          strong:  '#D3CFC5',
          dark:    '#1E1E1C',
        },
        silver: '#C7C3B9',
        accent: {
          DEFAULT: '#121211',
          deep:    '#000000',
          soft:    '#F0EEE9',
        },
        clay: {
          DEFAULT: '#121211',
          deep:    '#000000',
        },
      },
      fontFamily: {
        display: ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
        body:    ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.16em',
      },
      borderRadius: {
        DEFAULT: '14px',
        sm: '10px',
        md: '14px',
        lg: '20px',
        xl: '24px',
        '2xl': '28px',
      },
      maxWidth: {
        site: '1600px',
      },
      boxShadow: {
        // layered, monochrome elevation
        sm:   '0 1px 2px rgba(18,18,17,0.04), 0 3px 10px -6px rgba(18,18,17,0.10)',
        soft: '0 2px 6px -3px rgba(18,18,17,0.06), 0 16px 34px -18px rgba(18,18,17,0.16)',
        card: '0 6px 14px -8px rgba(18,18,17,0.08), 0 34px 64px -28px rgba(18,18,17,0.22)',
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

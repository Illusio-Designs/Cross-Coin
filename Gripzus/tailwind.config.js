/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — Soft Luxe Editorial (warm bone + espresso + sage)
        ink: {
          DEFAULT: '#1C1A17',
          soft:    '#6B655C',
          muted:   '#A69F92',
        },
        paper: {
          DEFAULT: '#FBFAF6',
          warm:    '#F4F1E9',
          deep:    '#ECE7DB',
        },
        line: {
          DEFAULT: '#E6E0D3',
          dark:    '#2A2822',
        },
        // Signature sage accent
        accent: {
          DEFAULT: '#5E6B54',
          deep:    '#454F3D',
          soft:    '#EAEBE2',
        },
        // legacy alias → sage so old `clay` classes render on-brand
        clay: {
          DEFAULT: '#5E6B54',
          deep:    '#454F3D',
        },
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.24em',
      },
      borderRadius: {
        xl2: '20px',
        xl3: '28px',
      },
      maxWidth: {
        site: '1440px',
      },
      boxShadow: {
        card: '0 24px 60px -28px rgba(28,26,23,0.30)',
        soft: '0 8px 30px -18px rgba(28,26,23,0.22)',
      },
      keyframes: {
        riseIn: {
          '0%':   { opacity: '0', transform: 'translateY(14px)' },
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — Techwear / Performance-Luxe (graphite + concrete + steel)
        ink: {
          DEFAULT: '#17191C',
          soft:    '#565C63',
          muted:   '#9198A0',
        },
        paper: {
          DEFAULT: '#F2F3F4',
          warm:    '#E9EBED',
          deep:    '#E0E3E6',
        },
        line: {
          DEFAULT: '#D6DADE',
          dark:    '#2A2D31',
        },
        // restrained steel accent
        accent: {
          DEFAULT: '#47566A',
          deep:    '#333F4E',
          soft:    '#E1E5EA',
        },
        clay: {
          DEFAULT: '#47566A',
          deep:    '#333F4E',
        },
      },
      fontFamily: {
        display: ['Space Grotesk', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['Space Mono', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.2em',
      },
      borderRadius: {
        DEFAULT: '10px',
        lg: '16px',
        xl2: '20px',
      },
      maxWidth: {
        site: '1440px',
      },
      boxShadow: {
        card: '0 20px 50px -26px rgba(23,25,28,0.28)',
        soft: '0 6px 24px -14px rgba(23,25,28,0.20)',
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

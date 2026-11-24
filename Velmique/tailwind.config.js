/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          DEFAULT: '#B89A63',
          light: '#D9C190',
          dark: '#8F7548',
          pale: '#EFE5CE',
        },
        champagne: '#C3AF77',
        olive: '#9C8A54',
        cream: {
          DEFAULT: '#F7F4EF',
          light: '#FFFFFF',
          dark: '#EFEAE2',
          panel: '#E6DED0',
        },
        ink: {
          DEFAULT: '#11100E',
          soft: '#49423A',
          muted: '#777168',
        },
        dark: {
          DEFAULT: '#11100E',
          card: '#1C1915',
          border: '#272320',
          muted: '#3A3128',
        },
      },
      // The Mint type pair (loaded in app/layout.jsx) for Tailwind-styled
      // shared components such as the cart drawer.
      fontFamily: {
        serif:   'var(--m-d)',
        sans:    'var(--m-b)',
        body:    'var(--m-b)',
        display: 'var(--m-d)',
      },
      borderRadius: {
        DEFAULT: 'var(--m-radius)',
        md: 'var(--m-radius)',
        lg: 'var(--m-radius-panel)',
        xl: 'var(--m-radius-panel)',
        '2xl': 'var(--m-radius-panel)',
      },
      animation: {
        'marquee': 'marquee 25s linear infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'fade-up': 'fadeUp 0.6s ease forwards',
      },
      keyframes: {
        marquee: {
          '0%': { transform: 'translateX(0%)' },
          '100%': { transform: 'translateX(-50%)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}

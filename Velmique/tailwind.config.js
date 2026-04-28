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
          DEFAULT: '#C9A84C',
          light: '#E5CD8A',
          dark: '#8B6914',
          pale: '#F5E6C8',
        },
        champagne: '#BFAB5E',
        olive: '#A89548',
        cream: {
          DEFAULT: '#FBF7EC',
          light: '#FFFFFF',
          dark: '#F5EFE0',
          panel: '#EAE0C7',
        },
        ink: {
          DEFAULT: '#1A1612',
          soft: '#4A3F33',
          muted: '#8A7E6C',
        },
        dark: {
          DEFAULT: '#14110E',
          card: '#1F1B16',
          border: '#2A241D',
          muted: '#3A3128',
        },
      },
      fontFamily: {
        serif:   ['var(--font-playfair)',  'Playfair Display', 'Georgia', 'serif'],
        sans:    ['var(--font-cormorant)', 'Cormorant Garamond', 'serif'],
        body:    ['var(--font-jost)',      'Jost', 'system-ui', 'sans-serif'],
        display: ['var(--font-anton)',     'Anton', 'Playfair Display', 'Impact', 'sans-serif'],
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

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
          light: '#FFD700',
          dark: '#8B6914',
          pale: '#F5E6C8',
        },
        dark: {
          DEFAULT: '#111111',
          card: '#1a1a1a',
          border: '#2a2a2a',
          muted: '#333333',
        },
        cream: '#F5F0E8',
      },
      fontFamily: {
        serif: ['Playfair Display', 'Georgia', 'serif'],
        sans: ['Cormorant Garamond', 'serif'],
        body: ['Jost', 'sans-serif'],
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

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Refined minimal — white, warm greys, near-black ink
        ink: {
          DEFAULT: '#141414',
          soft:    '#444444',
          muted:   '#8A8A8A',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm:    '#F7F5F1',  // warm light surface
          deep:    '#EFEBE4',  // deeper surface
        },
        line: '#E5E2DC',
        clay: {
          DEFAULT: '#A8442A',  // restrained warm accent — sale tags, small marks
          deep:    '#7E3019',
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
        card: '0 12px 40px -16px rgba(20,20,20,0.16)',
        soft: '0 2px 14px -6px rgba(20,20,20,0.10)',
      },
    },
  },
  plugins: [],
}

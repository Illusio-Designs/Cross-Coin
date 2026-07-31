/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — Editorial Gallery (stark white + near-black)
        ink: {
          DEFAULT: '#0A0A0A',
          soft:    '#6E6E6E',
          muted:   '#A6A6A6',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm:    '#F6F6F4',
          deep:    '#EFEFED',
        },
        line: {
          DEFAULT: '#E8E8E6',
          dark:    '#1E1E1E',
        },
        accent: {
          DEFAULT: '#0A0A0A',
          deep:    '#000000',
          soft:    '#F2F2F0',
        },
        clay: {
          DEFAULT: '#0A0A0A',
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
        DEFAULT: '8px',
        lg: '12px',
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

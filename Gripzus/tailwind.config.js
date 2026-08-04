/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Gripzus — Atelier Off-White. A warm bone canvas (not stark white),
        // rich near-black ink, and a deep pine-green accent used sparingly.
        // Premium, quiet, knitwear-editorial.
        ink: {
          DEFAULT: '#1A1712',   // warm near-black — primary text
          soft:    '#6C665B',   // muted body
          muted:   '#A39C8E',   // captions / eyebrows
        },
        paper: {
          DEFAULT: '#F5F2EA',   // warm bone off-white canvas
          warm:    '#ECE8DC',   // card / raised
          deep:    '#E2DCCC',   // deepest panel
        },
        line: {
          DEFAULT: '#E0D9C9',   // warm hairline
          dark:    '#CBBFA9',
        },
        accent: {
          DEFAULT: '#28402E',   // deep pine green
          deep:    '#1B2E20',
          soft:    '#E7EBE1',   // pale green tint fill
        },
        clay: {
          DEFAULT: '#28402E',
          deep:    '#1B2E20',
        },
      },
      fontFamily: {
        // Wide technical grotesque display for a modern-editorial voice.
        display: ['"Space Grotesk"', 'Inter', 'Helvetica Neue', 'Arial', 'sans-serif'],
        body:    ['Inter', 'Helvetica Neue', 'Helvetica', 'Arial', 'sans-serif'],
      },
      letterSpacing: {
        wider: '0.05em',
        widest: '0.16em',
      },
      borderRadius: {
        DEFAULT: '12px',
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

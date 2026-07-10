/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx}', './components/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Charte Belhotel : orange et blanc
        brand: {
          soft: '#fff7ef',
          pale: '#ffedd5',
          DEFAULT: '#f97316',
          dark: '#ea580c',
          deep: '#c2410c',
          poster: '#b23c0a',
          ink: '#2b2018',
          muted: '#8a7a6d',
          line: '#f3e2d3',
          night: '#241a12',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Segoe UI', 'sans-serif'],
        heading: ['var(--font-poppins)', 'Segoe UI', 'sans-serif'],
      },
      keyframes: {
        kenburns: {
          from: { transform: 'scale(1)' },
          to: { transform: 'scale(1.09)' },
        },
        modalin: {
          from: { opacity: '0', transform: 'translateY(16px) scale(0.96)' },
          to: { opacity: '1', transform: 'none' },
        },
        fadein: {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        kenburns: 'kenburns 9s ease-out forwards',
        modalin: 'modalin 0.25s ease-out',
        fadein: 'fadein 0.2s ease-out',
      },
    },
  },
  plugins: [],
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          deep:     '#0D0F1A',
          surface:  '#131629',
          card:     '#1C2040',
          elevated: '#222749',
        },
        gold: {
          DEFAULT: '#E2B96F',
          bright:  '#F0CE8A',
          dim:     'rgba(226,185,111,0.15)',
        },
        kgreen: '#4ADE80',
        kred:   '#F87171',
        kamber: '#FBBF24',
      },
      fontFamily: {
        display: ['"Syne"', 'sans-serif'],
        body:    ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
